#!/usr/bin/env python3
"""Portable Cascade relay agent reference implementation.

The production relay is a silent observer agent joined to every Cascade room. It
subscribes to platform room events, normalizes them into the dashboard relay
protocol, and broadcasts them over WebSocket to the Next.js dashboard.

This file is intentionally dependency-free so the demo can run anywhere:

    python3 relay/cascade_relay.py --demo --speed 1.0

In production, replace DemoPlatformObserver with a real platform adapter that
implements PlatformObserver.events().
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import dataclasses
import datetime as dt
import hashlib
import json
import signal
import struct
from collections.abc import AsyncIterator
from typing import Literal, Protocol

RoomId = Literal["war", "forensics", "carrier", "regulatory", "quantification"]
AgentId = Literal[
    "triage",
    "forensics",
    "regulatory",
    "hipaa",
    "ccpa",
    "sec",
    "gdpr",
    "adversary",
    "bi",
    "partner",
]
Severity = Literal["normal", "success", "warning", "critical"]
Card = Literal["policy", "regulatory", "forensics", "adversary", "bi", "approval", "briefing"]
Delivery = Literal["mention", "room", "delegation", "approval"]


@dataclasses.dataclass(frozen=True)
class AuditTrail:
    room_id: str
    sender_id: str
    delivery: Delivery


@dataclasses.dataclass(frozen=True)
class RelayRoomEvent:
    sequence: int
    incident_id: str
    platform_message_id: str
    occurred_at: str
    elapsed_seconds: float
    room: RoomId
    agent: AgentId
    agent_handle: str
    framework: str
    title: str
    body: str
    mentions: tuple[AgentId, ...] = ()
    severity: Severity = "normal"
    card: Card | None = None
    privileged: bool = False
    audit_trail: AuditTrail | None = None

    def to_wire(self) -> dict[str, object]:
        payload: dict[str, object] = {
            "messageType": "room_event",
            "sequence": self.sequence,
            "incidentId": self.incident_id,
            "platformMessageId": self.platform_message_id,
            "occurredAt": self.occurred_at,
            "elapsedSeconds": self.elapsed_seconds,
            "room": self.room,
            "agent": self.agent,
            "agentHandle": self.agent_handle,
            "framework": self.framework,
            "title": self.title,
            "body": self.body,
            "mentions": list(self.mentions),
            "severity": self.severity,
            "privileged": self.privileged,
        }
        if self.card is not None:
            payload["card"] = self.card
        if self.audit_trail is not None:
            payload["auditTrail"] = {
                "roomId": self.audit_trail.room_id,
                "senderId": self.audit_trail.sender_id,
                "delivery": self.audit_trail.delivery,
            }
        return payload


class PlatformObserver(Protocol):
    async def events(self) -> AsyncIterator[RelayRoomEvent]:
        """Yield normalized room events from the multi-agent platform."""


class DemoPlatformObserver:
    def __init__(self, incident_id: str, speed: float) -> None:
        self.incident_id = incident_id
        self.speed = max(speed, 0.05)

    async def events(self) -> AsyncIterator[RelayRoomEvent]:
        started = dt.datetime.now(dt.UTC)
        previous_at = 0.0
        for sequence, template in enumerate(DEMO_EVENTS, start=1):
            event_at = float(template["elapsed_seconds"])
            await asyncio.sleep(max(0.0, event_at - previous_at) / self.speed)
            previous_at = event_at
            occurred_at = started + dt.timedelta(seconds=event_at)
            yield RelayRoomEvent(
                sequence=sequence,
                incident_id=self.incident_id,
                occurred_at=occurred_at.isoformat(),
                platform_message_id=f"{self.incident_id}:{sequence:04d}",
                elapsed_seconds=event_at,
                room=template["room"],
                agent=template["agent"],
                agent_handle=template["agent_handle"],
                framework=template["framework"],
                title=template["title"],
                body=template["body"],
                mentions=tuple(template.get("mentions", ())),
                severity=template.get("severity", "normal"),
                card=template.get("card"),
                privileged=template.get("privileged", False),
                audit_trail=AuditTrail(
                    room_id=template["room"],
                    sender_id=template["agent_handle"],
                    delivery=template.get("delivery", "room"),
                ),
            )


class WebSocketHub:
    def __init__(self) -> None:
        self._clients: set[asyncio.StreamWriter] = set()
        self._lock = asyncio.Lock()

    async def serve_client(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        try:
            headers = await self._read_headers(reader)
            websocket_key = headers.get("sec-websocket-key")
            if websocket_key is None:
                writer.close()
                await writer.wait_closed()
                return

            writer.write(self._handshake_response(websocket_key))
            await writer.drain()

            async with self._lock:
                self._clients.add(writer)

            while not reader.at_eof():
                await asyncio.sleep(30)
        finally:
            async with self._lock:
                self._clients.discard(writer)
            writer.close()
            await writer.wait_closed()

    async def broadcast(self, payload: dict[str, object]) -> None:
        message = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        frame = self._text_frame(message)
        async with self._lock:
            clients = list(self._clients)
        for writer in clients:
            try:
                writer.write(frame)
                await writer.drain()
            except (ConnectionError, RuntimeError):
                async with self._lock:
                    self._clients.discard(writer)

    async def heartbeat(self, incident_id: str) -> None:
        while True:
            await asyncio.sleep(15)
            await self.broadcast(
                {
                    "messageType": "heartbeat",
                    "incidentId": incident_id,
                    "generatedAt": dt.datetime.now(dt.UTC).isoformat(),
                }
            )

    @staticmethod
    async def _read_headers(reader: asyncio.StreamReader) -> dict[str, str]:
        raw = await reader.readuntil(b"\r\n\r\n")
        lines = raw.decode("latin1").split("\r\n")
        headers: dict[str, str] = {}
        for line in lines[1:]:
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            headers[key.strip().lower()] = value.strip()
        return headers

    @staticmethod
    def _handshake_response(websocket_key: str) -> bytes:
        accept_source = websocket_key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
        accept = base64.b64encode(hashlib.sha1(accept_source.encode("ascii")).digest()).decode("ascii")
        return (
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {accept}\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "\r\n"
        ).encode("ascii")

    @staticmethod
    def _text_frame(message: bytes) -> bytes:
        length = len(message)
        if length < 126:
            header = struct.pack("!BB", 0x81, length)
        elif length < 65536:
            header = struct.pack("!BBH", 0x81, 126, length)
        else:
            header = struct.pack("!BBQ", 0x81, 127, length)
        return header + message


async def run_relay(host: str, port: int, observer: PlatformObserver, incident_id: str) -> None:
    hub = WebSocketHub()
    server = await asyncio.start_server(hub.serve_client, host, port)
    heartbeat_task = asyncio.create_task(hub.heartbeat(incident_id))

    print(f"Cascade relay listening on ws://{host}:{port}/rooms/{incident_id}")
    print("Set NEXT_PUBLIC_CASCADE_RELAY_WS to that URL before running the dashboard.")

    async def publish_events() -> None:
        async for event in observer.events():
            print(f"[{event.sequence:02d}] {event.room} {event.agent_handle}: {event.title}")
            await hub.broadcast(event.to_wire())

    publisher_task = asyncio.create_task(publish_events())
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for signame in {"SIGINT", "SIGTERM"}:
        loop.add_signal_handler(getattr(signal, signame), stop.set)

    async with server:
        await asyncio.wait({asyncio.create_task(stop.wait()), publisher_task}, return_when=asyncio.FIRST_COMPLETED)

    heartbeat_task.cancel()
    publisher_task.cancel()


DEMO_EVENTS: tuple[dict[str, object], ...] = (
    {
        "elapsed_seconds": 0,
        "room": "war",
        "agent": "partner",
        "agent_handle": "@human/partner",
        "framework": "Licensed attorney gate",
        "title": "Initial notification captured",
        "body": '"Hey, we think we have ransomware. Servers are encrypted. There is a note."',
        "severity": "critical",
        "privileged": True,
        "delivery": "room",
    },
    {
        "elapsed_seconds": 15,
        "room": "war",
        "agent": "triage",
        "agent_handle": "@cascade/triage",
        "framework": "CrewAI",
        "title": "Policy terms extracted",
        "body": "$5M aggregate limit, $250K retention, panel IR required, social engineering exclusion flagged.",
        "severity": "warning",
        "card": "policy",
        "mentions": ("adversary",),
        "privileged": True,
        "delivery": "mention",
    },
    {
        "elapsed_seconds": 25,
        "room": "regulatory",
        "agent": "hipaa",
        "agent_handle": "@specialist/hipaa-baa",
        "framework": "Pydantic AI",
        "title": "HIPAA-BAA specialist recruited",
        "body": "Business Associate Agreement data likely implicated; covered-entity notice clock opened.",
        "severity": "critical",
        "privileged": True,
        "delivery": "delegation",
    },
    {
        "elapsed_seconds": 39,
        "room": "regulatory",
        "agent": "sec",
        "agent_handle": "@specialist/sec-8k",
        "framework": "Pydantic AI",
        "title": "SEC Item 1.05 monitor opened",
        "body": "Public issuer materiality assessment needs partner review; 8-K countdown is being tracked.",
        "severity": "critical",
        "privileged": True,
        "delivery": "delegation",
    },
    {
        "elapsed_seconds": 49,
        "room": "forensics",
        "agent": "forensics",
        "agent_handle": "@cascade/forensics",
        "framework": "LangGraph",
        "title": "Akira-pattern IOCs received",
        "body": "Panel IR agent posted ransom note family match, VPN edge logs, and suspicious PowerShell staging.",
        "severity": "warning",
        "card": "forensics",
        "delivery": "room",
    },
    {
        "elapsed_seconds": 96,
        "room": "war",
        "agent": "partner",
        "agent_handle": "@human/partner",
        "framework": "Licensed attorney gate",
        "title": "Human gate requires sign-off",
        "body": "Approve carrier notice, IR engagement letter, and regulatory preservation memo before external communication.",
        "severity": "critical",
        "card": "approval",
        "privileged": True,
        "delivery": "approval",
    },
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Cascade dashboard relay agent")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8765, type=int)
    parser.add_argument("--incident-id", default="cascade-demo")
    parser.add_argument("--speed", default=1.0, type=float, help="Demo replay multiplier")
    parser.add_argument("--demo", action="store_true", help="Replay built-in demo events")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.demo:
        raise SystemExit("Only --demo observer is implemented in this reference. Plug in a real PlatformObserver for production.")
    observer = DemoPlatformObserver(incident_id=args.incident_id, speed=args.speed)
    asyncio.run(run_relay(args.host, args.port, observer, args.incident_id))


if __name__ == "__main__":
    main()
