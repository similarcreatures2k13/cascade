"""Regulatory coordinator agent with dynamic specialist discovery."""

from __future__ import annotations

from typing import Any

from band_sdk import Agent, RegistryQuery

from .models import IncidentFrame


REGIME_TAGS = {
    "hipaa-baa": {"data_types": {"patient_data", "phi"}, "geographies": set()},
    "ccpa": {"data_types": {"consumer_pii", "employee_pii", "patient_data"}, "geographies": {"US-CA"}},
    "gdpr": {"data_types": {"patient_data", "clinical_trial_records", "employee_pii"}, "geographies": {"EU", "IE"}},
    "sec-8k": {"data_types": set(), "geographies": set()},
}


class RegulatoryCoordinator:
    """Hero agent: identify obligations, discover specialists, and recruit them."""

    def __init__(self, agent_id: str, api_key: str, adapter: Any) -> None:
        self.agent = Agent.create(
            adapter=adapter,
            agent_id=agent_id,
            api_key=api_key,
            handle="@cascade/regulatory-coordinator",
        )

    async def on_message(self, message: Any, context: Any) -> None:
        attachments = getattr(context, "attachments", {})
        frame = IncidentFrame.from_mapping(attachments["incident_frame"])
        regulatory_room_id = getattr(context, "regulatory_room_id", context.room_id)

        triggered = self.identify_obligations(frame)
        await self.agent.post(
            room_id=regulatory_room_id,
            content=(
                "Regulatory graph activated. Triggered regimes: "
                f"{', '.join(triggered) if triggered else 'none yet'}."
            ),
            attachments={"incident_frame": frame.dict(), "triggered_regimes": triggered},
        )

        for regime in triggered:
            specialist = await self.discover_specialist(regime)
            if specialist is None:
                await self.agent.post(
                    room_id=regulatory_room_id,
                    content=f"No registered specialist found for {regime}; keeping obligation on coordinator worklist.",
                    attachments={"incident_frame": frame.dict(), "regime": regime},
                )
                continue

            await self.agent.invite_to_room(
                agent_handle=specialist.handle,
                room_id=regulatory_room_id,
            )
            await self.agent.post(
                room_id=regulatory_room_id,
                content=(
                    f"{specialist.handle} - incident triggers {regime}. "
                    "Frame attached. Please assess obligations and clocks."
                ),
                attachments={"incident_frame": frame.dict(), "regime": regime},
            )

    def identify_obligations(self, frame: IncidentFrame) -> list[str]:
        triggered: list[str] = []
        data_types = set(frame.data_types)
        geographies = set(frame.geographies)

        if frame.healthcare_data or data_types.intersection(REGIME_TAGS["hipaa-baa"]["data_types"]):
            triggered.append("hipaa-baa")
        if "US-CA" in geographies and data_types.intersection(REGIME_TAGS["ccpa"]["data_types"]):
            triggered.append("ccpa")
        if geographies.intersection(REGIME_TAGS["gdpr"]["geographies"]):
            triggered.append("gdpr")
        if frame.public_company:
            triggered.append("sec-8k")

        return triggered

    async def discover_specialist(self, regime: str) -> Any | None:
        query = RegistryQuery(
            tags=[regime, "notification", "specialist"],
            scope="personal",
        )
        specialists = await self.agent.discover(query)
        return specialists[0] if specialists else None
