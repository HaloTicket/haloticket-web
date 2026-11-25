/**
 * Dữ liệu do lớp công cụ LLM tạo ra. Hình dạng phụ thuộc vào hành động
 * (chuỗi JSON, đối tượng, mảng dòng...) và được từng nơi dùng tự thu hẹp kiểu,
 * nên đây là giá trị JSON động (kiểu kết quả của JSON.parse) chứ không phải
 * một hình dạng cố định.
 */
export type AiActionPayload = ReturnType<typeof JSON.parse>;

/** Một hành động hệ thống mà trợ lý AI trả về, kèm tham số trích xuất và dữ liệu truy vấn được. */
export interface AiSystemAction {
  action: string;
  extracted_args?: AiActionPayload;
  database_data?: AiActionPayload;
}

/** Phản hồi của trợ lý AI cho admin: câu trả lời, các hành động hệ thống, công cụ đã dùng và cờ cho biết câu trả lời có dựa trên dữ liệu thật. */
export interface AiChatResponse {
  reply: string;
  system_actions: AiSystemAction[];
  tools_used?: string[];
  grounded?: boolean;
}

/** Một tin nhắn trong khung chat với trợ lý AI (của người dùng hoặc của AI). */
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

/** Một bước trong chuỗi xử lý của agent: nhận ý định, chạy công cụ, tổng hợp, hoàn tất hoặc lỗi. */
export interface AgentPipelineStep {
  step: 'INTENT' | 'TOOL_EXECUTION' | 'SYNTHESIS' | 'COMPLETED' | 'ERROR';
  name: string;
  detail: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  duration_ms?: number;
}

export interface OrganizerChatPeriod {
  from: string;
  to: string;
}

export interface OrganizerChatMetric {
  key: string;
  value: number | null;
  unit: 'count' | 'VND' | 'percent';
  period: OrganizerChatPeriod | null;
  completeness: 'complete' | 'partial' | 'missing';
}

export interface OrganizerChatCard {
  kind: 'event' | 'showtime' | 'ticket_type';
  event_id: string;
  event_title: string;
  event_status: string | null;
  showtime_id: string | null;
  showtime_title: string | null;
  ticket_type_id: string | null;
  ticket_type_title: string | null;
  start_time: string | null;
  end_time: string | null;
  metrics: OrganizerChatMetric[];
}

export interface OrganizerChatWarning extends OrganizerChatCard {
  code: 'paid_order_missing_tickets' | 'low_stock' | 'slow_showtime';
}

export interface OrganizerChatDraft {
  title: string;
  content: string;
}

export interface OrganizerChatFollowUp {
  question: string;
  options: { label: string; message: string }[];
}

export interface OrganizerChatResponse {
  reply: string;
  status: 'ok' | 'empty';
  conversation_id?: string | null;
  pipeline_steps: AgentPipelineStep[];
  actions: AiSystemAction[];
  cards: OrganizerChatCard[];
  totals: OrganizerChatMetric[];
  warnings: OrganizerChatWarning[];
  drafts: OrganizerChatDraft[];
  follow_up?: OrganizerChatFollowUp | null;
  suggested_questions?: string[];
  show_analytics?: boolean | null;
  execution_time_ms: number | null;
}

/** Phạm vi hội thoại AI của ban tổ chức. */
export type OrganizerConversationScope = 'managed_events' | 'event';

/** Tóm tắt một phiên hội thoại AI của ban tổ chức lưu trên máy chủ. */
export interface OrganizerConversationSummary {
  id: string;
  scope: OrganizerConversationScope;
  event_id: string | null;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

/** Dữ liệu đính kèm trên tin nhắn lịch sử của trợ lý AI ban tổ chức. */
export type OrganizerStoredMessagePayload = Partial<OrganizerChatResponse>;

/** Một tin nhắn lịch sử trong phiên hội thoại AI của ban tổ chức. */
export interface OrganizerConversationMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'ok' | 'empty';
  payload: OrganizerChatResponse | OrganizerStoredMessagePayload | null;
  created_at: string;
}

/** Chi tiết một phiên hội thoại AI của ban tổ chức kèm danh sách tin nhắn. */
export interface OrganizerConversationDetail extends OrganizerConversationSummary {
  messages: OrganizerConversationMessageItem[];
}

/** Phản hồi của agent dành cho người tổ chức (tương thích ngược). */
export type OrganizerAgentResponse = OrganizerChatResponse;

