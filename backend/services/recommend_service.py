"""
Ask NYC — Recommend Service (Multi-Agent Orchestration)

Orchestrates a recommendation pipeline:
1. Gemini 2.5 Flash parses the user query → location, intent, datasets
2. Geocodes the location
3. Runs 5-7 Socrata agents in parallel via asyncio.gather
4. Gemini 2.5 Flash synthesizes results into scored recommendation cards

All progress is streamed as SSE events via an asyncio.Queue.
"""

import asyncio
import json
import logging
import os
import time
import traceback
from typing import Optional

from google import genai

from services.geocoding_service import geocode_location
from services.socrata_service import (
    query_restaurant_inspections,
    query_311_complaints,
    query_dob_permits,
    query_hpd_violations,
    query_nypd_incidents,
    query_evictions,
    query_subway_entrances,
)

logger = logging.getLogger(__name__)

# ─── Gemini Client ──────────────────────────────────────────────────────────

GEMINI_MODEL = "gemini-2.5-flash"

def _get_client() -> genai.Client:
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GOOGLE_GEMINI_API_KEY")
    return genai.Client(api_key=api_key)


# ─── Agent Definitions ──────────────────────────────────────────────────────

AGENT_DEFS = {
    "geocoding": {"label": "Geocoding", "icon": "map-pin"},
    "restaurant_inspections": {"label": "Restaurant Inspections", "icon": "utensils"},
    "311_complaints": {"label": "311 Complaints", "icon": "alert-triangle"},
    "dob_permits": {"label": "DOB Permits", "icon": "hard-hat"},
    "hpd_violations": {"label": "HPD Violations", "icon": "building"},
    "nypd_incidents": {"label": "NYPD Incidents", "icon": "shield"},
    "evictions": {"label": "Evictions", "icon": "home"},
    "subway_entrances": {"label": "Subway Access", "icon": "train"},
    "synthesis": {"label": "Synthesizing", "icon": "sparkles"},
}

INTENT_DATASETS = {
    "food": ["restaurant_inspections", "311_complaints", "nypd_incidents", "subway_entrances"],
    "housing": ["hpd_violations", "evictions", "311_complaints", "nypd_incidents", "subway_entrances"],
    "safety": ["nypd_incidents", "311_complaints", "hpd_violations", "subway_entrances"],
    "construction": ["dob_permits", "311_complaints", "nypd_incidents", "subway_entrances"],
    "transit": ["subway_entrances", "311_complaints", "nypd_incidents"],
    "general": ["restaurant_inspections", "311_complaints", "dob_permits", "hpd_violations", "nypd_incidents", "subway_entrances"],
}


# ─── Pipeline ────────────────────────────────────────────────────────────────

async def run_pipeline(query: str, event_queue: asyncio.Queue) -> None:
    """Full recommendation pipeline. Pushes SSE events to event_queue."""
    start_time = time.time()

    try:
        # Step 1: Parse query with Gemini
        plan = await parse_query(query)
        datasets = plan.get("datasets", INTENT_DATASETS.get(plan.get("intent", "general"), INTENT_DATASETS["general"]))
        agents_list = ["geocoding"] + datasets + ["synthesis"]

        await event_queue.put({
            "event": "plan",
            "data": {
                "agents": [
                    {"agent_id": a, **AGENT_DEFS.get(a, {"label": a, "icon": "search"})}
                    for a in agents_list
                ],
                "query": query,
                "parsed_location": plan.get("location", ""),
                "parsed_intent": plan.get("intent", "general"),
            },
        })

        # Step 2: Geocode
        await event_queue.put({
            "event": "agent_update",
            "data": {"agent_id": "geocoding", "status": "running"},
        })

        geo = await geocode_location(plan.get("location", query))
        lat, lng = geo["lat"], geo["lng"]

        await event_queue.put({
            "event": "agent_update",
            "data": {
                "agent_id": "geocoding",
                "status": "complete",
                "summary": f"{geo.get('formatted_address', plan.get('location', ''))} ({lat:.4f}, {lng:.4f})",
                "data": geo,
            },
        })

        # Step 3: Run Socrata agents in parallel
        agent_results = await _run_agents(
            datasets=datasets,
            location_name=plan.get("location", ""),
            search_terms=plan.get("search_terms", []),
            lat=lat,
            lng=lng,
            event_queue=event_queue,
        )

        # Step 4: Synthesize with Gemini
        await event_queue.put({
            "event": "agent_update",
            "data": {"agent_id": "synthesis", "status": "running"},
        })

        recommendations = await synthesize_recommendations(query, plan, geo, agent_results)

        await event_queue.put({
            "event": "agent_update",
            "data": {"agent_id": "synthesis", "status": "complete", "summary": f"{len(recommendations)} recommendations"},
        })

        # Step 5: Emit recommendations
        for rec in recommendations:
            await event_queue.put({"event": "recommendation", "data": rec})

        elapsed = int((time.time() - start_time) * 1000)
        await event_queue.put({
            "event": "complete",
            "data": {"total_recommendations": len(recommendations), "query_time_ms": elapsed},
        })

    except Exception as e:
        logger.exception("Pipeline error")
        await event_queue.put({"event": "error", "data": {"message": str(e)}})

    finally:
        await event_queue.put(None)  # Sentinel to close SSE stream


