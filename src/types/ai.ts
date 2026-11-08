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
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  hiddenContext?: string;
  actions?: AiSystemAction[];
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

export interface AiRiskScoreResponse {
  risk_score: number;
  risk_level: string;
  reasons?: string[];
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
