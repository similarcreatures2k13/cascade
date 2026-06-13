"""Shared typed payloads passed between Cascade agents."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class CyberPolicy:
    carrier: str
    form_name: str
    limit: int
    retention: int
    panel_ir_required: bool = True
    exclusions: tuple[str, ...] = ()
    sublimits: dict[str, int] = field(default_factory=dict)

    def dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class IncidentFrame:
    client_name: str
    sector: str
    incident_type: str
    data_types: tuple[str, ...]
    geographies: tuple[str, ...]
    public_company: bool
    healthcare_data: bool
    ransomware_family: str | None = None
    facts: dict[str, Any] = field(default_factory=dict)

    def dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_mapping(cls, payload: dict[str, Any]) -> "IncidentFrame":
        return cls(
            client_name=str(payload.get("client_name", "Unknown insured")),
            sector=str(payload.get("sector", "unknown")),
            incident_type=str(payload.get("incident_type", "ransomware")),
            data_types=tuple(payload.get("data_types", ())),
            geographies=tuple(payload.get("geographies", ())),
            public_company=bool(payload.get("public_company", False)),
            healthcare_data=bool(payload.get("healthcare_data", False)),
            ransomware_family=payload.get("ransomware_family"),
            facts=dict(payload.get("facts", {})),
        )