# ─── Query Parsing ───────────────────────────────────────────────────────────

PARSE_PROMPT = """You are a query parser for an NYC recommendation system. Given a user question, extract:
- location: the NYC area, neighborhood, or landmark mentioned
- intent: one of "food", "housing", "safety", "construction", "transit", "general"
- search_terms: specific business names or types to search for (e.g. ["pizza", "Joe's Pizza"])

Respond with ONLY a JSON object. Examples:

User: "Best pizza near Washington Square Park"
{"location": "Washington Square Park, NYC", "intent": "food", "search_terms": ["pizza"]}

User: "Safest neighborhood to move to in Brooklyn near a subway"
{"location": "Brooklyn, NYC", "intent": "housing", "search_terms": []}

User: "What's happening with construction around Hudson Yards"
{"location": "Hudson Yards, NYC", "intent": "construction", "search_terms": []}
"""


async def parse_query(query: str) -> dict:
    """Use Gemini to parse user query into structured intent."""
    try:
        client = _get_client()
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=GEMINI_MODEL,
            contents=f"User query: {query}",
            config=genai.types.GenerateContentConfig(
                system_instruction=PARSE_PROMPT,
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )

        text = response.text.strip()
        plan = json.loads(text)
        logger.info("Parsed query: %s", plan)
        return plan
    except Exception as e:
        logger.warning("Gemini parse failed, using fallback: %s", e)
        return {"location": query, "intent": "general", "search_terms": []}


# ─── Agent Runner ────────────────────────────────────────────────────────────

QUERY_FUNCTIONS = {
    "restaurant_inspections": lambda name, terms, lat, lng: query_restaurant_inspections(
        business_name=terms[0] if terms else name, lat=lat, lng=lng
    ),
    "311_complaints": lambda name, terms, lat, lng: query_311_complaints(lat=lat, lng=lng),
    "dob_permits": lambda name, terms, lat, lng: query_dob_permits(lat=lat, lng=lng),
    "hpd_violations": lambda name, terms, lat, lng: query_hpd_violations(lat=lat, lng=lng),
    "nypd_incidents": lambda name, terms, lat, lng: query_nypd_incidents(lat=lat, lng=lng),
    "evictions": lambda name, terms, lat, lng: query_evictions(lat=lat, lng=lng),
    "subway_entrances": lambda name, terms, lat, lng: query_subway_entrances(lat=lat, lng=lng),
}


async def _run_single_agent(
    agent_id: str,
    location_name: str,
    search_terms: list[str],
    lat: float,
    lng: float,
    event_queue: asyncio.Queue,
) -> tuple[str, Optional[dict]]:
    """Run a single Socrata agent and push status events."""
    await event_queue.put({
        "event": "agent_update",
        "data": {"agent_id": agent_id, "status": "running"},
    })

    try:
        fn = QUERY_FUNCTIONS.get(agent_id)
        if not fn:
            raise ValueError(f"Unknown agent: {agent_id}")

        result = await fn(location_name, search_terms, lat, lng)

        summary = "No data found"
        if result:
            summary = result.get("title", "Data found")
            detail = result.get("detail", "")
            if detail:
                summary = f"{summary} — {detail[:80]}"

        await event_queue.put({
            "event": "agent_update",
            "data": {
                "agent_id": agent_id,
                "status": "complete",
                "summary": summary,
                "data": result,
            },
        })
        return (agent_id, result)

    except Exception as e:
        logger.warning("Agent %s failed: %s", agent_id, e)
        await event_queue.put({
            "event": "agent_update",
            "data": {"agent_id": agent_id, "status": "error", "summary": str(e)},
        })
        return (agent_id, None)


