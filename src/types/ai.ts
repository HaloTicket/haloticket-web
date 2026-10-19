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

