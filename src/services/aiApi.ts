import axiosClient from './axiosClient';
import type {
  AiAnalyzeResponse,
  AiChatHistoryItem,
  AiChatResponse,
  AiGeneratedEventContent,
  AiRiskScoreResponse,
  AttentionResponse,
  DashboardKpis,
  DashboardSummaryResponse,
  PinCreateInput,
  PinData,
  PinsResponse,
  RiskAgreementResponse,
  RiskBatchResponse,
  AiVoucherStrategyResponse,
  OrganizerAgentResponse,
  AiHealthResponse,
  AiSearchResponse,
  SslStatusResponse,
  SystemLogEntry,
  SystemLogsResponse,
  SystemServiceStatus,
} from '../types/ai';

export const aiApi = {
  /** Gửi tin nhắn tới trợ lý đặt vé thông minh dành cho khách hàng, kèm lịch sử hội thoại. */
  chatWithSmartBooking: async (message: string, history: AiChatHistoryItem[] = []): Promise<AiChatResponse> => {
    // gọi qua API gateway
    const response = await axiosClient.post('/customer/smart-booking-chat', { message, history });
    return response as unknown as AiChatResponse; // axiosClient interceptor returns data directly
  },

  /** Tìm sự kiện bằng ngôn ngữ tự nhiên, trả về tối đa `top_k` kết quả. */
  searchEventsByNaturalLanguage: async (query: string, top_k: number = 6): Promise<AiSearchResponse> => {
    // errors (429, 5xx, network) are left to the caller so it can show the real reason.
    const response = await axiosClient.post('/customer/chat-search', { query, top_k });
    return response as unknown as AiSearchResponse;
  },

  /** Gửi tin nhắn tới trợ lý AI dành cho quản trị viên, kèm lịch sử hội thoại. */
  chatAdminAssistant: async (message: string, history: AiChatHistoryItem[] = []): Promise<AiChatResponse> => {
    const response = await axiosClient.post('/admin/assistant-chat', { message, history });
    return response as unknown as AiChatResponse;
  },

  /** Gửi câu hỏi phân tích dữ liệu của nhà tổ chức cho AI. */
  analyzeData: async (question: string): Promise<AiAnalyzeResponse> => {
    const response = await axiosClient.post('/organizer/data-analysis', { question });
    return response as unknown as AiAnalyzeResponse; // axiosClient interceptor returns data directly
  },

  /** Nhờ AI sinh nội dung sự kiện từ tiêu đề và các ý chính. */
  generateEventContent: async (title: string, bulletPoints: string): Promise<AiGeneratedEventContent> => {
    const response = await axiosClient.post('/organizer/generate-event-content', { 
      title, 
      bullet_points: bulletPoints 
    });
    return response as unknown as AiGeneratedEventContent;
  },

  /** Nhờ AI gợi ý chiến lược voucher cho một sự kiện. */
  getVoucherStrategy: async (eventId: string): Promise<AiVoucherStrategyResponse> => {
    const response = await axiosClient.post('/organizer/voucher-strategy', { event_id: eventId });
    return response as unknown as AiVoucherStrategyResponse;
  },

  /** Chấm điểm rủi ro của một sự kiện chờ duyệt bằng AI; `refresh` buộc tính lại thay vì dùng kết quả đã lưu. */
  analyzeRiskScore: async (
    eventId: string,
    title: string,
    description: string,
    organizerName: string,
    options: { refresh?: boolean } = {}
  ): Promise<AiRiskScoreResponse> => {
    const response = await axiosClient.post('/admin/risk-scoring', {
      event_id: eventId,
      title,
      description,
      organizer_name: organizerName,
      ...(options.refresh ? { refresh: true } : {})
    });
    return response as unknown as AiRiskScoreResponse;
  },

  /** Lấy điểm rủi ro lớp A+B cho hàng đợi duyệt (không gọi mô hình AI). Mỗi lần gọi máy chủ nhận tối đa 100 mã sự kiện; ném lỗi nếu phản hồi sai định dạng. */
  getRiskBatch: async (eventIds: string[]): Promise<RiskBatchResponse> => {
    const response = (await axiosClient.post('/admin/risk/batch', { event_ids: eventIds })) as unknown as Partial<RiskBatchResponse> | null;
    if (!response || typeof response.assessments !== 'object' || response.assessments === null) throw new Error('Invalid risk batch response');
    return { assessments: response.assessments, missing: Array.isArray(response.missing) ? response.missing : [] };
  },

  /** Ghi nhận quyết định của quản trị viên ở mức cố gắng hết sức. Không bao giờ ném lỗi, thử lại một lần; trả về `true` nếu ghi được. */
  recordRiskDecision: async (eventId: string, decision: 'APPROVED' | 'REJECTED', reason = ''): Promise<boolean> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await axiosClient.post('/admin/risk/decisions', { event_id: eventId, decision, reason });
        return true;
      } catch {
                // việc duyệt đã thành công; thiếu bản ghi này chỉ làm mất thông tin "ai và khi nào"
      }
    }
    return false;
  },

  /** Lấy mức độ đồng thuận giữa điểm rủi ro AI và quyết định của quản trị viên trong `days` ngày gần nhất. */
  getRiskAgreement: async (days = 30): Promise<RiskAgreementResponse> => {
    const response = await axiosClient.get('/admin/risk/agreement', { params: { days } });
    return response as unknown as RiskAgreementResponse;
  },

  /** Lấy các chỉ số KPI của trang tổng quan quản trị; ném lỗi nếu phản hồi không hợp lệ. */
  getDashboardKpis: async (): Promise<DashboardKpis> => {
    const response = await axiosClient.get('/admin/dashboard/kpis');
    if (!response || typeof response !== 'object') throw new Error('Invalid KPI response');
    return response as unknown as DashboardKpis;
  },

  /** Lấy bản tóm tắt tổng quan do AI viết theo ngôn ngữ chọn; `refresh` buộc tạo lại. */
  getDashboardSummary: async (lang: 'vi' | 'en', refresh = false): Promise<DashboardSummaryResponse> => {
    const response = await axiosClient.post('/admin/dashboard/summary', { lang, ...(refresh ? { refresh: true } : {}) });
    return response as unknown as DashboardSummaryResponse;
  },

  /** Lấy danh sách các mục cần quản trị viên chú ý; ném lỗi nếu phản hồi sai định dạng. */
  getAttention: async (): Promise<AttentionResponse> => {
    const response = (await axiosClient.get('/admin/attention')) as unknown as Partial<AttentionResponse> | null;
    if (!response || !Array.isArray(response.items)) throw new Error('Invalid attention response');
    return { generated_at: response.generated_at ?? '', items: response.items, sources: response.sources ?? {} };
  },

  /** Lấy danh sách biểu đồ đã ghim và số lượng ghim tối đa. */
  getPins: async (): Promise<PinsResponse> => {
    const response = (await axiosClient.get('/admin/pins')) as unknown as Partial<PinsResponse> | null;
    if (!response || !Array.isArray(response.pins)) throw new Error('Invalid pins response');
    return { pins: response.pins, max: response.max ?? 0 };
  },

  /** Tạo một ghim mới, trả về mã ghim. */
  createPin: async (input: PinCreateInput): Promise<{ pin_id: string }> => {
    const response = await axiosClient.post('/admin/pins', input);
    return response as unknown as { pin_id: string };
  },

  /** Lấy dữ liệu hiện tại của một ghim. */
  getPinData: async (pinId: string): Promise<PinData> => {
    const response = await axiosClient.get(`/admin/pins/${encodeURIComponent(pinId)}/data`);
    return response as unknown as PinData;
  },

  /** Xóa một ghim theo mã. */
  deletePin: async (pinId: string): Promise<void> => {
    await axiosClient.delete(`/admin/pins/${encodeURIComponent(pinId)}`);
  },

  /** Gửi tin nhắn tới trợ lý AI của nhà tổ chức, có thể gắn với một sự kiện cụ thể. */
  chatWithOrganizerAgent: async (message: string, history: AiChatHistoryItem[] = [], eventId?: string, eventTitle?: string): Promise<OrganizerAgentResponse> => {
    const response = await axiosClient.post('/organizer/agent-chat', {
      message,
      history,
      event_id: eventId,
      event_title: eventTitle
    });
    return response as unknown as OrganizerAgentResponse;
  },

  /** Lấy tình trạng sức khỏe của các dịch vụ hệ thống; ném lỗi nếu phản hồi không phải danh sách. */
  getSystemHealth: async (): Promise<SystemServiceStatus[]> => {
    const response = await axiosClient.get('/admin/system-health');
    if (!Array.isArray(response)) throw new Error('Invalid system health response');
    return response as unknown as SystemServiceStatus[];
  },

  /** Lấy nhật ký hệ thống kèm trạng thái nguồn log; chấp nhận cả định dạng mảng cũ. */
  getSystemLogs: async (): Promise<SystemLogsResponse> => {
    const response = (await axiosClient.get('/admin/system-logs')) as unknown;
    if (Array.isArray(response)) {
            // Chấp nhận dạng mảng cũ mà không tự suy ra trạng thái nguồn.
      return { entries: response as SystemLogEntry[], source: { status: response.length ? 'ok' : 'empty' } };
    }
    const body = response as Partial<SystemLogsResponse> | null;
    if (!body || !Array.isArray(body.entries)) throw new Error('Invalid system logs response');
    return { entries: body.entries, source: body.source ?? { status: body.entries.length ? 'ok' : 'empty' } };
  },

  /** Lấy tình trạng chứng chỉ SSL của một tên miền (hoặc tên miền mặc định). */
  getSslStatus: async (domain?: string): Promise<SslStatusResponse> => {
    const response = await axiosClient.get('/admin/ssl-status', { params: domain ? { domain } : {} });
    if (!response || typeof response !== 'object') throw new Error('Invalid SSL status response');
    return response as unknown as SslStatusResponse;
  },

  /** Lấy tình trạng các nhà cung cấp AI; `probe` yêu cầu thử gọi thật để kiểm tra. */
  getAiHealth: async (probe = false): Promise<AiHealthResponse> => {
    const response = await axiosClient.get('/admin/ai/health', { params: probe ? { probe: 1 } : {} });
    const body = response as unknown as Partial<AiHealthResponse> | null;
    if (!body || !Array.isArray(body.providers)) throw new Error('Invalid AI health response');
    return { providers: body.providers, probe: body.probe ?? null };
  }
};
