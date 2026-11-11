/**
 * Payload produced by the LLM tool layer. Its shape depends on the action
 * (JSON string, object, array of rows...) and is narrowed by each consumer at
 * the point of use, so it stays a dynamic JSON value (the result type of
 * JSON.parse) rather than an arbitrary closed shape.
 */
export type AiActionPayload = ReturnType<typeof JSON.parse>;

export interface AiSystemAction {
  action: string;
  extracted_args?: AiActionPayload;
  database_data?: AiActionPayload;
}

export interface AiChatResponse {
  reply: string;
  system_actions: AiSystemAction[];
  tools_used?: string[];
  grounded?: boolean;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  hiddenContext?: string;
  actions?: AiSystemAction[];
  toolsUsed?: string[];
  grounded?: boolean;
  timestamp: Date;
}

export interface AgentPipelineStep {
  step: 'INTENT' | 'TOOL_EXECUTION' | 'SYNTHESIS' | 'COMPLETED' | 'ERROR';
  name: string;
  detail: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  duration_ms?: number;
}

export interface OrganizerAgentResponse {
  reply: string;
  pipeline_steps: AgentPipelineStep[];
  is_cached?: boolean;
  execution_time_ms?: number;
  actions?: AiSystemAction[];
}

export interface OrganizerChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  pipelineSteps?: AgentPipelineStep[];
  isCached?: boolean;
  executionTimeMs?: number;
  actions?: AiSystemAction[];
  timestamp: Date;
}


// AI foundation: response shapes (additive)
export interface AiSearchMatch {
  event_id: string;
  score: number;
}

export interface AiSearchEvent {
  id: string;
  title?: string;
  description?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
  locationName?: string;
  city?: string;
  ward?: string;
  address?: string;
  datesSummary?: string;
  minPrice?: number | null;
  relevanceScore?: number | null;
}

