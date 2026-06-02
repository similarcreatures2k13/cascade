# Cascade

Cascade is a deterministic multi-agent cyber-breach incident response coordination demo for the Band of Agents Hackathon track "Regulated & High-Stakes Workflows."

The product surface is a Next.js 15 dashboard for a breach-response law firm partner coordinating a ransomware incident across privileged and non-privileged rooms. The demo can render live platform activity through a WebSocket relay agent, and falls back to scripted events for reliable recording.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to view the single-screen incident dashboard.

## Optional relay-agent mode

Run the portable Python relay to stream demo room events over WebSocket:

```bash
python3 relay/cascade_relay.py --demo --speed 8
NEXT_PUBLIC_CASCADE_RELAY_WS=ws://127.0.0.1:8765/rooms/cascade-demo npm run dev
```

The production design uses the same protocol with a silent observer agent joined to each Cascade room. See `docs/platform-connection.md`.

## Demo scenario

- Client: Meridian Health Analytics
- Ransomware family: Akira
- Triggered regimes: HIPAA BAA, CCPA, SEC Item 1.05, GDPR
- Human gate: the breach coach partner must approve external communications before they leave privileged context

## Submission planning

- Platform connection and requirements: `docs/platform-connection.md`
- Judging rubric and submission assets: `docs/submission-map.md`
