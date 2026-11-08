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
  chatWithSmartBooking: async (message: string, history: AiChatHistoryItem[] = []): Promise<AiChatResponse> => {
    // call through api gateway
    const response = await axiosClient.post('/customer/smart-booking-chat', { message, history });
    return response as unknown as AiChatResponse; // axiosClient interceptor returns data directly
  },

  searchEventsByNaturalLanguage: async (query: string, top_k: number = 6): Promise<AiSearchResponse> => {
    // errors (429, 5xx, network) are left to the caller so it can show the real reason.
    const response = await axiosClient.post('/customer/chat-search', { query, top_k });
    return response as unknown as AiSearchResponse;
  },

  chatAdminAssistant: async (message: string, history: AiChatHistoryItem[] = []): Promise<AiChatResponse> => {
    const response = await axiosClient.post('/admin/assistant-chat', { message, history });
    return response as unknown as AiChatResponse;
  },

  analyzeData: async (question: string): Promise<AiAnalyzeResponse> => {
    const response = await axiosClient.post('/organizer/data-analysis', { question });
    return response as unknown as AiAnalyzeResponse; // axiosClient interceptor returns data directly
  },

  generateEventContent: async (title: string, bulletPoints: string): Promise<AiGeneratedEventContent> => {
    const response = await axiosClient.post('/organizer/generate-event-content', { 
      title, 
      bullet_points: bulletPoints 
    });
    return response as unknown as AiGeneratedEventContent;
  },

  getVoucherStrategy: async (eventId: string): Promise<AiVoucherStrategyResponse> => {
    const response = await axiosClient.post('/organizer/voucher-strategy', { event_id: eventId });
    return response as unknown as AiVoucherStrategyResponse;
  },

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

  // layer A+B scores for the review queue (no model call). The server accepts up to 100 ids per call
  getRiskBatch: async (eventIds: string[]): Promise<RiskBatchResponse> => {
    const response = (await axiosClient.post('/admin/risk/batch', { event_ids: eventIds })) as unknown as Partial<RiskBatchResponse> | null;
    if (!response || typeof response.assessments !== 'object' || response.assessments === null) throw new Error('Invalid risk batch response');
    return { assessments: response.assessments, missing: Array.isArray(response.missing) ? response.missing : [] };
  },

  // best effort: tells the server what the admin decided. Never throws; one retry.
  recordRiskDecision: async (eventId: string, decision: 'APPROVED' | 'REJECTED', reason = ''): Promise<boolean> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await axiosClient.post('/admin/risk/decisions', { event_id: eventId, decision, reason });
        return true;
      } catch {
        // the approval itself already succeeded; a missing record only loses the "who and when"
      }
    }
    return false;
  },

  getRiskAgreement: async (days = 30): Promise<RiskAgreementResponse> => {
    const response = await axiosClient.get('/admin/risk/agreement', { params: { days } });
    return response as unknown as RiskAgreementResponse;
  },

  getDashboardKpis: async (): Promise<DashboardKpis> => {
    const response = await axiosClient.get('/admin/dashboard/kpis');
    if (!response || typeof response !== 'object') throw new Error('Invalid KPI response');
    return response as unknown as DashboardKpis;
  },

  getDashboardSummary: async (lang: 'vi' | 'en', refresh = false): Promise<DashboardSummaryResponse> => {
    const response = await axiosClient.post('/admin/dashboard/summary', { lang, ...(refresh ? { refresh: true } : {}) });
    return response as unknown as DashboardSummaryResponse;
  },

  getAttention: async (): Promise<AttentionResponse> => {
    const response = (await axiosClient.get('/admin/attention')) as unknown as Partial<AttentionResponse> | null;
    if (!response || !Array.isArray(response.items)) throw new Error('Invalid attention response');
    return { generated_at: response.generated_at ?? '', items: response.items, sources: response.sources ?? {} };
  },

  getPins: async (): Promise<PinsResponse> => {
    const response = (await axiosClient.get('/admin/pins')) as unknown as Partial<PinsResponse> | null;
    if (!response || !Array.isArray(response.pins)) throw new Error('Invalid pins response');
    return { pins: response.pins, max: response.max ?? 0 };
  },

  createPin: async (input: PinCreateInput): Promise<{ pin_id: string }> => {
    const response = await axiosClient.post('/admin/pins', input);
    return response as unknown as { pin_id: string };
  },

  getPinData: async (pinId: string): Promise<PinData> => {
    const response = await axiosClient.get(`/admin/pins/${encodeURIComponent(pinId)}/data`);
    return response as unknown as PinData;
  },

  deletePin: async (pinId: string): Promise<void> => {
    await axiosClient.delete(`/admin/pins/${encodeURIComponent(pinId)}`);
  },

  chatWithOrganizerAgent: async (message: string, history: AiChatHistoryItem[] = [], eventId?: string, eventTitle?: string): Promise<OrganizerAgentResponse> => {
    const response = await axiosClient.post('/organizer/agent-chat', {
      message,
      history,
      event_id: eventId,
      event_title: eventTitle
    });
    return response as unknown as OrganizerAgentResponse;
  },

  getSystemHealth: async (): Promise<SystemServiceStatus[]> => {
    const response = await axiosClient.get('/admin/system-health');
    if (!Array.isArray(response)) throw new Error('Invalid system health response');
    return response as unknown as SystemServiceStatus[];
  },

  getSystemLogs: async (): Promise<SystemLogsResponse> => {
    const response = (await axiosClient.get('/admin/system-logs')) as unknown;
    if (Array.isArray(response)) {
      // Tolerate the legacy array shape without inventing a source state.
      return { entries: response as SystemLogEntry[], source: { status: response.length ? 'ok' : 'empty' } };
    }
    const body = response as Partial<SystemLogsResponse> | null;
    if (!body || !Array.isArray(body.entries)) throw new Error('Invalid system logs response');
    return { entries: body.entries, source: body.source ?? { status: body.entries.length ? 'ok' : 'empty' } };
  },

  getSslStatus: async (domain?: string): Promise<SslStatusResponse> => {
    const response = await axiosClient.get('/admin/ssl-status', { params: domain ? { domain } : {} });
    if (!response || typeof response !== 'object') throw new Error('Invalid SSL status response');
    return response as unknown as SslStatusResponse;
  },

  getAiHealth: async (probe = false): Promise<AiHealthResponse> => {
    const response = await axiosClient.get('/admin/ai/health', { params: probe ? { probe: 1 } : {} });
    const body = response as unknown as Partial<AiHealthResponse> | null;
    if (!body || !Array.isArray(body.providers)) throw new Error('Invalid AI health response');
    return { providers: body.providers, probe: body.probe ?? null };
  }
};
