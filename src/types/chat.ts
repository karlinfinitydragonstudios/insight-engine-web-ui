// Chat Types

export type MessageRole = 'user' | 'assistant' | 'system';

export interface DocumentReference {
  documentId: string;
  documentName: string;
  version?: string;
  sectionId?: string;
  chunkId?: string;
  timestamp: string;
}

export interface DocumentContext {
  activeDocumentId: string;
  activeSection?: string;
  documentVersion: string;
}

export interface DataSourceStatus {
  source: 'knowledge_base' | 'tableau' | 'bigwinboard' | 'aboutslots' | 'confluence' | 'slot_graph';
  status: 'pending' | 'loading' | 'completed' | 'error';
  resultCount?: number;
}

export interface PipelineResultSummary {
  pipelineId: string;
  pipelineName: string;
  status: string;
  summary?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  documentReferences: DocumentReference[];
  documentContext?: DocumentContext;
  dataSources?: DataSourceStatus[];
  pipelineResults?: PipelineResultSummary[];
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  documentId?: string;
  messages: ChatMessage[];
  createdAt: string;
  lastActivityAt: string;
}
