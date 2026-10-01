export interface AiSystemAction {
  action: string;
  extracted_args?: any;
  database_data?: any;
}

export interface AiChatResponse {
  reply: string;
  system_actions: AiSystemAction[];
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  actions?: AiSystemAction[];
  timestamp: Date;
}
