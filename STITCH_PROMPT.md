# Ask NYC — Stitch Prototype Prompt

## Project Overview

**App name:** Ask NYC  
**Tagline:** The city knows. Now you can ask.  
**What it is:** A voice + camera AI agent that answers questions about any NYC location in real time — pulling live data from NYC Open Data (health inspections, 311 complaints, building permits, NYPD incidents, HPD violations). Point your phone camera at a restaurant, building, or street corner. Speak. The agent identifies what it sees and tells you everything the city knows about it.

**Aesthetic direction:** Intelligence terminal meets NYC night. Inspired by DueIntelligence (property analyst tool) and ANSR (live restaurant dashboard). NOT a consumer app. NOT a chatbot. A professional urban intelligence system that happens to look stunning. Think: Bloomberg terminal soul, Figma-level polish, NYC after-dark atmosphere. Dark mode only. Monospace data, display type for values, precise grid, NO gradients on backgrounds, no purple, no neon blobs.

---

## Design System (apply to ALL screens)

### Color Palette

```
--bg:        #0c0c0f   /* outer background */
--bg2:       #111115   /* sidebar / right panel */
--surface:   #17171c   /* card surfaces */
--surface2:  #1e1e24   /* elevated surfaces */
--border:    #2a2a32   /* default borders */
--border2:   #383842   /* hover borders */

/* Data source accent colors — these encode meaning, never reuse */
--green:     #84cc16   /* health inspections — use for active state, logo */
--amber:     #f59e0b   /* HPD violations + 311 complaints */
--blue:      #3b82f6   /* DOB permits + building data */
--red:       #ef4444   /* NYPD / safety / alerts */
--violet:    #8b5cf6   /* agent / AI elements */

/* Text */
--text:      #f4f4f5   /* primary text */
--muted:     #71717a   /* labels, metadata */
--dim:       #3f3f46   /* disabled, very muted */
```

### Typography

- **Display / wordmark / big stats:** Syne (Google Fonts) — weights 600, 700. Used for "ASK NYC", card primary values ("Grade A", "Compliant"), location names.
- **UI labels / metadata / all-caps sections:** DM Mono (Google Fonts) — weights 300, 400, 500. Used for "LIVE CONTEXT", "SYSTEM ACTIVE", coordinates, timestamps, source badges, nav items.
- **Body / descriptions:** DM Mono 300. Used for card detail text.
- **NEVER use Inter, Roboto, Arial, or system fonts.**

### Spacing + Radius

- Base grid: 4px
- Card radius: 8px (never more)
- Badge radius: 3px (pill-like is wrong — these are precise rectangular badges)
- Sidebar width: 200px exactly
- Right panel width: 320px exactly
- Border widths: 1px only (no 2px except detection box)

### Component Rules

**Data source badges:**
- `HEALTH INSPECTION` → background rgba(132,204,22,0.12), text #84cc16
- `BUILDING SAFETY` → background rgba(59,130,246,0.12), text #3b82f6
- `311 COMPLAINTS` → background rgba(245,158,11,0.12), text #f59e0b
- `NYPD INCIDENTS` → background rgba(239,68,68,0.12), text #ef4444
- `HPD VIOLATIONS` → background rgba(245,158,11,0.12), text #f59e0b
- `DOB PERMITS` → background rgba(59,130,246,0.12), text #3b82f6
- `SIDEWALK CAFÉ` → background rgba(132,204,22,0.12), text #84cc16

**Map dots:**
- Inspections/health: #84cc16 with glow `box-shadow: 0 0 6px rgba(132,204,22,0.5)`
- Permits: #3b82f6 with glow
- Violations/complaints: #f59e0b with glow
- NYPD: #ef4444 with glow
- Each dot has a pulsing ring animation (scale 0.8 → 2.0, opacity 0.6 → 0, duration 2s, infinite)

---

## Screen 1: Onboarding / Splash

**Purpose:** First impression. Full-screen entry point. Should feel like activating a piece of city infrastructure. NOT a marketing page. NOT a landing page. A system boot sequence.

