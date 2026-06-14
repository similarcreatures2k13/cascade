# Cascade

**Multi-agent incident command for cyber-breach response.**

Cascade coordinates the work of triage, forensics, regulators, and carriers across the 72-hour window after a ransomware incident — built for the breach-coach partners at panel law firms who currently quarterback this work on spreadsheets and conference calls.

**Live demo:** https://cascade-beige.vercel.app/
**Built for:** Band of Agents Hackathon 2026 — Track 3: Regulated & High-Stakes Workflows.

---

## What Cascade is

When ransomware hits a company, the response is run by a "breach coach" — a partner at a law firm like Mullen Coughlin, BakerHostetler, or Constangy. The breach coach coordinates a fleet of separate organizations on a hard clock: the carrier's adjuster, a panel-approved forensics firm, regulators, the insured's IT team, sometimes counsel, sometimes a negotiator.

That coordination is the workflow Cascade automates. A fleet of specialized AI agents handles the parallel workstreams — triage, regulatory notification, business interruption quantification, coverage-dispute analysis — coordinated through **Band**'s cross-framework agent platform.

## Architecture

Two surfaces:

**1. The agent fleet (`apps/agents/`)** — Python agents using the Band SDK. Each agent is a `SimpleAdapter` subclass driving an OpenAI tool-calling loop, with Band's platform tools (`send_message`, `lookup_peers`, `add_participant`) auto-injected. Three agents are wired live for this submission:

- **`@cascade/triage`** — Cyber breach triage specialist. When @-mentioned with an incident, parses the facts, identifies policy coverage and exclusions, and recruits the regulatory coordinator.
- **`@cascade/regulatory-coordinator`** — The hero agent. Identifies triggered notification regimes (HIPAA, CCPA, GDPR, SEC Item 1.05), uses Band's `lookup_peers` to discover specialist agents, and `add_participant`s them into the room.
- **`@cascade/hipaa-baa-specialist`** — Listed in Band's public directory. Computes HIPAA Breach Notification Rule obligations and clocks per 45 CFR §§ 164.400-414.

**2. The dashboard (`app/`, `components/`, `lib/`, `store/`)** — Next.js 15 + TypeScript + Tailwind v4 + Framer Motion + Zustand. The breach-coach's war-room UI: privileged/non-privileged room model, ticking 72-hour incident clock, live notification countdown clocks per jurisdiction, accruing BI loss counter, human-approval gate for external communications.

## Demo scenario

A fictional incident:

- **Client:** Vela Clinical — a public clinical-trial data coordination SaaS, ~400 employees, California HQ, Ireland subsidiary processing EU patient data
- **Ransomware family:** Akira (active in 2025-2026, healthcare-targeting, well-documented)
- **Triggered regimes:** HIPAA Breach Notification Rule, California Civ Code §1798.82 (CCPA), GDPR Articles 33/34, SEC Form 8-K Item 1.05
- **Human stakes anchor:** A Phase 3 oncology trial closes enrollment in 96 hours; if Vela goes dark, 47 patients miss their treatment windows

Full case file in [`docs/case-file.md`](./docs/case-file.md).

## Why Band

Three architectural reasons Cascade is built on Band specifically, not LangGraph or CrewAI alone:

1. **Cross-org by default.** A real breach response involves the insured, the carrier, panel counsel, panel forensics, panel negotiation, regulators, and the FBI — separate organizations with separate agents in production. Band's contact/permission model is the substrate for cross-org
