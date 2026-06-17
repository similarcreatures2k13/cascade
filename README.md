# Cascade

**Multi-agent incident command for cyber-breach response.**

[![Live Demo](https://img.shields.io/badge/demo-cascade--beige.vercel.app-39FF9E)](https://cascade-beige.vercel.app/)
[![Built with Band](https://img.shields.io/badge/built%20with-Band%20SDK%201.0-7c5cff)](https://app.band.ai/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Cascade dashboard during a Vela Clinical incident](./assets/cascade-demo.gif)
**3 live Band agents | 5 specialist roles | 4 jurisdictional regimes | 72-hour incident clock | 1 named buyer**

Built for the Band of Agents Hackathon 2026, Track 3 (Regulated & High-Stakes Workflows). Solo build. Hand-tuned prompts. Reverse-engineered SDK.

**The breach coach is the buyer. The 72-hour clock is the stakes engine. Band is the substrate.**

---

## Live Demo

**Dashboard:** [cascade-beige.vercel.app](https://cascade-beige.vercel.app/)
Add `?recording=true` to hide development controls.

**Live agent cascade:** see the [What's Live vs Scripted](#whats-live-vs-scripted) section. Three agents are connected to Band right now and respond to @-mentions in real chat rooms.

---

## Quickstart

**Requires:** Node 20+, Python 3.11+, [uv](https://docs.astral.sh/uv/), a Band account, an OpenRouter or OpenAI API key.

**Dashboard:**
```bash
git clone https://github.com/similarcreatures2k13/cascade.git
cd cascade
npm install
npm run dev
```

Open `http://localhost:3000`.

**Agents** (three terminals, one per agent):
```bash
cd apps/agents
uv sync

# Edit agent_config.yaml with three Band agent UUIDs + API keys
# Edit .env with OPENAI_API_KEY (OpenRouter compatible)

uv run python triage_agent.py         # terminal 1
uv run python regulatory_agent.py     # terminal 2
uv run python hipaa_specialist.py     # terminal 3
```

In [app.band.ai](https://app.band.ai/), create a chat room, add the three agents, @-mention **Cascade Triage** with an incident.

---

## The Workflow

When ransomware hits a company, the response is run by a **breach coach** — a partner at a law firm like Mullen Coughlin, BakerHostetler, or Constangy. The breach coach quarterbacks six to eight separate organizations on a hard clock: the carrier's adjuster, a panel-approved forensics firm, regulators across multiple jurisdictions, the insured's IT team, sometimes counsel, sometimes a negotiator.

That work happens today in Slack, email, conference calls, and Word documents. Cascade is the coordination layer above it.

Cyber insurance is a $20B+ market. Ransomware attacks were up 50% year-over-year in 2025. Payment rates dropped to 28% — which means more incidents go through the full coordination lifecycle (forensics → notification → restoration → BI claim → coverage dispute) instead of "pay and move on." The volume of coordination work is growing. The tooling has not caught up.

---

## The Cascade Architecture

Two surfaces working through Band.

### 1. The agent fleet — `apps/agents/`

Python agents using the Band SDK. Each is a `SimpleAdapter` subclass driving an OpenAI tool-calling loop with Band's platform tools (`send_message`, `lookup_peers`, `add_participant`, `send_event`) auto-injected.

| Agent | Role | When It Fires |
|---|---|---|
| `cascade-triage` | Parses incident facts, identifies coverage triggers and exclusions, routes to regulatory | @-mentioned by breach coach |
| `cascade-regulatory-coordinator` | Identifies triggered notification regimes, looks up specialists, recruits them into the room | @-mentioned by triage |
| `hipaa-baa-specialist` | Computes HIPAA Breach Notification Rule obligations per 45 CFR §§ 164.400-414 | @-mentioned by regulatory (after discovery) |

The regulatory agent is the hero. It demonstrates the three Band primitives that no other multi-agent framework offers cleanly: surgical @-mention routing, dynamic peer discovery, and runtime participant recruitment.

### 2. The dashboard — `app/`, `components/`, `lib/`, `store/`

Next.js 15 + TypeScript + Tailwind v4 + Framer Motion + Zustand. The breach coach's war-room UI:

- Top bar: 72-hour incident clock (incident time, not demo time)
- Left rail: privileged vs. external boundary rooms (War, Regulatory, Forensics, Quantification, Carrier)
- Main pane: live agent activity with framework labels and message threading
- Right rail: notification clocks per jurisdiction, accruing BI loss counter, awaiting-approval queue
- Bottom: human approval gate that pulses when sign-off is required

---

## Why Band

Three reasons Cascade is built on Band specifically, not LangGraph or CrewAI alone:

**Cross-org by default.** A real breach response involves the insured, the carrier, panel counsel, panel forensics, panel negotiation, regulators, and the FBI — separate organizations with separate agents in production. Band's contact/permission model is the substrate for cross-organization agent collaboration. No other framework even tries.

**Dynamic specialist discovery.** Jurisdictional explosion (HIPAA, CCPA, GDPR, 50 state breach laws, SEC Item 1.05, sector-specific obligations) cannot be statically built. Band's `lookup_peers` lets the regulatory coordinator find specialist agents at runtime — including specialists published to Band's public directory by other organizations.

**Audit trail is regulatory, not optional.** Privilege depends on documented attorney direction; regulators scrutinize notification timelines; the SEC has new cyber disclosure rules with four-day clocks. Band's unified audit trail does compliance work, not just devops work.

---

## What's Live vs Scripted

Honesty about the architecture, because hackathon submissions earn trust by being explicit:

**Live, running against Band's platform right now:**
- Cascade Triage agent (`apps/agents/triage_agent.py`)
- Cascade Regulatory Coordinator (`apps/agents/regulatory_agent.py`)
- HIPAA-BAA Notification Specialist (`apps/agents/hipaa_specialist.py`)
- All three coordinate through @-mentions, `band_lookup_peers`, and `band_add_participant`

**Scripted in the dashboard for demo reliability:**
- Adversary / Carrier-Perspective Agent (Claude Sonnet 4 in production)
- BI Quantification Agent
- Forensics Liaison
- CCPA, SEC 8-K, GDPR specialists (the architecture supports public-directory discovery; for this submission they appear as dashboard activations driven by the timeline)

The dashboard runs deterministic scripted events for the recorded demo. The same surface would render live Band activity through a relay agent in production; that path is designed in `lib/relay-protocol.ts` and not wired for this submission.

The architecture supports N agents. This submission demonstrates the cascade pattern with three.

---

## Demo Scenario

Fictional incident in `docs/case-file.md`:

| Field | Value |
|---|---|
| Client | **Vela Clinical** — public clinical-trial data SaaS, ~400 employees |
| HQ | San Francisco, with Ireland subsidiary processing EU patient data |
| Ransomware family | Akira (active 2025-2026, healthcare-targeting) |
| Carrier | Northbridge Cyber, $5M aggregate / $250K retention |
| IR firm | Stroud IR |
| Records exfiltrated | ~340,000 patient records |
| Triggered regimes | HIPAA BNR, CCPA §1798.82, GDPR Art. 33/34, SEC 8-K Item 1.05 |
| Stakes anchor | Phase 3 oncology trial closes enrollment in 96 hours; 47 patients miss treatment windows if Vela goes dark |

---

## Repo Structure

```
cascade/
├── app/                              Next.js app router entry
├── components/cascade-dashboard.tsx  Main war-room UI
├── lib/
│   ├── cascade-script.ts             Deterministic demo script
│   ├── relay-protocol.ts             Future live-mode protocol
│   └── utils.ts                      Time formatting, currency
├── store/use-demo-store.ts           Zustand state (clock, events, relay status)
├── docs/case-file.md                 Vela Clinical incident artifacts
└── apps/agents/
    ├── cascade_adapter.py            Shared SimpleAdapter with tool-calling loop
    ├── triage_agent.py               Cascade Triage
    ├── regulatory_agent.py           Cascade Regulatory Coordinator (hero)
    ├── hipaa_specialist.py           HIPAA-BAA Specialist
    ├── agent_config.yaml             Band UUIDs + API keys (gitignored)
    └── .env                          LLM provider keys (gitignored)
```

---

## FAQ

**Is this a real product?**

No. It's a working architecture demonstrated against a real platform with three live agents. A production build would require: RAG over actual case law and policy archives, integration with panel vendor reporting formats (Mandiant, Kroll, Stroz Friedberg), privilege-model review by an actual lawyer, and a design-partner law firm to validate the workflow against their incident archive.

**Why three agents, not eight?**

A solo seven-day build window forces choices. Three agents demonstrate every Band primitive judges care about: @-mention routing, dynamic peer discovery, runtime participant recruitment, cross-framework coordination. The other five exist in the dashboard architecture; wiring them is incremental work, not architectural.

**Why not CrewAI or LangGraph alone?**

Because real cyber incident response is cross-organizational, not internal to one team. Carriers, forensics firms, law firms, regulators — all separate parties with separate agents in production. CrewAI and LangGraph assume agents inside one runtime. Band assumes agents across organizations. The vertical demands the latter.

**How was this built?**

Solo, with AI coding assistance for implementation acceleration. The architectural decisions, vertical insight, prompt engineering, and Band SDK integration are mine. The dashboard scaffold was AI-accelerated and hand-debugged into production.

**What would v1 look like?**

Three months. One breach coach firm as design partner. Replace the synthetic Vela case file with their anonymized historical incidents. Tune the regulatory agent against their case archive. Add the adversary agent with case law RAG. Wire one IR firm integration (likely Mandiant first, given market share). Privilege model reviewed by counsel. Distribution through panel relationships, not self-serve.

---

## License

MIT

## Author

Solo build for Band of Agents Hackathon 2026.
GitHub: [@similarcreatures2k13](https://github.com/similarcreatures2k13)
Brand: 0xTetsuo / Tetsuo Labs.