**Layout:** Single centered column, full viewport height, no sidebar.

**Background:** Pure #0c0c0f with a very faint city grid overlay — thin horizontal and vertical lines at 40px intervals, rgba(255,255,255,0.02) opacity. In the top-right quadrant, a faint radiating circle pattern (5 concentric circles, very low opacity 0.03, largest ~800px diameter) centered offscreen upper-right — suggests the data radius around a location.

**Content (center of screen, vertically centered with slight upward offset ~-40px):**

Top element: A small all-caps DM Mono label, letter-spacing 0.3em, color --muted:
```
NYC OPEN DATA · GEMINI LIVE · REAL-TIME INTELLIGENCE
```

Below that (24px gap): The wordmark. Two lines:
- Line 1: "ASK" — Syne 700, 96px, color --text, letter-spacing -0.03em
- Line 2: "NYC" — Syne 700, 96px, color --green (#84cc16), letter-spacing -0.03em  
- The two lines sit flush left, staggered: "NYC" shifts right by 48px, creating an offset composition

Below wordmark (32px gap): A single-line tagline in DM Mono 300, 13px, --muted:
```
Point. Speak. Know everything the city knows.
```

Below tagline (48px gap): A single CTA button. NOT a pill. A precise rectangle, 240px wide × 48px tall, radius 6px. Background --green (#84cc16), text #000000, DM Mono 500, 11px, letter-spacing 0.15em: "ACTIVATE SYSTEM →". On hover: background darkens to #6aad0f, no other change.

Below button (24px gap): Three small stat pills in a row (flexbox, gap 12px):
- "40M+ DATA POINTS" 
- "6 LIVE DATASETS"
- "UPDATED DAILY"
Each pill: DM Mono 300, 9px, --muted, background --surface, border 1px --border, padding 4px 10px, radius 3px.

**Bottom of screen (fixed, 24px from bottom):** A centered line in DM Mono 300, 9px, --dim:
```
Built for NYC Open Data Week · Powered by Google Gemini Live
```

**Animations:**
- On load: the three small stats count up from 0 (number odometer style) over 1.2s
- The wordmark "ASK" fades + slides up from y+10px, delay 0s, duration 0.6s
- "NYC" fades + slides up, delay 0.15s, duration 0.6s
- Tagline fades in, delay 0.4s
- Button fades in + scales from 0.95 → 1.0, delay 0.6s
- The faint grid lines appear very slowly, delay 0.8s, duration 2s

---

## Screen 2: Main Dashboard — Intelligence Brief (PRIMARY SCREEN)

**This is the hero screen. Reference the existing Stitch output: "Ask NYC - Intelligence Brief".  
Build upon it — do not replace it. Extend and refine.**

**Layout: Four zones**
```
[SIDEBAR 200px] | [CENTER flex-1] | [RIGHT PANEL 320px]
                  [CAMERA FEED ~55%]
                  [MINI MAP ~45%]
```

### Zone 1: Left Sidebar (200px, full height)

Background: --bg2, border-right 1px --border.

**Top (20px padding top, 20px horizontal):**
Section label: DM Mono 400, 9px, letter-spacing 0.2em, --muted: "NAVIGATOR"

**Nav items (4 total):**
Each nav item: 44px height, 20px left/right padding, flex row, gap 10px, DM Mono 400, 10px, letter-spacing 0.12em.

1. MAP EXPLORER (active state) — left border 2px --green, background rgba(132,204,22,0.06), text --green. Icon: 2×2 grid of small squares (14px SVG).
2. DATA INSIGHTS — icon: bar chart (3 ascending bars). Default state: --muted text, transparent bg.
3. AI SESSIONS — icon: concentric circles. Default state.
4. ARCHIVES — icon: three horizontal lines (stacked). Default state.

Hover state for non-active: text --text, background --surface.

**Spacer:** flex:1

**Bottom (12px padding):** User card component. Background --surface, border 1px --border, border-radius 8px, padding 10px 12px, flex row, gap 10px.
- Avatar: 28×28px, radius 6px, background --green, centered letter "C", color #000, Syne 700, 12px
- Right: user name "THE CARTOGRAPHER" in DM Mono 400, 9px, --text. Below: "LVL 4 ADMIN" in DM Mono 300, 8px, --muted.

---

### Zone 2: Center Panel

#### Camera Feed (top portion, ~55% of center height)

Background: #0a0608 (very dark warm dark — NYC night)

**Content layers (back to front):**

1. **City atmosphere layer** (CSS only, no images): 
   - Radial gradient ellipse at 30% from left, 40% from top: rgba(180,60,20,0.25) → transparent (simulates warm building glow)
   - Radial gradient ellipse at 70% left, 30% top: rgba(200,140,40,0.15) → transparent (secondary warm glow)
   - Abstract building silhouettes at bottom: 15-18 rectangles of varying heights (60px–160px), warm dark fill rgba(50,30,20,0.8), slight top border rgba(200,100,40,0.15)
   - Two "neon sign" rectangles: one warm orange glow, one cool blue glow — positioned at 15% and 52% from left, ~35-40% from top

2. **Scan line** (position: absolute, z-index 10): Single 1.5px horizontal line, full width, color gradient — transparent → rgba(132,204,22,0.6) center → transparent. Box-shadow: 0 0 8px rgba(132,204,22,0.4). Animates top: 0% → 100% over 3 seconds, infinite loop.

3. **GPS coordinates bar** (position: absolute, top 12px, centered horizontally):
   - Coordinates chip: "40.7306° N, 73.9975° W" — DM Mono 400, 9px, rgba(244,244,245,0.7), background rgba(12,12,15,0.7), border 1px rgba(255,255,255,0.08), padding 3px 8px, radius 3px
   - "LIVE FEED" badge: background --red, text #fff, DM Mono 400, 8px, letter-spacing 0.15em, padding 3px 8px, radius 3px. Pulses opacity 1.0 → 0.7 over 2s infinite.
   - These two elements sit side by side with 8px gap, centered horizontally.

4. **Detection box** (position: absolute, ~22% from top, ~28% from left, 140px wide × 110px tall):
   - 2px solid border --green
   - Box-shadow: 0 0 12px rgba(132,204,22,0.3), inset 0 0 12px rgba(132,204,22,0.05)
   - Border pulses: color oscillates rgba(132,204,22,1.0) ↔ rgba(132,204,22,0.5), 2s ease-in-out infinite
   - Four corner accent brackets (10×10px, 2px, matching border color): top-left, top-right, bottom-left, bottom-right
   - Detection label (position: absolute, top -26px, left 0): background --green, color #000, DM Mono 500, 8px, letter-spacing 0.1em, padding 3px 8px. Text: "IDENTIFIED: JOE'S PIZZA"

#### Mini Map (bottom portion, ~45% of center height)

Background: #09090c. Border-top: 1px --border.

**Content:**

1. **Grid overlay** (CSS background-image): Lines at 30px intervals, rgba(255,255,255,0.025) — creates subtle city block grid.

2. **Crosshair lines**: One horizontal, one vertical, both 1px rgba(255,255,255,0.03), centered on 50%/50%.

3. **Radius rings**: Two concentric dashed circles centered at 50%/50% — 60px radius (inner) and 120px radius (outer). Color rgba(132,204,22,0.12) and rgba(132,204,22,0.08). NOT solid — dashed stroke.

4. **Center point**: 10px solid circle --green, box-shadow 0 0 8px rgba(132,204,22,0.6). Pulsing ring: 18px circle, border 1.5px rgba(132,204,22,0.4), scales out and fades, 2s infinite.

5. **Data source dots** (4 dots, scattered in the 500m radius zone):
   - Green dot (inspections): 10px, top ~38%, left ~58%
   - Amber dot (violations): 8px, top ~60%, left ~41%
   - Blue dot (permits): 8px, top ~72%, left ~34%
   - Red dot (NYPD): 7px, top ~78%, left ~55%
   Each has its own pulsing ring with staggered animation-delay (0s, 0.5s, 1.0s, 1.5s).

6. **Legend** (position: absolute, bottom 12px, centered):
   Flex row, gap 16px. Each item: colored 6px dot + DM Mono 300 8px letter-spacing 0.1em --muted label.
   Items: ● COMPLAINTS (red) · ● PERMITS (blue) · ● INSPECTIONS (green) · ● VIOLATIONS (amber)

---

### Zone 3: Right Panel (320px)

Background: --bg2.

#### Header (padding 16px 20px 14px, border-bottom 1px --border)

Left side:
- "SYSTEM ACTIVE" — DM Mono 400, 8px, letter-spacing 0.2em, --green. Preceded by a 5px status dot (--green) with pulsing box-shadow animation: 0 0 0 0 rgba(132,204,22,0.4) → 0 0 0 4px rgba(132,204,22,0) over 2s.
- "ASK NYC" — Syne 700, 26px, --text, letter-spacing -0.02em. Below the status line.

Right side:
- Two icon buttons (28×28px, radius 6px, border 1px --border, background --surface): gear icon + a small amber circle (status indicator).

#### Waveform Section (padding 14px 20px 10px, border-bottom 1px --border)

- 22 vertical bars (3px wide, 2.5px gap, border-radius 2px)
- Colors: --blue (#3b82f6) at varying opacities 0.4–1.0
- Heights animate using sine wave formula based on time + index offset
- Below waveform (8px gap): Speaking text in DM Mono 300, 10px, font-style italic, rgba(132,204,22,0.8), line-height 1.5:
  `"Scanning permit history for Joe's Pizza on Greenwich Ave..."`

#### Live Context Section

Label: "LIVE CONTEXT" — DM Mono 400, 8px, letter-spacing 0.2em, --muted. Padding 14px 20px 8px.

**Cards area** (scrollable, padding 0 12px, scrollbar hidden):

Each data card:
- Background --surface, border 1px --border, radius 8px, padding 12px 14px
- Flex row: [card body flex:1] [document thumbnail 40×50px]
- Bottom margin: 8px
- Entrance animation: translateX(16px) → 0, opacity 0 → 1, duration 350ms ease-out
- Staggered: card 1 at 400ms, card 2 at 800ms, card 3 at 1200ms

Card body:
- Badge (see badge specs above)
- Title: Syne 600, 18px, --text, line-height 1.1, margin-bottom 4px
- Detail: DM Mono 300, 9.5px, --muted, line-height 1.5, letter-spacing 0.01em

Document thumbnail (right side):
- 40×50px, radius 4px, border 1px --border2
- Slightly rotated: transform rotate(1.5deg)
- Top strip (10px height): colored per data source (matching badge color at 0.2 opacity)
- Body: tiny horizontal lines (2px height, various widths 50-100%, background rgba(255,255,255,0.06))
- One "highlight" line per card: rgba(255,255,255,0.15) or source-color at 0.2 opacity

**Three cards to show:**

Card 1: 
- Badge: HEALTH INSPECTION (green)
- Title: "Grade A"
- Detail: "Last inspection date: Jan 12, 2024. Zero critical violations found."
- Doc: green top strip

Card 2:
- Badge: BUILDING SAFETY (blue)
- Title: "Compliant"
- Detail: "Egress systems and fire suppression systems certified until Dec 2025."
- Doc: blue top strip

Card 3:
- Badge: SIDEWALK CAFÉ (green)
- Title: "Active"
- Detail: "Permit ID: #NYC-9921-X. Validity covering 4 tables and 8 chairs."
- Doc: amber top strip

#### Recent Explorations (border-top 1px --border, padding 12px 20px)

Header: "RECENT EXPLORATIONS" label left (DM Mono 8px --muted letter-spacing 0.2em) + "View All" right (DM Mono 8px --green).

Items row (flex, gap 8px):
- Two recent cards (flex:1 each): background --surface, border 1px --border, radius 6px, padding 8px 10px, flex row gap 8px.
  - Thumbnail: 28×22px radius 3px (colored gradient placeholder — no real image)
  - Text: location name DM Mono 9px --text, time ago DM Mono 8px --muted below
  - Card 1: "High Line" / "2H AGO"
  - Card 2: "Chelsea Market" / "5H AGO"
- Add button (36×36px, radius 8px, background --green, color #000, "+" Syne 700 20px)

---

## Screen 3: Phone Remote Page

**Viewport:** Mobile, 390×844px (iPhone 14 Pro). This page loads when someone scans the QR code on the main dashboard. Its sole job: stream audio and camera from the phone to the backend. Simple. Minimal. Can't fail.

**Layout:** Full height, flex column, no sidebar.

**Background:** #0c0c0f with the same faint city grid (30px grid, rgba(255,255,255,0.02)).

**Top bar (60px, padding 0 20px):**
- Left: "ASK NYC" in Syne 700, 16px, --green
- Right: Connection status chip — when connected: green dot + "CONNECTED" DM Mono 9px --green, background rgba(132,204,22,0.1), border rgba(132,204,22,0.2), padding 4px 10px, radius 3px. When disconnected: red dot + "CONNECTING..." in red.

**Camera preview (upper section, ~35% of height):**
A rounded rectangle (radius 12px, border 1px --border), containing the live camera feed from getUserMedia(). Overlaid in the top-left corner: a 6px pulsing red dot + "LIVE" text in DM Mono 8px --red.  
Below the preview (8px gap): two metadata chips side by side — "VIDEO 720p" and "AUDIO 16kHz", both DM Mono 8px --muted, background --surface, border 1px --border, padding 3px 8px, radius 3px.

**Center section (middle, ~35% of height):** 

The main mic button. This is the hero element. A circle, 120px diameter, centered horizontally.

Idle state:
- Outer ring: 120px circle, border 1.5px rgba(244,244,245,0.1), background transparent
- Inner filled circle: 88px, centered, background --surface, border 1px --border
- Mic icon: SVG microphone, 24px, --muted

Active state (when held):
- Outer ring border becomes --green at 1.5px, with a pulsing animation: box-shadow 0 0 0 0 rgba(132,204,22,0.4) → 0 0 0 12px rgba(132,204,22,0), 1s ease-out infinite
- Inner circle background becomes rgba(132,204,22,0.12), border --green
- Mic icon becomes --green
- A second outer ring (140px) fades in with a slower pulse at 1.5s delay

Below button (16px gap): 
- Idle: DM Mono 300, 11px, --muted, centered: "Hold to speak"
- Active: DM Mono 400, 11px, --green, centered: "Listening..."

**Audio waveform** (below instruction text, 16px gap):
22 bars, same spec as desktop but shorter max height (20px instead of 36px). Visible only when active, fades in. Same --blue color scheme.

**Bottom section (~15% of height, padding bottom 32px):**

Three stream status indicators in a column, centered:
Each: flex row, gap 8px, DM Mono 9px.
- 🎥 CAMERA STREAM — "720p · 1fps to agent" — --muted
- 🎤 AUDIO STREAM — "16kHz PCM · live" — --muted  
- ⚡ LATENCY — "42ms" — --green

At very bottom: DM Mono 300, 9px, --dim: "Your camera and voice are processed by Gemini Live. Nothing is stored."

**Interaction:** The hold-to-speak button fires touchstart/mousedown to begin audio capture and sends frames. touchend/mouseup stops. Simple and reliable.

---

## Screen 4: Session Archive

**Purpose:** All past Ask NYC conversations, browsable. Shows what the agent found, which datasets were queried, when, where. Feels like a case file archive or an intelligence briefing library.

**Layout:** Same left sidebar as Screen 2 (identical component, "ARCHIVES" nav item active). No right panel. Center content takes all remaining width.

**Background:** --bg (full screen).

**Content area (left padding matching sidebar border):**

**Top bar (60px height, padding 0 32px, border-bottom 1px --border):**
- Left: "ARCHIVES" in Syne 700, 20px, --text
- Right row (flex, gap 12px): 
  - Search input: 240px wide, 36px tall, background --surface, border 1px --border, radius 6px, padding 0 12px, DM Mono 300, 11px, placeholder "Search locations..." --muted
  - Filter chips: "ALL", "TODAY", "THIS WEEK" — DM Mono 9px, letter-spacing 0.1em. Active chip: background rgba(132,204,22,0.12), border rgba(132,204,22,0.3), text --green. Inactive: background --surface, border 1px --border, --muted.

**Session stats bar (padding 16px 32px, border-bottom 1px --border):**
Four stats in a flex row:
- "14 SESSIONS" / "THIS WEEK"
- "6 DATASETS" / "QUERIED"
- "847" / "DATA POINTS PROCESSED"
- "3" / "ANOMALIES FOUND"

Each stat: flex column. Top value: Syne 600, 22px, --text. Bottom label: DM Mono 300, 8px, letter-spacing 0.15em, --muted. Separated by thin 1px --border vertical dividers. 24px gap between stats.

**Session grid (padding 24px 32px):**

3-column grid, gap 16px. Each session card:

Card structure (background --surface, border 1px --border, radius 8px, padding 16px, cursor pointer):
- Hover: border-color --border2, transform translateY(-1px), transition 0.15s

**Card header:** flex row, space-between.
- Left: Location thumbnail (48×36px, radius 4px, colored gradient based on borough: Manhattan = warm, Brooklyn = cool, etc.) + location info column: name in Syne 600, 14px, --text + address in DM Mono 300, 9px, --muted below
- Right: Timestamp in DM Mono 300, 9px, --muted (e.g. "2H AGO" or "MAR 24, 10:41 PM")

**Card findings preview (margin-top 12px, padding-top 12px, border-top 1px --border):**
The 2-3 most important findings, each on its own line:
- Badge pill (source color) + finding text in DM Mono 300, 9px, --text
Example:
```
[HEALTH] Grade A · last inspected Jan 2024
[PERMITS] 2 active DOB permits within 200m
[311] 7 noise complaints in last 30 days
```

**Card footer (margin-top 12px, flex row, space-between):**
- Left: Source dots row — 3-5 small 6px colored dots representing which datasets returned data. Each dot has a 1px colored border + filled center.
- Right: "VIEW BRIEF →" in DM Mono 400, 8px, letter-spacing 0.1em, --green. Visible on hover only (opacity 0 → 1 on card hover).

**Show 9 cards** in the grid (3×3). Mix of different locations — some Manhattan (Midtown, SoHo, Greenwich Village), some Brooklyn (Williamsburg, Park Slope, Downtown BK), one anomaly card (HPD violation building — this card gets a subtle red left border 2px --red).

**Empty state** (if no sessions): Centered illustration — a simple SVG of a NYC building outline (minimal, 3 rectangles of different heights) in --dim, with text below: Syne 600, 16px, --muted "No sessions yet." DM Mono 300, 11px, --muted below: "Start a conversation on the main dashboard."

---

## Animation Principles (apply globally)

1. **Cards always slide in from the right** (translateX +16px → 0), never from below. Duration 350ms ease-out.
2. **Waveform uses RAF** (requestAnimationFrame) with sine wave math, not CSS keyframes.
3. **Scan line** is a continuous linear animation, no easing.
4. **Detection box** pulses its border color, never scales — scaling would imply uncertainty.
5. **Map dots** pulse outward (scale rings), never inward.
6. **Status dots** use box-shadow pulse (not scale), so the dot itself stays crisp.
7. **Page transitions** (between screens): fade only, 200ms. No sliding.
8. **Never animate** border-radius, background-color (except badge highlights), or font properties.

---

## Notes for Stitch

- The design system ("Gotham Data") has already been generated. Apply it consistently.
- Screen 2 (Intelligence Brief) has already been generated. Keep it as-is, use it as the canonical reference.
- Build Screen 1, Screen 3, and Screen 4 as new screens.
- All screens use the same sidebar component (Screen 1 has no sidebar).
- The phone remote (Screen 3) is mobile viewport — design it at 390×844px.
- No light mode variants needed.
- Export each screen as a separate frame.
