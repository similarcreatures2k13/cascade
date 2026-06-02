# Cascade

Cascade is a deterministic multi-agent cyber-breach incident response coordination demo for the Band of Agents Hackathon track "Regulated & High-Stakes Workflows."

The product surface is a Next.js 15 dashboard for a breach-response law firm partner coordinating a ransomware incident across privileged and non-privileged rooms. The demo replays scripted platform events so the recording is reliable while preserving the multi-agent architecture: CrewAI triage, LangGraph coordinators, Pydantic AI specialists, and a direct Anthropic adversary agent.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to view the single-screen incident dashboard.

## Demo scenario

- Client: Meridian Health Analytics
- Ransomware family: Akira
- Triggered regimes: HIPAA BAA, CCPA, SEC Item 1.05, GDPR
- Human gate: the breach coach partner must approve external communications before they leave privileged context