export interface AiSearchResponse {
  query: string;
  total: number;
  matches: AiSearchMatch[];
  events: AiSearchEvent[];
  search_mode?: 'vector' | 'keyword';
  degraded?: boolean;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskLayer = 'RULE' | 'SIGNAL' | 'AI';

export interface RiskEvidence {
  field: string;
  start?: number;
  end?: number;
  text: string;
}

export interface RiskReasonItem {
  layer: RiskLayer;
  code: string;
  severity?: string;
  weight: number;
  message: string;
  status?: 'not_assessed';
  evidence?: RiskEvidence[];
  confidence?: string;
  /** The organiser signals share one capped budget: this one was cut (its weight is what was actually counted). */
  capped?: boolean;
}

export interface RiskCoverage {
  rules: boolean;
  signals: { assessed: number; total: number; missing: string[] };
  ai: 'ran' | 'failed' | 'skipped';
  /** Model flags dropped because a rule had already scored the same words. */
  ai_overlap_dropped?: number;
  ai_meta?: {
    prompt_version?: string;
    model?: string;
    flags_proposed?: number;
    /** Second reading of the flags: ran, failed (flags kept) or skipped (no flags to check). */
    verify?: 'ran' | 'failed' | 'skipped';
    verify_removed?: string[];
  };
}

// Multi-layer assessment. The first three fields are the original contract; the rest is additive
export interface AiRiskScoreResponse {
  risk_score: number;
  risk_level: RiskLevel | string;
  reasons?: string[];
  reason_items?: RiskReasonItem[];
  ruleset_version?: string | null;
  assessed_at?: string;
  content_hash?: string;
  coverage?: RiskCoverage;
  complete?: boolean;
  cached?: boolean;
  stored?: boolean;
  assessment_id?: number;
  ai_layer?: string;
  event_id?: string;
}

export interface RiskBatchResponse {
  assessments: Record<string, AiRiskScoreResponse>;
  missing: string[];
}

export interface RiskAgreementResponse {
  days: number;
  decided: number;
  agree: number;
  disagree: number;
  neutral: number;
  derived: number;
  pending: number;
  by_level: Record<RiskLevel, { APPROVED: number; REJECTED: number }>;
}

export interface DashboardKpis {
  generated_at: string;
  hash?: string;
  pending_events: null | { total: number; pending: number; update_pending: number; by_risk: Record<'HIGH' | 'MEDIUM' | 'LOW' | 'UNASSESSED', number> };
  live_events: number | null;
  resale_pending: null | { count: number; oldest_hours: number | null };
  transactions_7d: null | { days: { date: string; orders: number; revenue: number }[]; orders_total: number; revenue_total: number };
  late_payments_open: number | null;
  paid_without_tickets: number | null;
  stock_discrepancies: number | null;
  services: null | { up: number; total: number; down: string[] };
  sources: Record<string, 'ok' | 'unavailable' | string>;
}

export interface DashboardSummaryResponse {
  summary: string | null;
  reason: string | null;
  cached: boolean;
  created_at: string;
}

export type AttentionType = 'HIGH_RISK_PENDING' | 'LATE_PAYMENT_OPEN' | 'PAID_WITHOUT_TICKETS' | 'RESALE_PENDING' | 'SERVICE_DOWN';
export type AttentionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface AttentionItem {
  id: string;
  type: AttentionType | string;
  priority: AttentionPriority;
  title: string;
  evidence: Record<string, unknown>;
  link: string;
  since: string | null;
}

export interface AttentionResponse {
  generated_at: string;
  items: AttentionItem[];
  sources: Record<string, 'ok' | 'unavailable' | string>;
}

export interface PinnedReport {
  pin_id: string;
  title: string;
  question: string;
  sql: string;
  chart_type: string;
  snapshot: Record<string, unknown>[] | null;
  created_at: string;
}

export interface PinsResponse {
  pins: PinnedReport[];
  max: number;
}

export interface PinData {
  pin_id: string;
  title: string;
  chart_type: string;
  rows: Record<string, unknown>[];
  live: boolean;
  snapshot_at?: string;
}

export interface PinCreateInput {
  title: string;
  question: string;
  sql: string;
  chart_type: string;
  snapshot?: Record<string, unknown>[];
}

export type AiProviderName = 'groq' | 'openai' | 'gemini';

export interface AiProviderHealth {
  name: AiProviderName | string;
  configured: boolean;
  status: 'ok' | 'degraded' | 'down' | 'unknown';
  last_ok_at: string | null;
  last_error_code: string | null;
  ok_count: number;
  fail_count: number;
}

export interface AiHealthResponse {
  providers: AiProviderHealth[];
  probe: { status: 'ok' | 'failed'; checked_at: string; provider?: string } | null;
}

export interface SystemServiceStatus {
  name: string;
  port: number | null;
  type: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  uptime: string | null;
  latencyMs: number | null;
  memoryUsage: string | null;
  cpuLoad: string | null;
}

export interface SystemLogEntry {
  id: string;
  time: string;
  service: string;
  event: string;
  status: 'ERROR' | 'WARN' | 'INFO';
  details: string;
  operator: string | null;
  ipAddress: string | null;
  endpoint: string | null;
}

export interface SystemLogsResponse {
  entries: SystemLogEntry[];
  source: { status: 'ok' | 'empty' | 'unavailable' };
}

export interface SslStatusResponse {
  has_ssl: boolean;
  status?: string;
  message?: string;
  domain?: string;
  port?: number;
  issuer?: string;
  protocol?: string;
  remaining_days?: number;
  expire_date?: string;
}


// AI request/response shapes used by services/aiApi.ts (additive)

export interface AiChatHistoryItem {
  role: string;
  content: string;
}

export interface AiAnalyzeResponse {
  reply?: string;
  generated_sql?: string;
  data?: Record<string, unknown>[];
}

export interface AiGeneratedEventContent {
  description: string;
  terms_and_conditions: string;
}

export interface AiVoucherStrategyResponse {
  strategy: string;
}
