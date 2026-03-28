"""
Ask NYC — Socrata Service
All NYC Open Data queries. No authentication required for <1000 rows.
All functions are ADK tool-compatible (async, typed returns).

Docs: https://dev.socrata.com/docs/queries/
"""

import logging

import httpx
import os
from datetime import datetime, timedelta
from typing import Optional
from models.schemas import DataCard

logger = logging.getLogger(__name__)

SOCRATA_BASE = "https://data.cityofnewyork.us/resource"
SOCRATA_NY_BASE = "https://data.ny.gov/resource"
APP_TOKEN = os.getenv("SOCRATA_APP_TOKEN", "")  # optional — raises rate limit ceiling

HEADERS = {"X-App-Token": APP_TOKEN} if APP_TOKEN else {}


async def _get(endpoint: str, params: dict, base: str = SOCRATA_BASE) -> list[dict]:
    """Execute a Socrata SoQL query. Returns list of result dicts."""
    url = f"{base}/{endpoint}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params, headers=HEADERS)
        resp.raise_for_status()
        return resp.json()


def _days_ago(n: int) -> str:
    """Return ISO date string N days ago, for SoQL $where filters."""
    return (datetime.now() - timedelta(days=n)).strftime("%Y-%m-%dT00:00:00")


def _bounding_box(lat: float, lng: float, radius_meters: int) -> tuple[float, float, float, float]:
    """Convert lat/lng + radius to a bounding box (lat_min, lat_max, lng_min, lng_max).
    Approximate: 1 degree lat ≈ 111km, 1 degree lng ≈ 85km at NYC latitude."""
    lat_delta = radius_meters / 111_000
    lng_delta = radius_meters / 85_000
    return (lat - lat_delta, lat + lat_delta, lng - lng_delta, lng + lng_delta)


# ─── Tool 1: Restaurant Inspections ─────────────────────────────────────────

async def query_restaurant_inspections(
    business_name: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_meters: int = 500,
) -> dict | None:
    """
    Fetch NYC restaurant inspection grade and violations.
    Searches by business name first; falls back to radius if no name match.
    Returns a DataCard or None if no results.

    Dataset: DOHMH NYC Restaurant Inspection Results
    Endpoint: 43nn-pn8j
    """
    results = []

    # Primary: search by name
    if business_name:
        safe_name = business_name.replace(chr(39), chr(39) + chr(39))
        results = await _get("43nn-pn8j.json", {
            "$where": f"upper(dba) like upper('%{safe_name}%')",
            "$order": "inspection_date DESC",
            "$limit": "10",
        })

    # Fallback: radius search using 'location' geo column
    if not results and lat and lng:
        results = await _get("43nn-pn8j.json", {
            "$where": f"within_circle(location,{lat},{lng},{radius_meters})",
            "$order": "inspection_date DESC",
            "$limit": "10",
        })

    if not results:
        return None

    # Take the most recent inspection record
    top = results[0]
    grade = top.get("grade", "N/A")
    inspection_date = top.get("inspection_date", "")[:10]  # YYYY-MM-DD
    dba = top.get("dba", business_name)

    # Collect all violation descriptions
    violations = [
        r.get("violation_description", "")
        for r in results
        if r.get("violation_description")
    ][:3]  # top 3

    # Build detail string
    if grade in ("A", "B", "C"):
        grade_note = {"A": "Clean record", "B": "Minor issues found", "C": "Significant violations"}[grade]
        detail = f"Last inspected {inspection_date}. {grade_note}."
        if violations and grade != "A":
            detail += f" Key violation: {violations[0].lower()}."
    else:
        detail = f"Pending grade. Last inspected {inspection_date}."

    return DataCard(
        category="health",
        badge_label="HEALTH INSPECTION",
        title=f"Grade {grade}",
        detail=detail,
    ).model_dump()


# ─── Tool 2: 311 Complaints ──────────────────────────────────────────────────

