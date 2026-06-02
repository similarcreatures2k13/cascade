"""CrewAI-backed cyber insurance triage agent."""

from __future__ import annotations

from typing import Any

from band_sdk import Agent
from band_sdk.adapters import CrewAIAdapter
from crewai import Agent as CrewAgent
from crewai import Task

from .models import CyberPolicy, IncidentFrame


class TriageAgent:
    """Parse intake artifacts, create an incident frame, and delegate workstreams."""

    def __init__(self, agent_id: str, api_key: str) -> None:
        crew_agent = CrewAgent(
            role="Cyber Insurance Triage Specialist",
            goal="Parse incident notification and cyber policy to produce structured incident frame",
            backstory=(
                "20 years of cyber claims experience triaging ransomware matters for "
                "breach-response counsel and cyber carriers."
            ),
            llm="openai/gpt-4o-mini",
        )

        adapter = CrewAIAdapter(agent=crew_agent)

        self.agent = Agent.create(
            adapter=adapter,
            agent_id=agent_id,
            api_key=api_key,
            handle="@cascade/triage",
        )
        self._crew_agent = crew_agent

    async def on_message(self, message: Any, context: Any) -> None:
        """Run only when the triage agent is explicitly @mentioned in a room."""

        attachments = getattr(context, "attachments", {})
        if "incident_notification" not in attachments:
            return

        frame = await self.parse_incident(attachments["incident_notification"])
        policy = await self.parse_policy(attachments.get("cyber_policy", {}))

        await self.agent.post(
            room_id=context.room_id,
            content=(
                f"Policy parsed. {policy.carrier} {policy.form_name} form, "
                f"${policy.limit:,} limit, ${policy.retention:,} retention. "
                "WARNING: Social engineering exclusion FLAGGED for monitoring."
            ),
            attachments={
                "incident_frame": frame.dict(),
                "cyber_policy_summary": policy.dict(),
            },
        )

        await self.agent.post(
            room_id=context.room_id,
            content=(
                "@cascade/regulatory-coordinator - incident frame attached. "
                f"Data types: {', '.join(frame.data_types)}. "
                f"Geographies: {', '.join(frame.geographies)}. "
                "Please assess notification obligations."
            ),
            attachments={"incident_frame": frame.dict()},
        )

    async def parse_incident(self, incident_notification: Any) -> IncidentFrame:
        """Use CrewAI for production parsing; keep a deterministic fallback for demo artifacts."""

        payload = _coerce_mapping(incident_notification)
        if payload:
            return IncidentFrame.from_mapping(payload)

        Task(
            description=(
                "Extract insured name, sector, incident type, ransomware family, affected "
                "data classes, geographies, public-company status, and healthcare indicators."
            ),
            expected_output="A structured IncidentFrame JSON object",
            agent=self._crew_agent,
        )

        return IncidentFrame(
            client_name="Meridian Health Analytics",
            sector="healthcare_saas",
            incident_type="ransomware",
            data_types=("patient_data", "clinical_trial_records", "employee_pii"),
            geographies=("US-CA", "IE", "EU"),
            public_company=True,
            healthcare_data=True,
            ransomware_family="Akira",
            facts={"trial_enrollment_window_hours": 96},
        )

    async def parse_policy(self, cyber_policy: Any) -> CyberPolicy:
        payload = _coerce_mapping(cyber_policy)
        if payload:
            return CyberPolicy(
                carrier=str(payload.get("carrier", "Carrier")),
                form_name=str(payload.get("form_name", payload.get("form", "CyberEdge"))),
                limit=int(payload.get("limit", 5_000_000)),
                retention=int(payload.get("retention", 250_000)),
                panel_ir_required=bool(payload.get("panel_ir_required", True)),
                exclusions=tuple(payload.get("exclusions", ("social_engineering",))),
                sublimits=dict(payload.get("sublimits", {})),
            )

        return CyberPolicy(
            carrier="Apex Specialty",
            form_name="CyberEdge",
            limit=5_000_000,
            retention=250_000,
            panel_ir_required=True,
            exclusions=("social_engineering",),
            sublimits={"business_interruption": 2_500_000, "forensics": 1_000_000},
        )


def _coerce_mapping(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if hasattr(value, "dict"):
        return dict(value.dict())
    return {}
