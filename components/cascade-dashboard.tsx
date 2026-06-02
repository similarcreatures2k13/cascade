"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Flame,
  Gavel,
  Pause,
  Play,
  RadioTower,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TimerReset,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import {
  agents,
  approvalItems,
  clientProfile,
  demoEvents,
  DEMO_DURATION_SECONDS,
  notificationClocks,
  rooms,
  type DemoEvent,
  type RoomId,
} from "@/lib/cascade-script";
import { parseRelayMessage, relayEventToDemoEvent, type RelayConnectionStatus } from "@/lib/relay-protocol";
import { cn, formatCountdown, formatCurrency, formatIncidentTime } from "@/lib/utils";
import { useDemoStore } from "@/store/use-demo-store";

const roomOrder: RoomId[] = ["war", "regulatory", "forensics", "quantification", "carrier"];

function severityClasses(severity: DemoEvent["severity"]) {
  switch (severity) {
    case "critical":
      return "border-[#ff3b5c]/55 bg-[#ff3b5c]/10 text-[#ffb3c0]";
    case "warning":
      return "border-amber-300/45 bg-amber-300/10 text-amber-100";
    case "success":
      return "border-[#00ff9f]/45 bg-[#00ff9f]/10 text-[#caffea]";
    default:
      return "border-white/10 bg-white/[0.04] text-zinc-200";
  }
}

function activeRoomForEvents(events: DemoEvent[]): RoomId {
  return events.at(-1)?.room ?? "war";
}

function biLoss(elapsed: number) {
  if (elapsed < 45) return 0;
  const seconds = elapsed - 45;
  return 240000 + seconds * 21650 + Math.max(0, elapsed - 78) * 9800;
}

function recruitedSpecialists(elapsed: number) {
  return [
    { id: "hipaa", label: "HIPAA-BAA", at: 25 },
    { id: "ccpa", label: "CCPA", at: 32 },
    { id: "sec", label: "SEC 8-K", at: 39 },
    { id: "gdpr", label: "GDPR", at: 43 },
  ].filter((specialist) => elapsed >= specialist.at);
}

export function CascadeDashboard() {
  const elapsed = useDemoStore((state) => state.elapsed);
  const isPlaying = useDemoStore((state) => state.isPlaying);
  const liveEvents = useDemoStore((state) => state.liveEvents);
  const relayStatus = useDemoStore((state) => state.relayStatus);
  const setElapsed = useDemoStore((state) => state.setElapsed);
  const togglePlaying = useDemoStore((state) => state.togglePlaying);
  const reset = useDemoStore((state) => state.reset);

  useRelaySubscription();

  useEffect(() => {
    if (!isPlaying || elapsed >= DEMO_DURATION_SECONDS) return;

    const startedAt = performance.now();
    const initialElapsed = elapsed;
    const interval = window.setInterval(() => {
      const next = initialElapsed + (performance.now() - startedAt) / 1000;
      setElapsed(next);
    }, 120);

    return () => window.clearInterval(interval);
  }, [elapsed, isPlaying, setElapsed]);

  const scriptedEvents = useMemo(() => demoEvents.filter((event) => elapsed >= event.at), [elapsed]);
  const visibleEvents = liveEvents.length > 0 ? liveEvents : scriptedEvents;
  const activeRoom = activeRoomForEvents(visibleEvents);
  const activeEvents = visibleEvents.filter((event) => event.room === activeRoom).slice(-5);
  const latestEvent = visibleEvents.at(-1);
  const approvalActive = elapsed >= 96;
  const briefingReady = elapsed >= 112;
  const specialists = recruitedSpecialists(elapsed);
  const biValue = biLoss(elapsed);

  return (
    <main className="scanline flex h-screen w-screen flex-col overflow-hidden bg-[#0a0a0a] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(0,255,159,0.14),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(0,224,192,0.12),transparent_26%),linear-gradient(135deg,#0a0a0a,#111111_46%,#070707)]" />
      <TopBar elapsed={elapsed} relayStatus={relayStatus} liveEventCount={liveEvents.length} />

      <section className="relative z-10 grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)_320px]">
        <LeftRail elapsed={elapsed} activeRoom={activeRoom} visibleEvents={visibleEvents} />

        <section className="min-h-0 border-x border-white/10 bg-black/18 p-4">
          <div className="flex h-full min-h-0 flex-col rounded-3xl border border-white/10 bg-[#0d0f0f]/82 shadow-2xl shadow-black/50">
            <RoomHeader activeRoom={activeRoom} latestEvent={latestEvent} specialists={specialists.length} />

            <div className="min-h-0 flex-1 space-y-3 overflow-hidden p-4">
              <AnimatePresence mode="popLayout">
                {activeEvents.map((event) => (
                  <Message key={event.id} event={event} />
                ))}
              </AnimatePresence>

              <StructuredCards elapsed={elapsed} />
            </div>
          </div>
        </section>

        <RightRail elapsed={elapsed} biValue={biValue} approvalActive={approvalActive} briefingReady={briefingReady} />
      </section>

      <ApprovalBar
        approvalActive={approvalActive}
        briefingReady={briefingReady}
        isPlaying={isPlaying}
        onToggle={togglePlaying}
        onReset={reset}
      />
    </main>
  );
}


