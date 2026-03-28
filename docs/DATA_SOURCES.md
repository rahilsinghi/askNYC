# NYC Open Data — Dataset Reference

> Authoritative reference for all Socrata API queries used by Ask NYC.
> Each dataset has unique geo-query requirements documented below.

---

## Base URL

```
https://data.cityofnewyork.us/resource/{endpoint}.json
```

## Authentication

- **Without token:** 1 request/second rate limit, max 1000 rows per query
- **With token:** Unlimited rate, same 1000 row max
- Token goes in header: `X-App-Token: {SOCRATA_APP_TOKEN}`
- Get a token: https://data.cityofnewyork.us → Developer Settings

---

## Dataset 1: 311 Service Requests

| Field | Value |
|-------|-------|
| **Endpoint** | `erm2-nwe9` |
| **Full name** | 311 Service Requests from 2020 to Present |
| **Geo column** | `location` (Point type) |
| **Geo strategy** | `within_circle(location, lat, lng, radius_meters)` |
| **Key fields** | `created_date`, `complaint_type`, `descriptor`, `status`, `incident_zip`, `latitude`, `longitude` |

### Example query
```
GET /resource/erm2-nwe9.json
  ?$where=within_circle(location,40.6943,-73.9865,400) AND created_date>'2025-12-26T00:00:00'
  &$order=created_date DESC
  &$limit=50
```

### Notes
- Very large dataset — always filter by date AND location
- `complaint_type` categories: Noise, Heat/Hot Water, Street Condition, etc.
- `status` values: Open, Closed, Pending, etc.

---

## Dataset 2: Restaurant Inspections (DOHMH)

| Field | Value |
|-------|-------|
| **Endpoint** | `43nn-pn8j` |
| **Full name** | DOHMH New York City Restaurant Inspection Results |
| **Geo column** | `location` (Point type) |
| **Geo strategy** | Name search first: `upper(dba) like upper('%NAME%')`, fallback: `within_circle(location, lat, lng, radius)` |
| **Key fields** | `dba` (business name), `grade`, `inspection_date`, `violation_description`, `cuisine_description` |

### Example query (by name)
```
GET /resource/43nn-pn8j.json
  ?$where=upper(dba) like upper('%JOE''S PIZZA%')
  &$order=inspection_date DESC
  &$limit=10
```

### Example query (by radius)
```
GET /resource/43nn-pn8j.json
  ?$where=within_circle(location,40.6943,-73.9865,500)
  &$order=inspection_date DESC
  &$limit=10
```

### Notes
- Multiple rows per restaurant (one per violation per inspection)
- Grade values: A, B, C, Z (pending), P (grade pending)
- Single quotes in business names must be escaped: `'` → `''`
- Implementation uses `chr(39)` to avoid f-string quote nesting issues

---

## Dataset 3: DOB Permit Issuance

| Field | Value |
|-------|-------|
| **Endpoint** | `ipu4-2q9a` |
| **Full name** | DOB Permit Issuance |
| **Geo column** | `gis_latitude`, `gis_longitude` (TEXT fields, not numeric) |
| **Geo strategy** | Text bounding box comparison — cannot use `within_circle` |
| **Key fields** | `job_type`, `work_type`, `filing_date`, `expiration_date`, `owner_s_business_name` |

### Example query
```
GET /resource/ipu4-2q9a.json
  ?$where=gis_latitude IS NOT NULL
    AND gis_latitude > '40.691600'
    AND gis_latitude < '40.697000'
    AND gis_longitude > '-73.989200'
    AND gis_longitude < '-73.983800'
  &$order=filing_date DESC
  &$limit=20
```

### Notes
- Latitude and longitude are stored as TEXT, not numbers
- String comparison works for latitude (all positive in NYC)
- For longitude (all negative in NYC), the `>` / `<` comparisons are inverted:
  - `gis_longitude > '-73.99'` means "east of -73.99" (closer to 0)
  - `gis_longitude < '-73.98'` means "west of -73.98" (further from 0)
- `_bounding_box()` helper in socrata_service.py handles this correctly

---

## Dataset 4: HPD Violations

| Field | Value |
|-------|-------|
| **Endpoint** | `wvxf-dwi5` |
| **Full name** | Housing Maintenance Code Violations |
| **Geo column** | **NONE** — no geographic columns exist |
| **Geo strategy** | Zip code + borough ID approximation |
| **Key fields** | `novdescription`, `class` (A/B/C), `violationstatus`, `inspectiondate`, `zip`, `boroid` |

### Example query
```
GET /resource/wvxf-dwi5.json
  ?$where=violationstatus='Open' AND zip='11201'
  &$order=inspectiondate DESC
  &$limit=30
```

