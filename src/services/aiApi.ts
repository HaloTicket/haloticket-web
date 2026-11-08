import axiosClient from './axiosClient';
import type {
  AiAnalyzeResponse,
  AiChatHistoryItem,
  AiChatResponse,
  AiGeneratedEventContent,
  AiRiskScoreResponse,
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

  analyzeRiskScore: async (eventId: string, title: string, description: string, organizerName: string): Promise<AiRiskScoreResponse> => {
    const response = await axiosClient.post('/admin/risk-scoring', {
      event_id: eventId,
      title,
      description,
      organizer_name: organizerName
    });
    return response as unknown as AiRiskScoreResponse;
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
