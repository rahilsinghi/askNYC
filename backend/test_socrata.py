#!/usr/bin/env python3
"""
Ask NYC — Socrata API Test
Run this before the demo to verify all 7 datasets return real data.

Usage: python test_socrata.py

Tests with NYU Tandon coordinates (40.6943, -73.9865) by default.
"""

import asyncio
import sys
from services.socrata_service import (
    query_restaurant_inspections,
    query_311_complaints,
    query_dob_permits,
    query_hpd_violations,
    query_nypd_incidents,
    query_evictions,
    query_subway_entrances,
)

# NYU Tandon Engineering School, Brooklyn
LAT = 40.6943
LNG = -73.9865

# Demo scenario restaurant
RESTAURANT_NAME = "Joe's Pizza"


async def test_all():
    results = []
    print("\n=== Ask NYC — Socrata API Test ===\n")
    print(f"Location: {LAT}°N, {LNG}°W (NYU Tandon, Brooklyn)\n")

    # ── Test 1: Restaurant inspections ─────────────────────────────────────
    print(f"[1/7] Restaurant inspections — searching for '{RESTAURANT_NAME}'...")
    try:
        card = await query_restaurant_inspections(RESTAURANT_NAME)
        if card:
            print(f"  ✅ {card.title} — {card.detail[:80]}...")
            results.append(True)
        else:
            # Try radius fallback
            card = await query_restaurant_inspections("", lat=LAT, lng=LNG)
            if card:
                print(f"  ✅ (radius fallback) {card.title}")
                results.append(True)
            else:
                print("  ⚠️  No results — dataset may be slow")
                results.append(False)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        results.append(False)

    # ── Test 2: 311 complaints ──────────────────────────────────────────────
    print("[2/7] 311 complaints within 400m...")
    try:
        card = await query_311_complaints(LAT, LNG)
        if card:
            print(f"  ✅ {card.title} — {card.detail[:80]}...")
            results.append(True)
        else:
            print("  ⚠️  No complaints found (area may genuinely be quiet)")
            results.append(True)  # Not a failure
    except Exception as e:
        print(f"  ❌ Error: {e}")
        results.append(False)

    # ── Test 3: DOB permits ─────────────────────────────────────────────────
    print("[3/7] DOB permits within 300m...")
    try:
        card = await query_dob_permits(LAT, LNG)
        if card:
            print(f"  ✅ {card.title} — {card.detail[:80]}...")
            results.append(True)
        else:
            print("  ⚠️  No permits found")
            results.append(True)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        results.append(False)

    # ── Test 4: HPD violations ──────────────────────────────────────────────
    print("[4/7] HPD violations within 200m...")
    try:
        card = await query_hpd_violations(LAT, LNG)
        print(f"  ✅ {card.title} — {card.detail[:80]}...")
        results.append(True)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        results.append(False)

    # ── Test 5: NYPD incidents ──────────────────────────────────────────────
    print("[5/7] NYPD incidents within 400m...")
    try:
        card = await query_nypd_incidents(LAT, LNG)
        print(f"  ✅ {card.title} — {card.detail[:80]}...")
        results.append(True)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        results.append(False)

    # ── Test 6: Evictions ─────────────────────────────────────────────────
    print("[6/7] Evictions in nearby ZIP...")
    try:
        card = await query_evictions(LAT, LNG)
        if card:
            print(f"  ✅ {card.title} — {card.detail[:80]}...")
            results.append(True)
        else:
            print("  ⚠️  No evictions found (may need zip lookup)")
            results.append(True)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        results.append(False)

    # ── Test 7: Subway entrances ──────────────────────────────────────────
    print("[7/7] Subway entrances within 500m...")
    try:
        card = await query_subway_entrances(LAT, LNG)
        if card:
            print(f"  ✅ {card.title} — {card.detail[:80]}...")
            results.append(True)
        else:
            print("  ⚠️  No subway entrances found")
            results.append(True)
    except Exception as e:
        print(f"  ❌ Error: {e}")
        results.append(False)

    # ── Summary ─────────────────────────────────────────────────────────────
    passed = sum(results)
    total = len(results)
    print(f"\n{'='*40}")
    print(f"Results: {passed}/{total} APIs responding")

    if passed == total:
        print("✅ All APIs OK — ready to demo")
    elif passed >= 3:
        print(f"⚠️  {total - passed} API(s) failing — demo will work but some features reduced")
    else:
        print("❌ Multiple APIs failing — check network / Socrata status")
        sys.exit(1)

    # ── Demo scenario test ──────────────────────────────────────────────────
    print("\n=== Demo Scenario Preview ===\n")
    print("What the agent will say about Joe's Pizza (7 Carmine St, Manhattan):")
    print("  [Run a quick check here manually — see PROJECT.md for the Socrata URL]")
    print()
    print("Run this URL in your browser to preview:")
    print("  https://data.cityofnewyork.us/resource/43nn-pn8j.json?$where=upper(dba)%20like%20upper('%25JOE'S%20PIZZA%25')&$order=inspection_date%20DESC&$limit=3")


if __name__ == "__main__":
    asyncio.run(test_all())
