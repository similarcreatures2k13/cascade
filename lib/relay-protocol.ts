import type { AgentId, DemoEvent, RoomId } from "@/lib/cascade-script";

export type RelayConnectionStatus = "scripted" | "connecting" | "live" | "degraded";

export type RelayRoomEvent = {
  messageType: "room_event";
  sequence: number;
  incidentId: string;
  platformMessageId: string;
  occurredAt: string;
  elapsedSeconds?: number;
  room: RoomId;
  agent: AgentId;
  agentHandle: string;
  framework: string;
  title: string;
  body: string;
  mentions?: AgentId[];
  severity?: DemoEvent["severity"];
  card?: DemoEvent["card"];
  privileged?: boolean;
  auditTrail?: {
    roomId: string;
    senderId: string;
    delivery: "mention" | "room" | "delegation" | "approval";
  };
};

export type RelaySnapshotMessage = {
  messageType: "snapshot";
  incidentId: string;
  generatedAt: string;
  events: RelayRoomEvent[];
};

export type RelayHeartbeatMessage = {
  messageType: "heartbeat";
  incidentId: string;
  generatedAt: string;
};

export type RelayMessage = RelayRoomEvent | RelaySnapshotMessage | RelayHeartbeatMessage;

const roomIds = new Set<RoomId>(["war", "forensics", "carrier", "regulatory", "quantification"]);
const agentIds = new Set<AgentId>(["triage", "forensics", "regulatory", "hipaa", "ccpa", "sec", "gdpr", "adversary", "bi", "partner"]);
const severities = new Set<DemoEvent["severity"]>(["normal", "success", "warning", "critical"]);
const cards = new Set<DemoEvent["card"]>(["policy", "regulatory", "forensics", "adversary", "bi", "approval", "briefing"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRoomId(value: unknown): value is RoomId {
  return typeof value === "string" && roomIds.has(value as RoomId);
}

function isAgentId(value: unknown): value is AgentId {
  return typeof value === "string" && agentIds.has(value as AgentId);
}

function isSeverity(value: unknown): value is DemoEvent["severity"] {
  return value === undefined || (typeof value === "string" && severities.has(value as DemoEvent["severity"]));
}

function isCard(value: unknown): value is DemoEvent["card"] {
  return value === undefined || (typeof value === "string" && cards.has(value as DemoEvent["card"]));
}

function isRelayRoomEvent(value: unknown): value is RelayRoomEvent {
  if (!isRecord(value)) return false;

  return (
    value.messageType === "room_event" &&
    typeof value.sequence === "number" &&
    typeof value.incidentId === "string" &&
    typeof value.platformMessageId === "string" &&
    typeof value.occurredAt === "string" &&
    (value.elapsedSeconds === undefined || typeof value.elapsedSeconds === "number") &&
    isRoomId(value.room) &&
    isAgentId(value.agent) &&
    typeof value.agentHandle === "string" &&
    typeof value.framework === "string" &&
    typeof value.title === "string" &&
    typeof value.body === "string" &&
    isSeverity(value.severity) &&
    isCard(value.card)
  );
}

export function parseRelayMessage(raw: string): RelayMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);

    if (isRelayRoomEvent(parsed)) return parsed;
    if (isRecord(parsed) && parsed.messageType === "heartbeat" && typeof parsed.incidentId === "string" && typeof parsed.generatedAt === "string") {
      return parsed as RelayHeartbeatMessage;
    }
    if (
      isRecord(parsed) &&
      parsed.messageType === "snapshot" &&
      typeof parsed.incidentId === "string" &&
      typeof parsed.generatedAt === "string" &&
      Array.isArray(parsed.events) &&
      parsed.events.every(isRelayRoomEvent)
    ) {
      return parsed as RelaySnapshotMessage;
    }
  } catch {
    return null;
  }

  return null;
}

export function relayEventToDemoEvent(event: RelayRoomEvent, fallbackElapsed: number): DemoEvent {
  return {
    id: event.platformMessageId,
    at: event.elapsedSeconds ?? fallbackElapsed,
    room: event.room,
    agent: event.agent,
    title: event.title,
    body: event.body,
    card: event.card,
    severity: event.severity,
  };
}