async def query_311_complaints(
    lat: float,
    lng: float,
    radius_meters: int = 400,
    days_back: int = 90,
) -> dict | None:
    """
    Fetch recent 311 service requests near a location.
    Returns a DataCard summarizing complaint patterns.

    Dataset: 311 Service Requests from 2020 to Present
    Endpoint: erm2-nwe9
    """
    results = await _get("erm2-nwe9.json", {
        "$where": (
            f"within_circle(location,{lat},{lng},{radius_meters})"
            f" AND created_date>'{_days_ago(days_back)}'"
        ),
        "$order": "created_date DESC",
        "$limit": "50",
    })

    if not results:
        return None

    total = len(results)

    # Count by complaint type
    complaint_counts: dict[str, int] = {}
    for r in results:
        ct = r.get("complaint_type", "Other")
        complaint_counts[ct] = complaint_counts.get(ct, 0) + 1

    # Top complaint
    top_type = max(complaint_counts, key=complaint_counts.get)
    top_count = complaint_counts[top_type]

    # Check for anomaly: any type with 5+ complaints
    anomaly = top_count >= 5

    detail = (
        f"{total} complaint{'s' if total != 1 else ''} filed within {radius_meters}m "
        f"in the last {days_back} days. "
        f"Most common: {top_type.lower()} ({top_count})."
    )

    if anomaly:
        detail += f" This is elevated — worth investigating."

    return DataCard(
        category="complaints",
        badge_label="311 COMPLAINTS",
        title=f"{total} Complaints",
        detail=detail,
    ).model_dump()


# ─── Tool 3: DOB Permits ─────────────────────────────────────────────────────

async def query_dob_permits(
    lat: float,
    lng: float,
    radius_meters: int = 300,
) -> dict | None:
    """
    Fetch active DOB building permits near a location.
    Returns a DataCard about construction activity.

    Dataset: DOB Permit Issuance
    Endpoint: ipu4-2q9a
    """
    # DOB dataset has text lat/lng fields — use bounding box with string comparison
    lat_min, lat_max, lng_min, lng_max = _bounding_box(lat, lng, radius_meters)
    results = await _get("ipu4-2q9a.json", {
        "$where": (
            f"gis_latitude IS NOT NULL"
            f" AND gis_latitude > '{lat_min:.6f}'"
            f" AND gis_latitude < '{lat_max:.6f}'"
            f" AND gis_longitude > '{lng_min:.6f}'"
            f" AND gis_longitude < '{lng_max:.6f}'"
        ),
        "$order": "filing_date DESC",
        "$limit": "20",
    })

    if not results:
        return None

    total = len(results)
    work_types = list({r.get("work_type", "") for r in results if r.get("work_type")})[:3]

    # Most recent permit
    latest = results[0]
    expiry = latest.get("expiration_date", "")[:10] if latest.get("expiration_date") else "N/A"

    detail = (
        f"{total} active permit{'s' if total != 1 else ''} within {radius_meters}m. "
        f"Work types: {', '.join(work_types).lower() if work_types else 'various'}. "
        f"Most recent expires {expiry}."
    )

    return DataCard(
        category="permits",
        badge_label="DOB PERMITS",
        title=f"{total} Active Permits",
        detail=detail,
    ).model_dump()


# ─── Tool 4: HPD Violations ──────────────────────────────────────────────────