function useRelaySubscription() {
  const ingestRelayEvent = useDemoStore((state) => state.ingestRelayEvent);
  const replaceLiveEvents = useDemoStore((state) => state.replaceLiveEvents);
  const setRelayStatus = useDemoStore((state) => state.setRelayStatus);
  const relayUrl =
    process.env.NEXT_PUBLIC_CASCADE_RELAY_WS ??
    (process.env.NODE_ENV === "development" ? "ws://localhost:8765/rooms/cascade-demo" : "");

  useEffect(() => {
    if (!relayUrl || typeof WebSocket === "undefined") {
      setRelayStatus("scripted");
      return;
    }

    let closedByComponent = false;
    const socket = new WebSocket(relayUrl);
    setRelayStatus("connecting");

    socket.addEventListener("open", () => setRelayStatus("live"));
    socket.addEventListener("message", (message) => {
      if (typeof message.data !== "string") return;

      const parsed = parseRelayMessage(message.data);
      if (!parsed || parsed.messageType === "heartbeat") return;

      const currentElapsed = useDemoStore.getState().elapsed;

      if (parsed.messageType === "snapshot") {
        replaceLiveEvents(parsed.events.map((event) => relayEventToDemoEvent(event, event.elapsedSeconds ?? currentElapsed)));
        return;
      }

      ingestRelayEvent(relayEventToDemoEvent(parsed, parsed.elapsedSeconds ?? currentElapsed));
    });
    socket.addEventListener("error", () => setRelayStatus("degraded"));
    socket.addEventListener("close", () => {
      if (!closedByComponent) setRelayStatus("degraded");
    });

    return () => {
      closedByComponent = true;
      socket.close();
    };
  }, [ingestRelayEvent, relayUrl, replaceLiveEvents, setRelayStatus]);
}

function TopBar({
  elapsed,
  relayStatus,
  liveEventCount,
}: {
  elapsed: number;
  relayStatus: RelayConnectionStatus;
  liveEventCount: number;
}) {
  return (
    <header className="relative z-10 grid h-[60px] grid-cols-[240px_minmax(0,1fr)_320px] border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="flex items-center gap-2 border-r border-white/10 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#00ff9f]/40 bg-[#00ff9f]/10 text-[#00ff9f]">
          <RadioTower size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide">Cascade</p>
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Multi-agent IR</p>
        </div>
      </div>

      <div className="flex items-center justify-between px-5">
        <div className="font-mono text-4xl font-semibold tabular-nums tracking-[-0.06em] text-[#00ff9f] drop-shadow-[0_0_18px_rgba(0,255,159,0.35)]">
          {formatIncidentTime(elapsed)}
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-zinc-200">
            <Building2 size={13} /> {clientProfile.name}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ff3b5c]/45 bg-[#ff3b5c]/10 px-3 py-1 text-xs font-semibold text-[#ffb3c0]">
            <Flame size={13} /> Severity 1 - Ransomware
          </span>
          <RelayStatusPill status={relayStatus} liveEventCount={liveEventCount} />
        </div>
      </div>

      <div className="flex items-center justify-center border-l border-[#00ff9f]/20 bg-[#00ff9f]/8 px-4 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#b8ffe6]">
        Attorney work product - privileged
      </div>
    </header>
  );
}

