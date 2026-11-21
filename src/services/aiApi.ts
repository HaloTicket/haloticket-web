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
  OrganizerChatResponse,
  OrganizerConversationDetail,
  OrganizerConversationMessageItem,
  OrganizerConversationScope,
  OrganizerConversationSummary,
  AiHealthResponse,
  AiSearchResponse,
  SslStatusResponse,
  SystemLogEntry,
  SystemLogsResponse,
  SystemServiceStatus,
} from '../types/ai';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const buildOrganizerScopeParams = (
  scope: OrganizerConversationScope,
  eventId?: string,
): { scope: OrganizerConversationScope; event_id?: string } => {
  if (scope === 'event') {
    const cleanEventId = eventId?.trim();
    if (!cleanEventId) {
      throw new Error('eventId is required when scope is event');
    }
    return { scope: 'event', event_id: cleanEventId };
  }
  return { scope: 'managed_events' };
};

const isOrganizerConversationSummary = (value: unknown): value is OrganizerConversationSummary => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    (value.scope === 'managed_events' || value.scope === 'event') &&
    (value.event_id === null || typeof value.event_id === 'string') &&
    typeof value.title === 'string' &&
    typeof value.is_pinned === 'boolean' &&
    typeof value.created_at === 'string' &&
    typeof value.updated_at === 'string'
  );
};

const isOrganizerConversationMessageItem = (
  value: unknown,
): value is OrganizerConversationMessageItem => {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    (value.role === 'user' || value.role === 'assistant') &&
    typeof value.content === 'string' &&
    (value.status === 'ok' || value.status === 'empty') &&
    (value.payload === null || isRecord(value.payload)) &&
    typeof value.created_at === 'string'
  );
};

const isOrganizerConversationDetail = (value: unknown): value is OrganizerConversationDetail => {
  if (!isOrganizerConversationSummary(value)) return false;
  const candidate = value as unknown as Record<string, unknown>;
  return Array.isArray(candidate.messages) && candidate.messages.every(isOrganizerConversationMessageItem);
};

