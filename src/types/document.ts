// Document Types - Schema-Suggested (Flexible)

export type DocumentStatus = 'draft' | 'review' | 'finalized' | 'archived';

export type SectionType =
  | 'executive_summary'
  | 'design_vision'
  | 'game_mechanics'
  | 'math_framework'
  | 'player_experience'
  | 'progression_systems'
  | 'success_metrics'
  | 'compliance'
  | 'data_sources'
  | 'custom';

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'feature'
  | 'math_model'
  | 'metric_table'
  | 'archetype_profile'
  | 'chart'
  | 'image'
  | 'media'
  | 'callout'
  | 'competitor_analysis'
  | 'ab_test_result';

export interface EntityReference {
  entityId: string;
  entityType: string;
  entityName: string;
  position?: { start: number; end: number };
}

export interface RelationshipReference {
  relationshipId: string;
  type: string;
  sourceId: string;
  targetId: string;
}

export interface Block {
  id: string;
  type: BlockType | string;
  content: Record<string, unknown>;
  position: number;
  entities: EntityReference[];
  relationships: RelationshipReference[];
  wordCount: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SectionValidation {
  suggestedBlockTypes: string[];
  warnings: string[];
}

export interface Section {
  id: string;
  type: SectionType | 'custom';
  title: string;
  blocks: Block[];
  position: number;
  validation?: SectionValidation;
}

export interface Entity {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
}

export interface Relationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties?: Record<string, unknown>;
}

export interface DocumentGraph {
  entities: Entity[];
  relationships: Relationship[];
}

export interface DocumentMetadata {
  fileName: string;
  version: string;
  status: DocumentStatus;
  gameType?: string;
  targetPlatforms?: string[];
  targetMarkets?: string[];
  author?: string;
  generationMode?: 'one-shot' | 'editing' | 'collaborative';
}

export interface Document {
  id: string;
  fileName: string;
  version: string;
  status: DocumentStatus;
  content: {
    sections: Section[];
    order: string[];
  };
  metadata: DocumentMetadata;
  graph: DocumentGraph;
  createdAt: string;
  updatedAt: string;
}

// Block Lock Types
export interface BlockLock {
  id: string;
  blockId: string;
  documentId: string;
  sessionId: string;
  lockedBy: string;
  lockType: 'exclusive';
  acquiredAt: string;
  expiresAt: string;
}
