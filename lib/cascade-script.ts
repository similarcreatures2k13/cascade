export type RoomId = "war" | "forensics" | "carrier" | "regulatory" | "quantification";
export type AgentId =
  | "triage"
  | "forensics"
  | "regulatory"
  | "hipaa"
  | "ccpa"
  | "sec"
  | "gdpr"
  | "adversary"
  | "bi"
  | "partner";

export type DemoEvent = {
  id: string;
  at: number;
  room: RoomId;
  agent: AgentId;
  title: string;
  body: string;
  card?: "policy" | "regulatory" | "forensics" | "adversary" | "bi" | "approval" | "briefing";
  severity?: "normal" | "success" | "warning" | "critical";
};

export const DEMO_DURATION_SECONDS = 120;

export const clientProfile = {
  name: "Meridian Health Analytics",
  employees: 400,
  sector: "Healthcare SaaS",
  status: "Recently IPO'd",
  ransomware: "Akira",
  anchor: "Phase 3 oncology trial enrollment closes in 96 hours",
};

export const rooms: Array<{ id: RoomId; name: string; privileged: boolean; description: string }> = [
  { id: "war", name: "War Room", privileged: true, description: "Breach coach, triage, forensics, adversary" },
  { id: "forensics", name: "Forensics Room", privileged: false, description: "Cross-org IOC exchange with panel IR firm" },
  { id: "carrier", name: "Carrier Room", privileged: false, description: "Non-privileged adjuster communications" },
  { id: "regulatory", name: "Regulatory Room", privileged: true, description: "Dynamic specialist recruitment" },
  { id: "quantification", name: "Quantification Room", privileged: true, description: "BI claim math and forensic accounting" },
];

export const agents: Record<AgentId, { name: string; handle: string; framework: string; color: string }> = {
  triage: { name: "Triage Agent", handle: "@cascade/triage", framework: "CrewAI", color: "#00ff9f" },
  forensics: { name: "Forensics Liaison", handle: "@cascade/forensics", framework: "LangGraph", color: "#00e0c0" },
  regulatory: { name: "Regulatory Coordinator", handle: "@cascade/regulatory", framework: "LangGraph", color: "#7c5cff" },
  hipaa: { name: "HIPAA-BAA Specialist", handle: "@specialist/hipaa-baa", framework: "Pydantic AI", color: "#2dd4bf" },
  ccpa: { name: "CCPA Specialist", handle: "@specialist/ccpa", framework: "Pydantic AI", color: "#38bdf8" },
  sec: { name: "SEC 8-K Specialist", handle: "@specialist/sec-8k", framework: "Pydantic AI", color: "#facc15" },
  gdpr: { name: "GDPR Specialist", handle: "@specialist/gdpr", framework: "Pydantic AI", color: "#fb7185" },
  adversary: { name: "Adversary / Carrier Perspective", handle: "@cascade/adversary", framework: "Anthropic SDK - Claude Sonnet 4", color: "#ff3b5c" },
  bi: { name: "BI Quantification", handle: "@cascade/bi", framework: "Pydantic AI", color: "#34d399" },
  partner: { name: "Breach Coach Partner", handle: "@human/partner", framework: "Licensed attorney gate", color: "#ffffff" },
};