function RelayStatusPill({ status, liveEventCount }: { status: RelayConnectionStatus; liveEventCount: number }) {
  const label =
    status === "live"
      ? `Relay live - ${liveEventCount} events`
      : status === "connecting"
        ? "Connecting relay"
        : status === "degraded"
          ? "Relay offline - scripted fallback"
          : "Scripted fallback";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        status === "live" && "border-[#00ff9f]/45 bg-[#00ff9f]/10 text-[#caffea]",
        status === "connecting" && "border-[#00e0c0]/35 bg-[#00e0c0]/10 text-[#a8fff1]",
        status === "degraded" && "border-amber-300/45 bg-amber-300/10 text-amber-100",
        status === "scripted" && "border-white/10 bg-white/[0.05] text-zinc-300",
      )}
    >
      <RadioTower size={13} />
      {label}
    </span>
  );
}

function LeftRail({
  elapsed,
  activeRoom,
  visibleEvents,
}: {
  elapsed: number;
  activeRoom: RoomId;
  visibleEvents: DemoEvent[];
}) {
  return (
    <aside className="min-h-0 border-r border-white/10 bg-black/48 p-3">
      <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Fictional client</p>
        <p className="mt-1 text-sm font-semibold">{clientProfile.sector}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">{clientProfile.anchor}</p>
      </div>

      <div className="space-y-2">
        {roomOrder.map((roomId) => {
          const room = rooms.find((candidate) => candidate.id === roomId)!;
          const unread = visibleEvents.filter((event) => event.room === roomId).length;
          const isActive = activeRoom === roomId;
          const hasLiveAgent = visibleEvents.some((event) => event.room === roomId && elapsed >= event.at && elapsed - event.at < 18);

          return (
            <motion.div
              key={room.id}
              layout
              className={cn(
                "rounded-2xl border p-3 transition",
                isActive
                  ? "border-[#00ff9f]/45 bg-[#00ff9f]/10 shadow-[0_0_24px_rgba(0,255,159,0.12)]"
                  : "border-white/10 bg-white/[0.03]",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", hasLiveAgent ? "bg-[#00ff9f] shadow-[0_0_12px_#00ff9f]" : "bg-zinc-600")} />
                  <p className="text-sm font-medium">{room.name}</p>
                </div>
                {unread > 0 && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-zinc-200">{unread}</span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">{room.description}</p>
              <p className={cn("mt-2 text-[10px] uppercase tracking-[0.18em]", room.privileged ? "text-[#00ff9f]" : "text-zinc-500")}>
                {room.privileged ? "Privileged context" : "External boundary"}
              </p>
            </motion.div>
          );
        })}
      </div>
    </aside>
  );
}

function RoomHeader({ activeRoom, latestEvent, specialists }: { activeRoom: RoomId; latestEvent?: DemoEvent; specialists: number }) {
  const room = rooms.find((candidate) => candidate.id === activeRoom)!;

  return (
    <div className="flex h-[74px] items-center justify-between border-b border-white/10 px-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{room.name}</h1>
          {room.privileged && (
            <span className="rounded-full border border-[#00ff9f]/30 bg-[#00ff9f]/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[#b8ffe6]">
              Privileged
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-400">{latestEvent?.title ?? "Waiting for intake"}</p>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-zinc-300">
          <BrainCircuit size={14} /> {specialists} specialists recruited
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#00e0c0]/25 bg-[#00e0c0]/8 px-3 py-1 text-[#a8fff1]">
          <Sparkles size={14} /> deterministic replay
        </span>
      </div>
    </div>
  );
}

function Message({ event }: { event: DemoEvent }) {
  const agent = agents[event.agent];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28 }}
      className={cn("rounded-2xl border p-3", severityClasses(event.severity))}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/30" style={{ color: agent.color }}>
            {event.agent === "partner" ? <Gavel size={15} /> : <Bot size={15} />}
          </span>
          <div>
            <p className="text-sm font-semibold" style={{ color: agent.color }}>
              {agent.handle}
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{agent.framework}</p>
          </div>
        </div>
        <time className="font-mono text-[11px] text-zinc-500">{formatIncidentTime(event.at)}</time>
      </div>
      <h2 className="text-sm font-semibold text-white">{event.title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-zinc-300">{event.body}</p>
    </motion.article>
  );
}

function StructuredCards({ elapsed }: { elapsed: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {elapsed >= 15 && (
        <InfoCard
          icon={<FileCheck2 size={16} />}
          title="Parsed cyber policy"
          tone="warning"
          rows={["Aggregate limit: $5,000,000", "Retention: $250,000", "Panel IR required", "Coverage risk: social engineering exclusion"]}
        />
      )}
      {elapsed >= 43 && (
        <InfoCard
          icon={<ShieldAlert size={16} />}
          title="Triggered regimes"
          tone="critical"
          rows={["HIPAA BAA - healthcare data", "CCPA - California residents", "SEC Item 1.05 - public issuer", "GDPR - Ireland/EU patient records"]}
        />
      )}
      {elapsed >= 49 && (
        <InfoCard
          icon={<TimerReset size={16} />}
          title="Akira IOC packet"
          tone="normal"
          rows={["VPN edge anomaly", "PowerShell staging host", "Encrypted VM estate", "Possible exfiltration path pending"]}
        />
      )}
      {elapsed >= 67 && (
        <InfoCard
          icon={<AlertTriangle size={16} />}
          title="Carrier dispute memo"
          tone="critical"
          rows={["Patch latency: 14 days", "Betterment challenge likely", "BI restoration period dispute", "Preserve change tickets now"]}
        />
      )}
    </div>
  );
}

function InfoCard({ icon, title, rows, tone }: { icon: React.ReactNode; title: string; rows: string[]; tone: "normal" | "warning" | "critical" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border bg-black/28 p-3",
        tone === "critical" && "border-[#ff3b5c]/35",
        tone === "warning" && "border-amber-300/35",
        tone === "normal" && "border-[#00e0c0]/25",
      )}
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className={cn(tone === "critical" && "text-[#ff8ba0]", tone === "warning" && "text-amber-200", tone === "normal" && "text-[#a8fff1]")}>{icon}</span>
        {title}
      </div>
      <ul className="space-y-1 text-xs text-zinc-400">
        {rows.map((row) => (
          <li key={row} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
            {row}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function RightRail({
  elapsed,
  biValue,
  approvalActive,
  briefingReady,
}: {
  elapsed: number;
  biValue: number;
  approvalActive: boolean;
  briefingReady: boolean;
}) {
  return (
    <aside className="min-h-0 space-y-3 border-l border-white/10 bg-black/48 p-3">
      <Panel title="Coverage status" icon={<ShieldCheck size={15} />}>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Metric label="Limit" value="$5.0M" />
          <Metric label="Retention" value="$250K" />
          <Metric label="Panel IR" value={elapsed >= 96 ? "Ready" : "Pending"} />
          <Metric label="Exclusion" value="Flagged" danger />
        </div>
      </Panel>

      <Panel title="Notification clocks" icon={<Clock3 size={15} />}>
        <div className="space-y-2">
          {notificationClocks.map((clock) => {
            const remaining = clock.totalSeconds - Math.max(0, elapsed - clock.startsAt);
            const active = elapsed >= clock.startsAt;

            return (
              <div key={clock.label} className="rounded-xl border border-white/10 bg-white/[0.035] p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-zinc-300">{clock.label}</p>
                  <span className={cn("h-2 w-2 rounded-full", active ? "bg-[#00ff9f] shadow-[0_0_10px_#00ff9f]" : "bg-zinc-700")} />
                </div>
                <p className={cn("mt-1 font-mono text-lg tabular-nums", clock.tone === "critical" ? "text-[#ff8ba0]" : clock.tone === "warning" ? "text-amber-200" : "text-[#b8ffe6]")}>
                  {active ? formatCountdown(remaining) : "--:--:--"}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="BI loss counter" icon={<BadgeCheck size={15} />}>
        <p className="font-mono text-3xl font-semibold tabular-nums text-[#00ff9f] drop-shadow-[0_0_16px_rgba(0,255,159,0.28)]">
          {formatCurrency(biValue)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">Lost revenue + mitigation labor + extra expense captured live.</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#00ff9f] to-[#00e0c0]"
            animate={{ width: `${Math.min(100, (elapsed / DEMO_DURATION_SECONDS) * 100)}%` }}
          />
        </div>
      </Panel>

      <Panel title="Awaiting approval" icon={<UsersRound size={15} />}>
        <div className="space-y-2">
          {approvalItems.map((item, index) => (
            <div key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-2 text-xs">
              {briefingReady || (approvalActive && index === 0) ? (
                <CheckCircle2 className="text-[#00ff9f]" size={15} />
              ) : (
                <Clock3 className="text-zinc-500" size={15} />
              )}
              <span className={cn(briefingReady || (approvalActive && index === 0) ? "text-zinc-200" : "text-zinc-500")}>{item}</span>
            </div>
          ))}
        </div>
      </Panel>
    </aside>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-xl shadow-black/30">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
        <span className="text-[#00e0c0]">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/24 p-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className={cn("mt-1 font-mono text-sm", danger ? "text-[#ff8ba0]" : "text-zinc-100")}>{value}</p>
    </div>
  );
}

function ApprovalBar({
  approvalActive,
  briefingReady,
  isPlaying,
  onToggle,
  onReset,
}: {
  approvalActive: boolean;
  briefingReady: boolean;
  isPlaying: boolean;
  onToggle: () => void;
  onReset: () => void;
}) {
  return (
    <footer className="relative z-10 flex h-[80px] items-center justify-between border-t border-white/10 bg-black/78 px-5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <motion.div
          animate={approvalActive && !briefingReady ? { scale: [1, 1.08, 1], boxShadow: ["0 0 0 rgba(0,255,159,0)", "0 0 28px rgba(0,255,159,0.38)", "0 0 0 rgba(0,255,159,0)"] } : {}}
          transition={{ duration: 1.1, repeat: approvalActive && !briefingReady ? Infinity : 0 }}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#00ff9f]/40 bg-[#00ff9f]/12 text-[#00ff9f]"
        >
          <Gavel size={19} />
        </motion.div>
        <div>
          <p className="text-sm font-semibold">{briefingReady ? "Partner-approved briefing packet ready" : approvalActive ? "Human approval gate pulsing" : "Human gate armed"}</p>
          <p className="text-xs text-zinc-500">Licensed-attorney sign-off required before external communications leave privileged context.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-zinc-200 transition hover:border-[#00ff9f]/40 hover:text-white"
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          {isPlaying ? "Pause replay" : "Resume replay"}
        </button>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-zinc-200 transition hover:border-[#00e0c0]/40 hover:text-white"
        >
          <RotateCcw size={15} />
          Reset
        </button>
      </div>
    </footer>
  );
}
