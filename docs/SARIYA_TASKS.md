# Sariya — Frontend UI Tasks

> Updated: 2026-03-27
> Status: Ready to start
> Branch: `feat/camera-feed-ux`

---

## Task 1: Image Upload → Analysis Animation Flow

### Problem
When the user uploads an image, it fills the entire camera feed area (`flex-1`, full height) and covers the map below it. The image stays static at full size even after the query is submitted. There's no visual feedback that the system is "analyzing" the image.

### Current behavior
1. User uploads image → image fills entire camera feed area (covers map)
2. User types question + clicks ASK
3. Tool badges appear in the sidebar (INVESTIGATE LOCATION, GEOCODE, etc.)
4. Data cards appear in the sidebar
5. Image stays full-screen the entire time — map is hidden behind it

### Desired behavior (animated analysis flow)
1. **Upload state** — Image appears full-screen in camera feed (current behavior, fine)
2. **Query submitted** — Image animates:
   - Slides/shrinks to the **left half** (or top half) of the camera feed area
   - Animated scan lines / analytical overlay appear on the image (like the system is "reading" it)
   - Coordinate text overlay animates: `DECODING LOCATION...` → `40.7306° N, 74.0021° W` (typewriter effect)
   - Green corner brackets (like the detection box) appear and lock onto text in the image
3. **Data arriving** — Right/bottom half shows:
   - Map zooms into the geocoded coordinates (already have `map_event zoom` coming from backend)
   - Map pins drop one by one as tool results come back
   - Small data card previews can optionally overlay on the map near their pin locations
4. **Complete state** — Both halves stay visible:
   - Left: image with analytical overlay (faded scan lines, locked detection box)
   - Right: map zoomed to location with all pins

### Key files to modify
- `frontend/components/dashboard/CameraFeed.tsx` — image display, animation states
- `frontend/app/dashboard/page.tsx` — pass `agentState` to CameraFeed so it knows when analysis starts
- `frontend/components/dashboard/MiniMap.tsx` — may need to move/resize when image is present

### Animation details
- Use CSS transitions/transforms for the slide (transform: translateX, width changes)
- Scan line overlay: reuse the existing scan line animation but make it more prominent during analysis
- Coordinate decode: use `font-mono` typewriter animation, green text
- Detection box: reuse the existing `.detection-box` component with corner brackets
- Duration: slide animation ~500ms, coordinate decode ~1.5s typewriter

### Props to add to CameraFeed
```typescript
interface CameraFeedProps {
  // ... existing props
  agentState: AgentState        // to know when analysis starts
  mapCenter?: { lat: number; lng: number } | null  // to show decoded coordinates
}
```

### State machine for the animation
```
idle          → image fills full area, no overlay
processing    → image slides left, scan overlay starts, coordinate decode animates
speaking/idle → image stays left, overlay fades to subtle, map visible on right
clear         → image removed, back to default camera feed
```

---

## Task 2: Tool Badge Improvements

### Current issues
- Tool badges use raw function names like `investigate_location`, `query_restaurant_inspections`
- Badges use `···` for pending, `✓` for complete — could be more animated
- Badges from previous sessions persist (fixed in latest commit, but verify)

### Improvements
- Map tool names to friendly labels:
  - `investigate_location` → `ANALYZING`
  - `geocode_location` → `GEOCODING`
  - `query_restaurant_inspections` → `HEALTH INSPECTIONS`
  - `query_311_complaints` → `311 COMPLAINTS`
  - `query_nypd_incidents` → `NYPD DATA`
  - `query_hpd_violations` → `HPD VIOLATIONS`
  - `query_dob_permits` → `DOB PERMITS`
  - `query_subway_entrances` → `SUBWAY DATA`
  - `query_evictions` → `EVICTIONS`
- Add a spinning/pulsing animation for pending badges (beyond the existing `tool-pending` class)
- Consider showing badges in the camera feed overlay too (not just sidebar)

---

## Task 3: Data Card Polish

### Current state
Cards render with category badge, title, and detail text. They work but could feel more alive.

### Improvements
- Stagger card entrance animation (each card slides in 100ms after the previous)
- Add category-colored left border to each card
- Add a subtle "new" pulse when a card first appears
- Card file: `frontend/components/dashboard/DataCard.tsx`

---

## How to test

1. Start backend: `cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000`
2. Start frontend: `cd frontend && pnpm dev`
3. Open `http://localhost:3000/dashboard`
4. Upload any image of a NYC location (try the Joe's Pizza image in `/docs/`)
5. Type "can I eat here" and click ASK
6. Watch for: tool badges animating, data cards appearing, map zoom event in console

### Backend events to expect in browser console
```
agent_state: processing
tool_call: investigate_location pending
tool_call: geocode_location complete
map_event: zoom (lat, lng)
tool_call: query_restaurant_inspections pending
tool_call: query_311_complaints pending
data_card: {category: "health", ...}
tool_call: query_restaurant_inspections complete
data_card: {category: "complaints", ...}
tool_call: query_311_complaints complete
tool_call: investigate_location complete
agent_state: idle
```

---

## Design system reference
- Green: `#84cc16` (primary accent, success states)
- Red: `#ef4444` (alerts, live badge)
- Amber: `#f59e0b` (warnings, processing)
- Blue: `#3b82f6` (info, speaking state)
- Font: `font-mono` for all data, `font-display` for headings
- Full design spec: `docs/STITCH_PROMPT.md`