async def query_hpd_violations(
    lat: float,
    lng: float,
    radius_meters: int = 200,
) -> dict | None:
    """
    Fetch HPD (Housing Preservation & Development) violations near a location.
    Returns a DataCard about building code violations.

    Dataset: HPD Violations
    Endpoint: wvxf-dwi5
    """
    # HPD violations dataset has no geo columns — query by approximate zip code
    # Use a reverse-lookup approach: first get nearby buildings from 311 data
    # or use a hardcoded zip. For the demo, compute approximate zip from lat/lng.
    # Fallback: query all open violations in the approximate area by borough + zip
    borough_map = {
        1: "MANHATTAN", 2: "BRONX", 3: "BROOKLYN",
        4: "QUEENS", 5: "STATEN ISLAND",
    }
    # Approximate borough from lat/lng
    boroid = _approx_boroid(lat, lng)

    # Get nearby zip codes from 311 data (which has location column)
    zip_code = await _get_nearby_zip(lat, lng)

    where_clause = f"violationstatus='Open'"
    if zip_code:
        where_clause += f" AND zip='{zip_code}'"
    elif boroid:
        where_clause += f" AND boroid='{boroid}'"

    results = await _get("wvxf-dwi5.json", {
        "$where": where_clause,
        "$order": "inspectiondate DESC",
        "$limit": "30",
    })

    if not results:
        return DataCard(
            category="violations",
            badge_label="HPD VIOLATIONS",
            title="No Open Violations",
            detail=f"No open HPD violations found nearby. Building appears compliant.",
        ).model_dump()

    total = len(results)

    # Classify by severity
    class_counts = {"A": 0, "B": 0, "C": 0}
    for r in results:
        cls = r.get("class", "")
        if cls in class_counts:
            class_counts[cls] += 1

    # Check for heat/hot water violations (critical)
    heat_violations = [
        r for r in results
        if any(kw in r.get("novdescription", "").upper() for kw in ["HEAT", "HOT WATER"])
    ]

    title = f"{total} Open Violations"
    detail = (
        f"Class A (minor): {class_counts['A']}, "
        f"Class B (hazardous): {class_counts['B']}, "
        f"Class C (immediately hazardous): {class_counts['C']}."
    )

    if heat_violations:
        detail += f" {len(heat_violations)} heat/hot water violation{'s' if len(heat_violations) > 1 else ''}."

    return DataCard(
        category="violations",
        badge_label="HPD VIOLATIONS",
        title=title,
        detail=detail,
    ).model_dump()


def _approx_boroid(lat: float, lng: float) -> int:
    """Approximate NYC borough ID from lat/lng. Good enough for demo."""
    if lat > 40.8:
        return 2  # Bronx
    if lng < -74.05:
        return 5  # Staten Island
    if lat > 40.7 and lng > -74.01:
        return 1  # Manhattan
    if lng < -73.88:
        return 3  # Brooklyn
    return 4  # Queens


async def _get_nearby_zip(lat: float, lng: float) -> Optional[str]:
    """Get the most common zip code from nearby 311 complaints."""
    try:
        results = await _get("erm2-nwe9.json", {
            "$where": f"within_circle(location,{lat},{lng},200)",
            "$select": "incident_zip",
            "$limit": "5",
        })
        if results:
            zips = [r.get("incident_zip") for r in results if r.get("incident_zip")]
            if zips:
                return max(set(zips), key=zips.count)
    except Exception:
        logger.debug("_get_nearby_zip failed for (%s, %s)", lat, lng, exc_info=True)
    return None


# ─── Tool 5: NYPD Incidents ──────────────────────────────────────────────────

async def query_nypd_incidents(
    lat: float,
    lng: float,
    radius_meters: int = 400,
    days_back: int = 180,
) -> dict | None:
    """
    Fetch NYPD complaint data near a location.
    Returns a DataCard about safety profile.

    Dataset: NYPD Complaint Data Current YTD
    Endpoint: 5uac-w243
    """
    results = await _get("5uac-w243.json", {
        "$where": (
            f"within_circle(geocoded_column,{lat},{lng},{radius_meters})"
            f" AND cmplnt_fr_dt>'{_days_ago(days_back)}'"
        ),
        "$order": "cmplnt_fr_dt DESC",
        "$limit": "50",
    })

    if not results:
        return DataCard(
            category="nypd",
            badge_label="NYPD INCIDENTS",
            title="Quiet Area",
            detail=f"No incidents reported within {radius_meters}m in the last {days_back} days.",
        ).model_dump()

    total = len(results)

    # Count by offense type
    offense_counts: dict[str, int] = {}
    for r in results:
        offense = r.get("ofns_desc", "Other")
        offense_counts[offense] = offense_counts.get(offense, 0) + 1

    top_offense = max(offense_counts, key=offense_counts.get)
    top_count = offense_counts[top_offense]

    # Severity breakdown
    felonies = sum(1 for r in results if r.get("law_cat_cd") == "FELONY")
    misdemeanors = sum(1 for r in results if r.get("law_cat_cd") == "MISDEMEANOR")

    detail = (
        f"{total} incidents within {radius_meters}m in the last {days_back} days. "
        f"Most common: {top_offense.lower()} ({top_count}). "
        f"Felonies: {felonies}, misdemeanors: {misdemeanors}."
    )

    severity = "Low Activity" if total < 5 else "Moderate Activity" if total < 20 else "High Activity"

    return DataCard(
        category="nypd",
        badge_label="NYPD INCIDENTS",
        title=severity,
        detail=detail,
    ).model_dump()


