import axiosClient from './axiosClient';
import type { AiChatResponse } from '../types/ai';

export const aiApi = {
  chatWithSmartBooking: async (message: string, history: any[] = []): Promise<AiChatResponse> => {
    // call through api gateway
    const response = await axiosClient.post('/customer/smart-booking-chat', { message, history });
    return response as any; // axiosClient interceptor returns data directly
  },

  searchEventsByNaturalLanguage: async (query: string, top_k: number = 6): Promise<{ query: string; total: number; events: any[]; matches: any[] }> => {
    try {
      const response = await axiosClient.post('/customer/chat-search', { query, top_k });
      return response as any;
    } catch (err) {
      console.warn("AI natural language search failed:", err);
      return { query, total: 0, events: [], matches: [] };
    }
  },

  chatAdminAssistant: async (message: string, history: any[] = []): Promise<AiChatResponse> => {
    const response = await axiosClient.post('/admin/assistant-chat', { message, history });
    return response as any;
  },

  analyzeData: async (question: string): Promise<any> => {
    const response = await axiosClient.post('/organizer/data-analysis', { question });
    return response; // axiosClient interceptor returns data directly
  },

  generateEventContent: async (title: string, bulletPoints: string): Promise<{ description: string; terms_and_conditions: string }> => {
    const response = await axiosClient.post('/organizer/generate-event-content', { 
      title, 
      bullet_points: bulletPoints 
    });
    return response as any;
  },

  getVoucherStrategy: async (eventId: string): Promise<{ strategy: string }> => {
    const response = await axiosClient.post('/organizer/voucher-strategy', { event_id: eventId });
    return response as any;
  },

  analyzeRiskScore: async (eventId: string, title: string, description: string, organizerName: string): Promise<{ risk_score: number, risk_level: string, reasons: string[] }> => {
    const response = await axiosClient.post('/admin/risk-scoring', {
      event_id: eventId,
      title,
      description,
      organizer_name: organizerName
    });
    return response as any;
  },

  getDynamicPriceCeiling: async (eventId: string, demandLevel: string): Promise<{ suggested_cap_percent: number, reason: string }> => {
    const response = await axiosClient.post('/admin/dynamic-price-ceiling', {
      event_id: eventId,
      current_demand_level: demandLevel
    });
    return response as any;
  },

  getAnomalyDetection: async (): Promise<{ has_anomaly: boolean, description: string, action_taken: string }> => {
    const response = await axiosClient.get('/admin/anomaly-detection');
    return response as any;
  },

  getSystemHealth: async (): Promise<any[]> => {
    try {
      const response = await axiosClient.get('/admin/system-health');
      return Array.isArray(response) ? response : [];
    } catch {
      return [];
    }
  },

  getSystemLogs: async (): Promise<any[]> => {
    try {
      const response = await axiosClient.get('/admin/system-logs');
      return Array.isArray(response) ? response : [];
    } catch {
      return [];
    }
  },

  getSslStatus: async (domain?: string): Promise<any> => {
    try {
      const response = await axiosClient.get('/admin/ssl-status', { params: domain ? { domain } : {} });
      return response as any;
    } catch {
      return null;
    }
  }
};