export const aiApi = {
  /** Gửi tin nhắn tới trợ lý đặt vé thông minh dành cho khách hàng, kèm lịch sử hội thoại. */
  chatWithSmartBooking: async (message: string, history: AiChatHistoryItem[] = [], selectedEventId?: string): Promise<AiChatResponse> => {
    // gọi qua API gateway; mã sự kiện đang đặt vé (nếu có) giúp máy chủ giữ đúng ngữ cảnh khi lịch sử bị cắt
    const response = await axiosClient.post('/customer/smart-booking-chat', {
      message,
      history,
      ...(selectedEventId ? { selected_event_id: selectedEventId } : {}),
    });
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

  /** Lấy danh sách phiên hội thoại AI của ban tổ chức theo phạm vi. */
  listOrganizerConversations: async ({
    scope,
    eventId,
    signal,
  }: {
    scope: OrganizerConversationScope;
    eventId?: string;
    signal?: AbortSignal;
  }): Promise<OrganizerConversationSummary[]> => {
    const params = buildOrganizerScopeParams(scope, eventId);
    const response = (await axiosClient.get('/organizer/conversations', {
      params,
      ...(signal ? { signal } : {}),
    })) as unknown;
    if (!Array.isArray(response) || !response.every(isOrganizerConversationSummary)) {
      throw new Error('Invalid organizer conversations response');
    }
    return response;
  },

  /** Tạo phiên hội thoại AI mới cho ban tổ chức trên máy chủ. */
  createOrganizerConversation: async ({
    scope,
    eventId,
    signal,
  }: {
    scope: OrganizerConversationScope;
    eventId?: string;
    signal?: AbortSignal;
  }): Promise<OrganizerConversationSummary> => {
    const body = buildOrganizerScopeParams(scope, eventId);
    const response = (await axiosClient.post(
      '/organizer/conversations',
      body,
      signal ? { signal } : undefined,
    )) as unknown;
    if (!isOrganizerConversationSummary(response)) {
      throw new Error('Invalid organizer conversation summary response');
    }
    return response;
  },

  /** Lấy chi tiết một phiên hội thoại AI của ban tổ chức kèm toàn bộ tin nhắn. */
  getOrganizerConversation: async (
    conversationId: string,
    options?: { signal?: AbortSignal },
  ): Promise<OrganizerConversationDetail> => {
    const response = (await axiosClient.get(
      `/organizer/conversations/${encodeURIComponent(conversationId)}`,
      options?.signal ? { signal: options.signal } : undefined,
    )) as unknown;
    if (!isOrganizerConversationDetail(response)) {
      throw new Error('Invalid organizer conversation detail response');
    }
    return response;
  },

  /** Bật hoặc tắt ghim cho một phiên hội thoại AI của ban tổ chức. */
  pinOrganizerConversation: async (
    conversationId: string,
    isPinned: boolean,
    options?: { signal?: AbortSignal },
  ): Promise<OrganizerConversationSummary> => {
    const response = (await axiosClient.patch(
      `/organizer/conversations/${encodeURIComponent(conversationId)}/pin`,
      { is_pinned: Boolean(isPinned) },
      options?.signal ? { signal: options.signal } : undefined,
    )) as unknown;
    if (!isOrganizerConversationSummary(response)) {
      throw new Error('Invalid organizer conversation pin response');
    }
    return response;
  },

  /** Xóa một phiên hội thoại AI của ban tổ chức theo mã phiên. */
  deleteOrganizerConversation: async (
    conversationId: string,
    options?: { signal?: AbortSignal },
  ): Promise<void> => {
    await axiosClient.delete(
      `/organizer/conversations/${encodeURIComponent(conversationId)}`,
      options?.signal ? { signal: options.signal } : undefined,
    );
  },

  /** Xóa toàn bộ phiên hội thoại AI của ban tổ chức trong phạm vi hiện tại. */
  clearOrganizerConversations: async ({
    scope,
    eventId,
    signal,
  }: {
    scope: OrganizerConversationScope;
    eventId?: string;
    signal?: AbortSignal;
  }): Promise<void> => {
    const params = buildOrganizerScopeParams(scope, eventId);
    await axiosClient.delete('/organizer/conversations', {
      params,
      ...(signal ? { signal } : {}),
    });
  },

  /** Gửi tin nhắn tới trợ lý AI của ban tổ chức trong phạm vi đã chọn. */
  chatWithOrganizerAgent: async ({
    scope,
    eventId,
    message,
    history = [],
    locale = 'vi',
    conversationId,
    requestId,
    persist,
    signal,
  }: {
    scope: OrganizerConversationScope;
    eventId?: string;
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    locale?: 'vi' | 'en';
    conversationId?: string | null;
    requestId?: string;
    persist?: boolean;
    signal?: AbortSignal;
  }): Promise<OrganizerChatResponse> => {
    const scopeFields = buildOrganizerScopeParams(scope, eventId);
    const payload: Record<string, unknown> = {
      ...scopeFields,
      message: message.trim().slice(0, 1000),
      locale,
    };

    if (persist) {
      payload.persist = true;
      if (conversationId) {
        payload.conversation_id = conversationId;
      }
      if (requestId) {
        payload.request_id = requestId;
      }
    } else {
      payload.history = history
        .filter(entry => entry.content.trim())
        .slice(-8)
        .map(entry => ({ role: entry.role, content: entry.content.trim().slice(0, 4000) }));
      if (conversationId) {
        payload.conversation_id = conversationId;
      }
      if (requestId) {
        payload.request_id = requestId;
      }
    }

    const response = (await axiosClient.post(
      '/organizer/agent-chat',
      payload,
      signal ? { signal } : undefined,
    )) as unknown;
    if (!response || typeof response !== 'object' || typeof (response as OrganizerChatResponse).reply !== 'string') {
      throw new Error('Invalid organizer chat response');
    }
    if (
      persist &&
      (typeof (response as OrganizerChatResponse).conversation_id !== 'string' ||
        !(response as OrganizerChatResponse).conversation_id!.trim())
    ) {
      throw new Error('Missing conversation_id in persistent organizer chat response');
    }
    return response as OrganizerChatResponse;
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