/** Một tin nhắn trong khung chat với agent của người tổ chức. */
export interface OrganizerChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  pipelineSteps?: AgentPipelineStep[];
  isCached?: boolean;
  executionTimeMs?: number | null;
  actions?: AiSystemAction[];
  cards?: OrganizerChatCard[];
  totals?: OrganizerChatMetric[];
  warnings?: OrganizerChatWarning[];
  drafts?: OrganizerChatDraft[];
  followUp?: OrganizerChatFollowUp | null;
  suggestedQuestions?: string[];
  showAnalytics?: boolean | null;
  status?: 'ok' | 'empty';
  isError?: boolean;
  timestamp: Date;
}


// Nền tảng AI: các dạng phản hồi (bổ sung thêm)
/** Một kết quả khớp từ tìm kiếm AI: id sự kiện và điểm tương đồng. */
export interface AiSearchMatch {
  event_id: string;
  score: number;
}

/** Thông tin sự kiện hiển thị trong kết quả tìm kiếm AI. */
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

/** Phản hồi tìm kiếm AI: danh sách kết quả khớp, sự kiện, chế độ tìm (vector hoặc từ khóa) và cờ cho biết đang chạy ở chế độ suy giảm. */
export interface AiSearchResponse {
  query: string;
  total: number;
  matches: AiSearchMatch[];
  events: AiSearchEvent[];
  search_mode?: 'vector' | 'keyword';
  degraded?: boolean;
}

/** Mức rủi ro của sự kiện khi đánh giá duyệt. */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
/** Tầng đánh giá rủi ro tạo ra một lý do: luật, tín hiệu hoặc AI. */
export type RiskLayer = 'RULE' | 'SIGNAL' | 'AI';

/** Đoạn văn bản làm bằng chứng cho một lý do rủi ro, kèm trường chứa nó và vị trí đầu cuối. */
export interface RiskEvidence {
  field: string;
  start?: number;
  end?: number;
  text: string;
}

/** Một lý do góp vào điểm rủi ro: tầng đánh giá, mã, mức độ, trọng số, thông điệp và bằng chứng. */
export interface RiskReasonItem {
  layer: RiskLayer;
  code: string;
  severity?: string;
  weight: number;
  message: string;
  status?: 'not_assessed';
  evidence?: RiskEvidence[];
  confidence?: string;
  /** Các tín hiệu về người tổ chức dùng chung một ngân sách điểm có trần: cờ này cho biết tín hiệu đã bị cắt (trọng số trong trường này là trọng số thực sự được tính). */
  capped?: boolean;
}

/** Độ phủ của việc đánh giá: luật, số tín hiệu đã đánh giá và trạng thái chạy của tầng AI. */
export interface RiskCoverage {
  rules: boolean;
  signals: { assessed: number; total: number; missing: string[] };
  ai: 'ran' | 'failed' | 'skipped';
  /** Các cờ của mô hình bị bỏ vì một luật đã chấm điểm cùng các từ đó. */
  ai_overlap_dropped?: number;
  ai_meta?: {
    prompt_version?: string;
    model?: string;
    flags_proposed?: number;
    /** Lần đọc thứ hai các cờ: đã chạy, thất bại (giữ nguyên các cờ) hoặc bỏ qua (không có cờ nào để kiểm tra). */
    verify?: 'ran' | 'failed' | 'skipped';
    verify_removed?: string[];
  };
}

// Đánh giá nhiều tầng. Ba trường đầu là hợp đồng ban đầu; các trường còn lại được bổ sung thêm.
/** Kết quả chấm điểm rủi ro của một sự kiện: điểm, mức rủi ro, các lý do, độ phủ và thông tin lưu trữ. */
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

/** Phản hồi chấm điểm hàng loạt: đánh giá theo từng sự kiện và danh sách sự kiện chưa có đánh giá. */
export interface RiskBatchResponse {
  assessments: Record<string, AiRiskScoreResponse>;
  missing: string[];
}

/** Thống kê mức độ đồng thuận giữa điểm rủi ro của AI và quyết định duyệt thực tế của admin trong một số ngày. */
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

/** Các chỉ số chính của bảng điều khiển admin; mỗi chỉ số là `null` khi nguồn dữ liệu tương ứng không khả dụng. */
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

/** Phản hồi bản tóm tắt AI của bảng điều khiển, kèm lý do khi không có tóm tắt và cờ cache. */
export interface DashboardSummaryResponse {
  summary: string | null;
  reason: string | null;
  cached: boolean;
  created_at: string;
}

