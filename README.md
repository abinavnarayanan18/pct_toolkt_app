# PCT Catalyst

> A leadership transformation assessment tool built on the People-Centered Transformation (PCT) methodology by Tony O'Driscoll, Duke University.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

---

## Features

- **PCT Pulse Check** — 10-element Likert assessment with real-time autosave
- **Priority Selection & Shift Ranking** — drag-and-drop reordering
- **MBD Activators** — structured commitment framework (More of / Better / Differently)
- **AI Leadership Analysis** — Claude-powered personalized coaching report
- **Cohort Synthesis** — AI aggregation and facilitator recommendations
- **SVG Radar Chart** — 10-axis, 7-ring with cohort overlay
- **Admin Console** — cohort management, response viewer, CSV export
- **Print-ready** — clean A4 output of participant summary

---

## Quick Start (Local)

```bash
git clone <repo>
cd pct_toolkt_app
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and JWT_SECRET in .env
npm install
npm run dev
```

App runs at **http://localhost:3000**

Default admin login: `admin@pctcatalyst.com` / `pct-admin-2026`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | Anthropic API key for AI features |
| `JWT_SECRET` | **Yes** | Long random string for JWT signing |
| `PORT` | No | HTTP port (default: `3000`) |
| `DB_PATH` | No | SQLite file path (default: `/data/pct_catalyst.db`) |
| `NODE_ENV` | No | Set to `production` for Railway |

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Deploy to Railway

1. Fork this repo
2. Create a new Railway project → **Deploy from GitHub repo**
3. Add a **Volume** mounted at `/data` (for SQLite persistence)
4. Set environment variables:
   - `ANTHROPIC_API_KEY` — your Anthropic key
   - `JWT_SECRET` — generated secret (see above)
   - `NODE_ENV` — `production`
5. Railway auto-detects the `Dockerfile` and builds

---

## Architecture

```
/
├── server.js          Express app + all API routes
├── db.js              SQLite schema + query helpers (better-sqlite3)
├── ai.js              Anthropic API calls (individual + cohort)
├── public/
│   ├── index.html     Shell + CDN scripts (React 18, Babel)
│   ├── data.js        PCT element data
│   ├── app.jsx        Root component + client-side router
│   ├── radar.jsx      SVG radar chart (no library)
│   ├── screens.jsx    6-step participant flow
│   ├── admin.jsx      Facilitator admin console
│   └── styles.css     Design tokens + all styles
├── Dockerfile
└── railway.toml
```

**Stack:** Node.js + Express · SQLite (better-sqlite3) · Vanilla React via CDN · Anthropic SDK

---

## Participant Flow

1. **Welcome** — name, role, cohort info
2. **Profile** — confirm details
3. **PCT Pulse** — rate all 10 elements (1–7 Likert)
4. **Priority** — select focus element
5. **Rank Shifts** — drag-and-drop all 10 shifts
6. **Activators** — MBD framework + commitment
7. **Summary** — radar chart + AI analysis

---

## Admin Workflow

1. Log in at `/admin`
2. Create a cohort → share the cohort ID or link with participants
3. Monitor responses in real time
4. Generate AI analyses for individual participants
5. Use **Cohort Synthesis** for facilitator planning
6. **Release cohort average** to show participants how they compare
7. Export CSV for further analysis

---

## PCT Elements

| # | Title | Quadrant |
|---|---|---|
| 1 | Communicate a Compelling Change Narrative | ASPIRATION |
| 2 | Act to Think Differently | ASPIRATION |
| 3 | Embrace Situational Humility | ALIGNMENT |
| 4 | Focus Attention on What Matters | ALIGNMENT |
| 5 | Motivate Discretionary Effort | AUTONOMY |
| 6 | Give Others Agency | AUTONOMY |
| 7 | Decentralize Decision Making | ACCOUNTABILITY |
| 8 | Catalyze the Network | ACCOUNTABILITY |
| 9 | Lead the System | ACCOUNTABILITY |
| 10 | Nudge the Culture | ALIGNMENT |