async def _run_agents(
    datasets: list[str],
    location_name: str,
    search_terms: list[str],
    lat: float,
    lng: float,
    event_queue: asyncio.Queue,
) -> dict[str, Optional[dict]]:
    """Run all relevant Socrata agents in parallel."""
    tasks = [
        _run_single_agent(ds, location_name, search_terms, lat, lng, event_queue)
        for ds in datasets
    ]
    results = await asyncio.gather(*tasks)
    return dict(results)


# ─── Synthesis ───────────────────────────────────────────────────────────────

SYNTHESIS_PROMPT = """You are an NYC recommendation synthesizer. Given raw data from NYC Open Data APIs about a location, produce recommendation cards.

Each recommendation should have:
- name: Business or location name
- address: Street address if available
- score: Overall score 0-100 based on the data
- score_breakdown: Object with dimension scores (only include relevant ones):
  - hygiene (0-100): Based on restaurant inspection grades and violations
  - complaints (0-100): Based on 311 complaint volume (fewer = higher score)
  - safety (0-100): Based on NYPD incident count and severity (fewer/less severe = higher)
  - housing (0-100): Based on HPD violations (fewer = higher)
  - transit (0-100): Based on subway access (more stations/routes = higher)
  - construction (0-100): Based on active permits and construction activity
- badges: Array of {category, label} objects summarizing key findings (e.g. {"category": "health", "label": "Grade A"})
- reasoning: Array of 2-4 specific bullet points explaining WHY this score, citing actual data points
- lat, lng: Coordinates if available

IMPORTANT:
- You MUST produce exactly 3 or 4 distinct recommendations, each with a different name and address
- Frame each recommendation as a specific place or micro-neighborhood relevant to the query
  - For food queries: name specific restaurants, cafes, or food spots in the area
  - For housing queries: name specific streets, blocks, or buildings
  - For safety queries: name specific neighborhoods or intersections
  - For construction queries: name specific sites or blocks
- Vary the scores across recommendations — not all should score the same
- Each recommendation should highlight DIFFERENT aspects of the data (one might be safest, another best transit, etc.)
- Base ALL scores and reasoning on the actual data provided, never fabricate numbers
- If a restaurant has Grade A, that's 90+ hygiene
- If there are <5 complaints nearby, that's 85+ complaints score
- If NYPD shows "Low Activity", that's 85+ safety
- Rank by overall score descending

Respond with ONLY a JSON array of 3-4 recommendation objects."""


async def synthesize_recommendations(
    query: str,
    plan: dict,
    geo: dict,
    agent_results: dict[str, Optional[dict]],
) -> list[dict]:
    """Use Gemini to synthesize agent results into scored recommendations."""
    # Build context from agent results
    context_parts = [f"User query: {query}", f"Location: {geo.get('formatted_address', plan.get('location', ''))}"]

    for agent_id, result in agent_results.items():
        label = AGENT_DEFS.get(agent_id, {}).get("label", agent_id)
        if result:
            context_parts.append(f"\n--- {label} ---\n{json.dumps(result, indent=2)}")
        else:
            context_parts.append(f"\n--- {label} ---\nNo data returned.")

    context = "\n".join(context_parts)

    try:
        client = _get_client()
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=GEMINI_MODEL,
            contents=context,
            config=genai.types.GenerateContentConfig(
                system_instruction=SYNTHESIS_PROMPT,
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )

        text = response.text.strip()
        recommendations = json.loads(text)

        if not isinstance(recommendations, list):
            recommendations = [recommendations]

        # Inject geo coordinates if missing
        for rec in recommendations:
            if not rec.get("lat"):
                rec["lat"] = geo["lat"]
            if not rec.get("lng"):
                rec["lng"] = geo["lng"]

        logger.info("Synthesized %d recommendations", len(recommendations))
        return recommendations

    except Exception as e:
        logger.exception("Synthesis failed")
        # Fallback: create a basic recommendation from raw data
        return [{
            "name": plan.get("location", "Location"),
            "address": geo.get("formatted_address", ""),
            "score": 70,
            "score_breakdown": {},
            "badges": [],
            "reasoning": [f"Data collected but synthesis failed: {str(e)[:100]}"],
            "lat": geo["lat"],
            "lng": geo["lng"],
        }]
