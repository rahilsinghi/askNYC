# Bharath — QA, Demo Prep & Documentation

> Testing, demo script, presentation, environment setup, GitHub repo
>
> **Deployment is DONE.** See [docs/BHARATH_TASKS.md](../docs/BHARATH_TASKS.md) for live URLs and testing instructions.
> Start from **Task 3** in BHARATH_TASKS.md (iOS Safari live camera testing).

---

## Task 1: Verify All Data Sources (Hours 0-1)

### Run the test suite
```bash
cd backend
source venv/bin/activate
python test_socrata.py
```

**Expected:** 7/7 APIs passing. Screenshot the output and share with team.

### Manual verification
Open each URL in browser and confirm data returns:

1. **Restaurants:** https://data.cityofnewyork.us/resource/43nn-pn8j.json?$where=upper(dba)%20like%20upper('%25JOE%25')&$limit=3
2. **311:** https://data.cityofnewyork.us/resource/erm2-nwe9.json?$where=within_circle(location,40.6943,-73.9865,400)&$limit=3
3. **DOB Permits:** https://data.cityofnewyork.us/resource/ipu4-2q9a.json?$where=gis_latitude%20IS%20NOT%20NULL&$limit=3
4. **HPD Violations:** https://data.cityofnewyork.us/resource/wvxf-dwi5.json?$where=violationstatus=%27Open%27%20AND%20zip=%2711201%27&$limit=3
5. **NYPD:** https://data.cityofnewyork.us/resource/5uac-w243.json?$where=within_circle(geocoded_column,40.6943,-73.9865,400)&$limit=3
6. **Evictions:** https://data.cityofnewyork.us/resource/6z8x-wfk4.json?$where=eviction_zip=%2711201%27&$limit=3
7. **Subway:** https://data.ny.gov/resource/i9wp-a4ja.json?$where=within_circle(entrance_georeference,40.6943,-73.9865,500)&$limit=3

---

## Task 2: GitHub Repository Setup (Hours 1-2)

### Create and push
```bash
cd /Users/rahilsinghi/Desktop/AskNYC
git init
git add -A
git commit -m "feat: initial commit — Ask NYC hackathon project"
git remote add origin https://github.com/rahilsinghi/ask-nyc.git
git push -u origin main
```

### Update README.md
Create `README.md` at project root with:

```markdown
# Ask NYC 🗽

> Voice + camera AI agent that answers questions about NYC locations using real city data.

Point your phone at any restaurant, building, or construction site. Ask a question.
Get instant answers powered by 7 NYC Open Data datasets, Gemini AI, and Google Cloud.

## Team
- Rahil Singhi — Backend Architecture, Gemini Live Pipeline
- Chinmay — Cloud Deployment, WebSocket Infrastructure
- Sariya — Frontend Design, Dashboard UX
- Bharath — QA, Demo Preparation, Documentation

## Tech Stack
- **AI:** Google Gemini 3.1 Flash Live (via ADK multi-agent architecture)
- **Backend:** FastAPI + Python, deployed on Google Cloud Run
- **Frontend:** Next.js 15 + React 19, deployed on Vercel
- **Data:** 7 NYC Open Data datasets via Socrata API
- **Maps:** Mapbox GL JS
- **Grounding:** Google Search + NYC Open Data

## Quick Start
\`\`\`bash
./dev.sh
\`\`\`

## Architecture
See [team/MASTER_PLAN.md](team/MASTER_PLAN.md) for full architecture diagram.

## Built for
NYC Build With AI Hackathon @ NYU Tandon — GDG NYC, March 27-28, 2026
```

### Add team members as collaborators
Settings → Collaborators → Add each teammate's GitHub username

---

## Task 3: Prepare Demo Scenarios (Hours 2-4)

### Print 3 Demo Cards (A4, high quality)

