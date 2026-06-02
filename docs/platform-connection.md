# Dashboard to Platform Connection

Cascade defaults to a relay-agent connection model for portability. The Next.js dashboard observes room activity over a WebSocket served by a Python observer agent, while the observer agent silently participates in every Cascade room and translates platform-native events into the dashboard protocol.

## Chosen option: relay agent

The platform might eventually expose a first-party observer API, but the relay-agent pattern works even when room events are only available to participants. It also keeps the dashboard non-agent and read-only.

```text
Multi-agent platform rooms
  -> silent Python observer agent
  -> normalized Cascade relay protocol
  -> WebSocket
  -> Next.js dashboard renderer
```

The dashboard reads `NEXT_PUBLIC_CASCADE_RELAY_WS`. If the variable is absent, or if the socket is unavailable, the dashboard falls back to the deterministic script used for recording. This keeps the demo reliable without changing the production integration path.

Example local relay run:

```bash
python3 relay/cascade_relay.py --demo --speed 8
NEXT_PUBLIC_CASCADE_RELAY_WS=ws://127.0.0.1:8765/rooms/cascade-demo npm run dev
```

## Relay protocol

Every outbound room event is JSON with a stable envelope:

```json
{
  "messageType": "room_event",
  "sequence": 25,
  "incidentId": "cascade-demo",
  "platformMessageId": "platform-msg-uuid",
  "occurredAt": "2026-06-02T05:10:00Z",
  "elapsedSeconds": 39,
  "room": "regulatory",
  "agent": "sec",
  "agentHandle": "@specialist/sec-8k",
  "framework": "Pydantic AI",
  "title": "SEC Item 1.05 monitor opened",
  "body": "Public issuer materiality assessment needs partner review.",
  "mentions": ["partner"],
  "severity": "critical",
  "privileged": true,
  "auditTrail": {
    "roomId": "regulatory",
    "senderId": "@specialist/sec-8k",
    "delivery": "mention"
  }
}
```

Supported message types:

- `room_event`: append one typed room activity event.
- `snapshot`: replace dashboard live events with the relay's current room-state snapshot.
- `heartbeat`: keepalive; ignored by the renderer except for connection health.

## Production adapter seam

`relay/cascade_relay.py` defines a `PlatformObserver` protocol:

```python
class PlatformObserver(Protocol):
    async def events(self) -> AsyncIterator[RelayRoomEvent]: ...
```

A production adapter should:

1. Register the observer agent with a persistent platform identity, for example `@cascade/dashboard-observer`.
2. Join the observer to each room with read-only permissions.
3. Subscribe to message, mention, join, delegation, and approval events.
4. Preserve platform IDs, timestamps, room IDs, mentioned agents, and audit metadata.
5. Emit only metadata/content the dashboard is authorized to display for the current user.

## Platform requirements

Cascade assumes the underlying platform supports:

1. Cross-framework agents: LangGraph, CrewAI, Pydantic AI, and direct SDK agents interoperating in shared rooms.
2. Persistent agent identity: stable handles/UUIDs registered once and addressable anywhere.
3. Chat rooms with @mention routing: surgical delivery to specifically mentioned agents, not only broadcast.
4. Multi-room participation: one agent definition can execute in multiple rooms with isolated context.
5. Dynamic agent discovery: registry queries by tags/description and runtime recruitment into rooms.
6. Cross-org permissions: agents owned by different users can connect through contact/permission primitives.
7. Audit trail: every message, mention, delegation, room join, and approval is timestamped for compliance.
8. Human-in-the-loop primitives: humans are first-class room members and can approve/reject actions.
9. WebSocket real-time events: the relay or first-party observer API can stream live activity to the dashboard.