### Notes
- **This is the only dataset without any geo columns**
- Workaround: query nearby 311 complaints (which have location) to find the zip code, then use that zip to query HPD
- `_get_nearby_zip()` helper in socrata_service.py implements this
- `_approx_boroid()` approximates borough from lat/lng as additional fallback
- Violation classes: A (non-hazardous), B (hazardous), C (immediately hazardous)
- Heat/hot water violations flagged separately in our DataCard output

---

## Dataset 5: NYPD Complaint Data (Current YTD)

| Field | Value |
|-------|-------|
| **Endpoint** | `5uac-w243` |
| **Full name** | NYPD Complaint Data Current (Year To Date) |
| **Geo column** | `geocoded_column` (Point type) |
| **Geo strategy** | `within_circle(geocoded_column, lat, lng, radius_meters)` |
| **Key fields** | `ofns_desc` (offense description), `law_cat_cd` (FELONY/MISDEMEANOR/VIOLATION), `cmplnt_fr_dt` (complaint date) |

### Example query
```
GET /resource/5uac-w243.json
  ?$where=within_circle(geocoded_column,40.6943,-73.9865,400) AND cmplnt_fr_dt>'2025-09-26T00:00:00'
  &$order=cmplnt_fr_dt DESC
  &$limit=50
```

### Notes
- `geocoded_column` — NOT `the_geom`, NOT `location`
- `law_cat_cd` severity: FELONY > MISDEMEANOR > VIOLATION
- Current YTD only — for historical data use endpoint `qgea-i56i`
- Date field is `cmplnt_fr_dt` (complaint from date), not `created_date`

---

## Dataset 6: Evictions

| Field | Value |
|-------|-------|
| **Endpoint** | `6z8x-wfk4` |
| **Full name** | Evictions |
| **Geo column** | `latitude`, `longitude` (TEXT fields) |
| **Geo strategy** | Zip code lookup via `eviction_zip` (uses `_get_nearby_zip` helper) |
| **Key fields** | `eviction_address`, `executed_date`, `residential_commercial_ind`, `eviction_zip`, `borough` |

### Example query
```
GET /resource/6z8x-wfk4.json
  ?$where=eviction_zip='11201' AND executed_date>'2025-03-27T00:00:00'
  &$order=executed_date DESC
  &$limit=50
```

### Notes
- Has text lat/lng but no Point-type geo column — cannot use `within_circle`
- Uses same zip code strategy as HPD violations
- `residential_commercial_ind` values: "Residential", "Commercial"
- Pairs well with HPD violations for housing assessment ("should I live here?")
- Data goes back to 2017

---

## Dataset 7: MTA Subway Entrances

| Field | Value |
|-------|-------|
| **Endpoint** | `i9wp-a4ja` |
| **Host** | **data.ny.gov** (NOT data.cityofnewyork.us) |
| **Full name** | MTA Subway Entrances and Exits: 2024 |
| **Geo column** | `entrance_georeference` (Point type) |
| **Geo strategy** | `within_circle(entrance_georeference, lat, lng, radius_meters)` |
| **Key fields** | `stop_name`, `daytime_routes`, `entrance_type`, `entrance_latitude`, `entrance_longitude` |

### Example query
```
GET https://data.ny.gov/resource/i9wp-a4ja.json
  ?$where=within_circle(entrance_georeference,40.6943,-73.9865,500)
  &$limit=20
```

### Notes
- Hosted on `data.ny.gov`, not `data.cityofnewyork.us` — uses `SOCRATA_NY_BASE` in code
- Multiple rows per station (one per entrance)
- `daytime_routes` is space-separated: "A C F R"
- Deduplicate by `stop_name` to get unique stations
- Great for transit accessibility assessment

---

## Common SoQL Functions

| Function | Usage |
|----------|-------|
| `within_circle(column, lat, lng, meters)` | Radius search on Point-type geo columns |
| `upper(column)` | Case-insensitive text comparison |
| `IS NOT NULL` | Filter out rows with missing values |
| `>`, `<`, `=` on text | String comparison (works for text lat/lng) |

## Geo Strategy Summary

| Dataset | Has Geo Column? | Strategy |
|---------|----------------|----------|
| 311 | Yes (`location`) | `within_circle(location, ...)` |
| Restaurants | Yes (`location`) | Name search first, `within_circle` fallback |
| DOB Permits | Text only (`gis_latitude/longitude`) | Bounding box with string comparison |
| HPD Violations | No | Zip code from nearby 311 + borough approximation |
| NYPD | Yes (`geocoded_column`) | `within_circle(geocoded_column, ...)` |
| Evictions | Text only (`latitude/longitude`) | Zip code lookup via `_get_nearby_zip` |
| Subway Entrances | Yes (`entrance_georeference`) | `within_circle(entrance_georeference, ...)` — hosted on data.ny.gov |