**Card 1 — The Restaurant (Joe's Pizza)**
- Address: 7 Carmine St, New York, NY 10014
- Print a Google Street View photo of the storefront
- Expected data: Grade A, clean record, 3 noise complaints nearby
- Talk track: "I'm at Joe's Pizza. Let me check what the city knows."

**Card 2 — The Building (Brooklyn with HPD violations)**
- Query this URL to find a building with 3+ violations:
  ```
  https://data.cityofnewyork.us/resource/wvxf-dwi5.json?$where=violationstatus='Open' AND zip='11201'&$limit=20
  ```
- Pick one with interesting violations (heat/hot water = most dramatic)
- Print Street View of the building
- Talk track: "I'm looking at this apartment building. Should I sign a lease here?"

**Card 3 — Construction Site (near NYU Tandon)**
- Query for active permits:
  ```
  https://data.cityofnewyork.us/resource/ipu4-2q9a.json?$where=zip_code='11201'&$limit=10&$order=filing_date DESC
  ```
- Find a new building permit (job_type = NB)
- Print Street View of the construction site
- Talk track: "What's being built here? Should I be worried about noise?"

### Memorize the Expected Answers
For each card, know:
- The health grade / violation count / permit type
- The key anomaly or interesting fact
- The 2-sentence summary the agent should give

This is your **fallback** if Gemini is slow or offline — you can narrate while demo mode plays.

---

## Task 4: Write Demo Script (Hours 4-6)

### Demo Format
- **Round 1:** Group heats, 5-8 minutes per team
- **Round 2:** Main stage finals (top 6)

### Script (5 minutes total)

```
[0:00-0:30] INTRO
"We built Ask NYC — think of it as Shazam for buildings.
Point your phone at anything in New York City, ask a question,
and our AI agent queries 7 city datasets in real-time to give you answers
no one else can."

[0:30-1:00] ARCHITECTURE (show slide)
"Under the hood: Gemini 3.1 Flash Live processes camera + voice simultaneously.
Five specialized AI agents — food safety, housing, construction, safety, and transit —
each query different NYC Open Data sources. All running on Google Cloud Run with
Vertex AI."

[1:00-2:30] DEMO 1: RESTAURANT
[Hold up Card 1 to camera]
"Here's Joe's Pizza on Carmine Street. Let me ask: is this safe to eat?"
[Wait for agent response — data cards appear, map pins drop]
"Grade A — zero critical violations. But the agent also found 3 noise complaints
from the bar next door. That's the kind of context only real city data gives you."

[2:30-4:00] DEMO 2: BUILDING
[Hold up Card 2]
"Now this apartment building in Brooklyn. Should I live here?"
[Wait for response — HPD violations card, evictions card, subway card]
"7 open violations, two heat complaints unresolved for 14 months.
Plus the agent pulled eviction records — 50 in this zip code last year.
And it found 3 subway stations within 500 meters. The full picture."

[4:00-4:30] DEMO 3: CONSTRUCTION (quick)
[Hold up Card 3]
"What's being built here?"
[Quick response — DOB permit card]
"14-story residential, runs until October 2025. 31 noise complaints in 30 days."

[4:30-5:00] CLOSING
"Ask NYC turns every building into an open book.
7 datasets, 5 specialized agents, all in real-time voice + vision.
Built on Gemini 3.1 Flash Live and Google Cloud."
```

### Backup Plan
If Gemini Live is slow or fails:
1. Click DEMO: RESTAURANT button on dashboard
2. Narrate the same script while demo cards animate in
3. Say "Let me show you what it looks like with real data" — switch to pre-recorded video

---

## Task 5: Build Presentation Slides (Hours 6-10)

### Slide 1: Title
```
ASK NYC
Voice + Camera AI for City Intelligence
NYC Build With AI Hackathon — March 2026
```

### Slide 2: The Problem
```
"You walk past 1,000 buildings a day.
You know nothing about any of them."

- Is this restaurant safe to eat at?
- Should I sign a lease in this building?
- What's being built on my block?

The data is all public. No one can access it.
```

### Slide 3: The Solution
```
[Screenshot of dashboard with data cards]

Point. Ask. Know.

Camera sees → Gemini identifies →
5 agents query 7 datasets →
Spoken answer in <3 seconds
```

### Slide 4: Architecture Diagram
```
[Use the ASCII diagram from MASTER_PLAN.md, convert to visual]

Phone (camera + mic)
  ↓ WebSocket
Backend (Cloud Run)
  ↓ ADK Multi-Agent
  ├── FoodSafetyExpert → Socrata
  ├── HousingExpert → Socrata
  ├── SafetyExpert → Socrata
  ├── ConstructionExpert → Socrata
  └── TransitExpert → data.ny.gov
  + Google Search grounding
  ↓
Dashboard (Vercel)
  Map + Cards + Voice
```

### Slide 5: Live Demo
```
[Transition to live demo]
```

### Slide 6: Technical Highlights
```
- Gemini 3.1 Flash Live (launched yesterday)
- ADK multi-agent with 5 specialists
- 7 NYC Open Data sources (40M+ records)
- Google Search grounding
- Deployed: Cloud Run + Vercel
- WebSocket streaming: <100ms relay
```

---

## Task 6: End-to-End Testing (Hours 10-16)

### Test Matrix

| Test | How | Expected |
|------|-----|----------|
| Backend health | `curl /health` | `{"status":"ok"}` |
| Socrata 7/7 | `python test_socrata.py` | All green |
| Dashboard loads | Open /dashboard | 4-panel layout |
| Demo mode works | Click DEMO: RESTAURANT | Cards animate |
| Mapbox renders | Check /dashboard map | Real map visible |
| Remote connects | Open /remote on phone | Camera preview |
| WebSocket links | Dashboard shows "CONNECTED" | Green dot |
| Cloud Run | Hit deployed URL | Same as local |
| Vercel | Hit Vercel URL | Frontend loads |
| Full pipeline | Phone → question → answer | End-to-end |

### Test on Multiple Devices
- iPhone Safari (primary demo device)
- Android Chrome
- Desktop Chrome
- Desktop Safari

---

## Task 7: Record Backup Video (Hours 14-16)

**Critical safety net.** If live demo fails, play this.

1. Screen record the full 3-scenario demo working
2. Record both dashboard + phone screens simultaneously
3. Narrate over it (same script as above)
4. Keep under 3 minutes
5. Upload to Google Drive, have link ready

---

## Files You Own

| File | Action |
|------|--------|
| `README.md` | CREATE — project overview for GitHub |
| `team/DEMO_SCRIPT.md` | CREATE — word-for-word demo script |
| Presentation slides | CREATE — Google Slides / Figma |
| Demo cards | PRINT — 3 physical cards with Street View photos |
| Backup video | RECORD — 3-minute demo recording |

---

## Definition of Done

- [ ] 7/7 Socrata APIs verified and documented
- [ ] GitHub repo created with README listing all team members
- [ ] 3 demo cards printed with Street View photos
- [ ] Demo script written and rehearsed (under 5 minutes)
- [ ] Presentation slides complete (6 slides)
- [ ] End-to-end tested on iPhone + Android
- [ ] Backup demo video recorded
- [ ] All expected answers memorized for fallback narration
