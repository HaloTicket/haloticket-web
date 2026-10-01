import axiosClient from './axiosClient';
import type { AiChatResponse } from '../types/ai';

export const aiApi = {
  chatWithSmartBooking: async (message: string, history: any[] = []): Promise<AiChatResponse> => {
    // call through api gateway
    const response = await axiosClient.post('/customer/smart-booking-chat', { message, history });
    return response as any; // axiosClient interceptor returns data directly
  },

  analyzeData: async (question: string): Promise<any> => {
    const response = await axiosClient.post('/organizer/data-analysis', { question });
    return response; // axiosClient interceptor returns data directly
  }
};