/** Loại việc cần admin chú ý. */
export type AttentionType = 'HIGH_RISK_PENDING' | 'LATE_PAYMENT_OPEN' | 'PAID_WITHOUT_TICKETS' | 'RESALE_PENDING' | 'SERVICE_DOWN';
/** Mức ưu tiên của việc cần chú ý. */
export type AttentionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM';

/** Một việc cần admin chú ý: loại, mức ưu tiên, bằng chứng và đường dẫn xử lý. */
export interface AttentionItem {
  id: string;
  type: AttentionType | string;
  priority: AttentionPriority;
  title: string;
  evidence: Record<string, unknown>;
  link: string;
  since: string | null;
}

/** Phản hồi danh sách việc cần chú ý, kèm trạng thái từng nguồn dữ liệu. */
export interface AttentionResponse {
  generated_at: string;
  items: AttentionItem[];
  sources: Record<string, 'ok' | 'unavailable' | string>;
}

/** Báo cáo được ghim: câu hỏi, câu SQL, loại biểu đồ và ảnh chụp dữ liệu lúc ghim. */
export interface PinnedReport {
  pin_id: string;
  title: string;
  question: string;
  sql: string;
  chart_type: string;
  snapshot: Record<string, unknown>[] | null;
  created_at: string;
}

/** Phản hồi danh sách báo cáo đã ghim và số lượng ghim tối đa. */
export interface PinsResponse {
  pins: PinnedReport[];
  max: number;
}

/** Dữ liệu hiện tại của một báo cáo đã ghim; `live` cho biết dữ liệu mới hay là ảnh chụp cũ. */
export interface PinData {
  pin_id: string;
  title: string;
  chart_type: string;
  rows: Record<string, unknown>[];
  live: boolean;
  snapshot_at?: string;
}

/** Dữ liệu gửi lên để ghim một báo cáo mới. */
export interface PinCreateInput {
  title: string;
  question: string;
  sql: string;
  chart_type: string;
  snapshot?: Record<string, unknown>[];
}

/** Tên nhà cung cấp mô hình AI được hỗ trợ. */
export type AiProviderName = 'groq' | 'openai' | 'gemini';

/** Tình trạng sức khỏe của một nhà cung cấp AI: đã cấu hình chưa, trạng thái, lần thành công cuối và số lần thành công hoặc thất bại. */
export interface AiProviderHealth {
  name: AiProviderName | string;
  configured: boolean;
  status: 'ok' | 'degraded' | 'down' | 'unknown';
  last_ok_at: string | null;
  last_error_code: string | null;
  ok_count: number;
  fail_count: number;
}

/** Phản hồi kiểm tra sức khỏe AI: tình trạng từng nhà cung cấp và kết quả thăm dò. */
export interface AiHealthResponse {
  providers: AiProviderHealth[];
  probe: { status: 'ok' | 'failed'; checked_at: string; provider?: string } | null;
}

/** Trạng thái hoạt động của một dịch vụ hệ thống (cổng, uptime, độ trễ, bộ nhớ, CPU). */
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

/** Một dòng nhật ký hệ thống: thời điểm, dịch vụ, sự kiện, mức độ và nơi phát sinh. */
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

/** Phản hồi nhật ký hệ thống, kèm trạng thái của nguồn log. */
export interface SystemLogsResponse {
  entries: SystemLogEntry[];
  source: { status: 'ok' | 'empty' | 'unavailable' };
}

/** Phản hồi trạng thái chứng chỉ SSL của tên miền: nhà cấp, giao thức và số ngày còn hiệu lực. */
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


// Các dạng yêu cầu và phản hồi AI dùng bởi services/aiApi.ts (bổ sung thêm)

/** Một lượt hội thoại trong lịch sử gửi kèm cho AI (vai trò và nội dung). */
export interface AiChatHistoryItem {
  role: string;
  content: string;
}

/** Phản hồi phân tích dữ liệu bằng AI: câu trả lời, câu SQL được sinh ra và dữ liệu kết quả. */
export interface AiAnalyzeResponse {
  reply?: string;
  generated_sql?: string;
  data?: Record<string, unknown>[];
}

/** Nội dung sự kiện do AI sinh: mô tả và điều khoản. */
export interface AiGeneratedEventContent {
  description: string;
  terms_and_conditions: string;
}

/** Phản hồi gợi ý chiến lược voucher từ AI. */
export interface AiVoucherStrategyResponse {
  strategy: string;
}
