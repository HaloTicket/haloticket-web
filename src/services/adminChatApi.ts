import type { AiChatResponse, ChatConversationSummary } from '@/types/ai';
import axiosClient from './axiosClient';

export interface AdminChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  tools_used?: string[];
  grounded?: boolean;
}

type AdminChatHistory = ChatConversationSummary & { messages: AdminChatHistoryMessage[] };
const path = '/admin/assistant-conversations';

export function adminChatApi(owner: string, signal: AbortSignal) {
  const config = { signal, headers: { 'X-Admin-Chat-Owner': owner } };
  return {
    list: () => axiosClient.get<unknown, ChatConversationSummary[]>(path, config),
    create: (id: string) => axiosClient.post<unknown, ChatConversationSummary>(path, { id }, config),
    get: (id: string) => axiosClient.get<unknown, AdminChatHistory>(`${path}/${id}`, config),
    pin: (id: string, is_pinned: boolean) =>
      axiosClient.patch<unknown, ChatConversationSummary>(`${path}/${id}`, { is_pinned }, config),
    remove: (id?: string) => axiosClient.delete(id ? `${path}/${id}` : path, config),
    send: (message: string, conversation_id: string, request_id: string) =>
      axiosClient.post<unknown, AiChatResponse>('/admin/assistant-chat', { message, conversation_id, request_id }, config),
  };
}