export const demoEvents: DemoEvent[] = [
  {
    id: "slack",
    at: 0,
    room: "war",
    agent: "partner",
    title: "Initial notification captured",
    body: '"Hey, we think we have ransomware. Servers are encrypted. There is a note."',
    severity: "critical",
  },
  {
    id: "triage-start",
    at: 5,
    room: "war",
    agent: "triage",
    title: "Incident frame opened",
    body: "CrewAI triage persona parsed the intake, identified cyber policy packet, and started carrier-panel routing.",
    severity: "normal",
  },
  {
    id: "policy",
    at: 15,
    room: "war",
    agent: "triage",
    title: "Policy terms extracted",
    body: "$5M aggregate limit, $250K retention, panel IR required, social engineering exclusion flagged for later coverage dispute.",
    card: "policy",
    severity: "warning",
  },
  {
    id: "reg-start",
    at: 18,
    room: "regulatory",
    agent: "regulatory",
    title: "Regulatory graph activated",
    body: "LangGraph coordinator branched on sector, public-company status, affected geographies, and data classes.",
    severity: "normal",
  },
  {
    id: "hipaa",
    at: 25,
    room: "regulatory",
    agent: "hipaa",
    title: "HIPAA-BAA specialist recruited",
    body: "Business Associate Agreement data likely implicated. Covered-entity notice clock opened and evidence preservation checklist attached.",
    severity: "critical",
  },
  {
    id: "ccpa",
    at: 32,
    room: "regulatory",
    agent: "ccpa",
    title: "California trigger discovered",
    body: "California HQ and resident records route to Cal Civ Code 1798.82 analysis. Draft consumer-notice facts requested.",
    severity: "warning",
  },
  {
    id: "sec",
    at: 39,
    room: "regulatory",
    agent: "sec",
    title: "SEC Item 1.05 monitor opened",
    body: "Recently public issuer: materiality assessment needs partner review; 8-K countdown waits on board-level determination.",
    severity: "critical",
  },
  {
    id: "gdpr",
    at: 43,
    room: "regulatory",
    agent: "gdpr",
    title: "Ireland/EU data path added",
    body: "Irish subsidiary processing EU patient records triggers GDPR supervisory-authority workflow and DPA evidence questions.",
    card: "regulatory",
    severity: "critical",
  },
  {
    id: "akira",
    at: 49,
    room: "forensics",
    agent: "forensics",
    title: "Akira-pattern IOCs received",
    body: "Panel IR agent posted ransom note family match, encrypted VM estate, VPN edge logs, and suspicious PowerShell staging.",
    card: "forensics",
    severity: "warning",
  },
  {
    id: "adversary",
    at: 67,
    room: "war",
    agent: "adversary",
    title: "Carrier-position warning",
    body: "Expect betterment and patch-latency arguments: CVE patch available 14 days before encryption; preserve change tickets now.",
    card: "adversary",
    severity: "critical",
  },
  {
    id: "bi",
    at: 78,
    room: "quantification",
    agent: "bi",
    title: "BI counter attached to incident frame",
    body: "Lost trial-enrollment revenue, mitigation labor, extra expense, and period-of-restoration assumptions are being captured contemporaneously.",
    card: "bi",
    severity: "success",
  },
  {
    id: "approval",
    at: 96,
    room: "war",
    agent: "partner",
    title: "Human gate requires sign-off",
    body: "Approve initial carrier notice, IR engagement letter, and regulatory preservation memo before any external communication leaves privilege.",
    card: "approval",
    severity: "critical",
  },
  {
    id: "briefing",
    at: 112,
    room: "war",
    agent: "regulatory",
    title: "Privilege-marked briefing packet ready",
    body: "Decision memo compiled with policy extract, obligations matrix, Akira IOCs, BI snapshot, and coverage-risk adversary notes.",
    card: "briefing",
    severity: "success",
  },
];

export const notificationClocks = [
  { label: "HIPAA BAA covered-entity notice", totalSeconds: 72 * 3600, startsAt: 25, tone: "critical" as const },
  { label: "GDPR supervisory authority", totalSeconds: 72 * 3600, startsAt: 43, tone: "critical" as const },
  { label: "SEC 8-K materiality decision", totalSeconds: 4 * 24 * 3600, startsAt: 39, tone: "warning" as const },
  { label: "California resident notice", totalSeconds: 30 * 24 * 3600, startsAt: 32, tone: "normal" as const },
];

export const approvalItems = [
  "Panel IR engagement letter",
  "Initial carrier notice - non-privileged",
  "Regulatory preservation memo",
];