# ─── Tool 6: Evictions ─────────────────────────────────────────────────────

async def query_evictions(
    lat: float,
    lng: float,
    radius_meters: int = 500,
    days_back: int = 365,
) -> dict | None:
    """
    Fetch recent eviction records near a location.
    Returns a DataCard about eviction activity for housing assessment.

    Dataset: Evictions
    Endpoint: 6z8x-wfk4
    """
    # Evictions has text lat/lng — use zip code approach like HPD
    zip_code = await _get_nearby_zip(lat, lng)

    if not zip_code:
        return None

    results = await _get("6z8x-wfk4.json", {
        "$where": (
            f"eviction_zip='{zip_code}'"
            f" AND executed_date>'{_days_ago(days_back)}'"
        ),
        "$order": "executed_date DESC",
        "$limit": "50",
    })

    if not results:
        return DataCard(
            category="evictions",
            badge_label="EVICTIONS",
            title="No Recent Evictions",
            detail=f"No evictions executed in {zip_code} in the last {days_back} days. Stable area.",
        ).model_dump()

    total = len(results)

    # Count residential vs commercial
    residential = sum(1 for r in results if r.get("residential_commercial_ind") == "Residential")
    commercial = total - residential

    # Most recent
    latest = results[0]
    latest_date = latest.get("executed_date", "")[:10]
    latest_addr = latest.get("eviction_address", "Unknown")

    detail = (
        f"{total} eviction{'s' if total != 1 else ''} executed in ZIP {zip_code} "
        f"in the last {days_back} days. "
        f"{residential} residential, {commercial} commercial. "
        f"Most recent: {latest_addr} on {latest_date}."
    )

    if total >= 10:
        detail += " Elevated eviction activity — housing instability signal."

    return DataCard(
        category="evictions",
        badge_label="EVICTIONS",
        title=f"{total} Evictions",
        detail=detail,
    ).model_dump()


# ─── Tool 7: Subway Entrances ──────────────────────────────────────────────

async def query_subway_entrances(
    lat: float,
    lng: float,
    radius_meters: int = 500,
) -> dict | None:
    """
    Find nearby subway station entrances and available train lines.
    Returns a DataCard with transit access information.

    Dataset: MTA Subway Entrances and Exits: 2024
    Endpoint: i9wp-a4ja (hosted on data.ny.gov)
    """
    results = await _get("i9wp-a4ja.json", {
        "$where": f"within_circle(entrance_georeference,{lat},{lng},{radius_meters})",
        "$limit": "20",
    }, base=SOCRATA_NY_BASE)

    if not results:
        return DataCard(
            category="transit",
            badge_label="SUBWAY ACCESS",
            title="No Nearby Stations",
            detail=f"No subway entrances within {radius_meters}m. Transit desert — plan accordingly.",
        ).model_dump()

    # Deduplicate by station name
    stations: dict[str, set[str]] = {}
    for r in results:
        name = r.get("stop_name", "Unknown")
        routes = r.get("daytime_routes", "")
        if name not in stations:
            stations[name] = set()
        for route in routes.split():
            stations[name].add(route)

    total_entrances = len(results)
    station_count = len(stations)

    # Build station summaries
    station_strs = []
    for name, routes in stations.items():
        sorted_routes = sorted(routes)
        station_strs.append(f"{name} ({', '.join(sorted_routes)})")

    detail = (
        f"{station_count} station{'s' if station_count != 1 else ''} "
        f"with {total_entrances} entrance{'s' if total_entrances != 1 else ''} "
        f"within {radius_meters}m. "
        f"{'; '.join(station_strs[:3])}."
    )

    if station_count >= 3:
        detail += " Excellent transit access."
    elif station_count >= 2:
        detail += " Good transit access."

    return DataCard(
        category="transit",
        badge_label="SUBWAY ACCESS",
        title=f"{station_count} Station{'s' if station_count != 1 else ''}",
        detail=detail,
    ).model_dump()
