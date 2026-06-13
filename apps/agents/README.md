# Cascade agents

This package contains the runtime-facing Cascade agent definitions. The dashboard can run without these dependencies, but a live platform deployment registers these agents with Band and streams their room activity to the dashboard through the relay agent.

## Included agents

- `agents.triage.TriageAgent`: CrewAI-backed policy/intake parser that creates the structured incident frame and delegates to the regulatory coordinator.
- `agents.regulatory.RegulatoryCoordinator`: registry-driven coordinator that identifies triggered regimes and recruits jurisdictional specialists into the Regulatory Room.

## Expected runtime dependencies

The code is intentionally kept as thin platform glue. Install the real platform/framework dependencies in the agent runtime image:

```bash
pip install band-sdk crewai langgraph pydantic-ai anthropic
```

The current repository does not vendor or pin these hackathon SDK dependencies because the public SDK surface may change before submission.
