"""
Ask NYC — Geocoding Service
Converts business names and addresses to lat/lng using Google Maps.
"""

import logging

import httpx
import os
from typing import Optional

logger = logging.getLogger(__name__)


async def geocode_location(query: str) -> dict:
    """
    Convert a location name or address to coordinates.

    Args:
        query: Location name, address, or intersection (e.g. "Joe's Pizza, Carmine St, NYC")

    Returns:
        Dict with lat, lng, formatted_address, and place_name
    """
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        # Fallback: return NYC center coordinates
        return {
            "lat": 40.7306,
            "lng": -73.9975,
            "formatted_address": query,
            "place_name": query,
        }

    # Append NYC context if not already present
    search_query = query if "NYC" in query or "New York" in query else f"{query}, NYC"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"address": search_query, "key": api_key},
            )
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Geocoding failed for %r: %s", query, exc)
        return {
            "lat": 40.7306,
            "lng": -73.9975,
            "formatted_address": query,
            "place_name": query,
        }

    if data.get("status") == "OK" and data.get("results"):
        result = data["results"][0]
        location = result["geometry"]["location"]
        return {
            "lat": location["lat"],
            "lng": location["lng"],
            "formatted_address": result["formatted_address"],
            "place_name": result.get("name", query),
        }

    return {
        "lat": 40.7306,
        "lng": -73.9975,
        "formatted_address": query,
        "place_name": query,
    }
