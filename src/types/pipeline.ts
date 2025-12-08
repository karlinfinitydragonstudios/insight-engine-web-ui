// Pipeline Types

export type PipelineName =
  | 'knowledge_base'
  | 'tableau'
  | 'bigwinboard'
  | 'aboutslots'
  | 'slot_graph'
  | 'confluence'
  | 'consolidator';

export type PipelineStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface PipelineState {
  name: PipelineName;
  status: PipelineStatus;
  progress: number;
  currentTurn: number;
  maxTurns: number;
  startedAt?: number;
  completedAt?: number;
  allocatedBlocks?: string[];
  error?: string;
  lastContent?: string;
}

export interface PipelineEvent {
  type: 'started' | 'progress' | 'content' | 'block_update' | 'complete' | 'error';
  sessionId: string;
  pipelineName: PipelineName | string;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface PipelineControlAction {
  action: 'pause' | 'resume' | 'cancel' | 'redirect';
  pipelineName: string;
  payload?: Record<string, unknown>;
}

export interface BlockUpdate {
  blockId: string;
  sectionId: string;
  content: Record<string, unknown>;
  pipelineName: string;
  timestamp: number;
}
