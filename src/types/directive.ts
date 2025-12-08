/**
 * Frontend Directive Type Definitions
 *
 * Mirror of server/types/template.ts for frontend use.
 * Defines the structure of directives that control pipeline editing behavior.
 */

// Chunk directive parsed from: <!-- CHUNK: id | POSITION: n | ENTITIES: min-max -->
export interface ChunkDirective {
  id: string;
  position?: number;
  entityRange?: {
    min: number;
    max: number;
  };
}

// Entity types directive: <!-- ENTITY_TYPES: Type1, Type2 -->
export interface EntityTypesDirective {
  types: string[];
}

// Relationship pattern: TYPE -> TargetType
export interface RelationshipPattern {
  type: string;
  targetType: string;
}

// Relationships directive: <!-- RELATIONSHIPS: TYPE -> TargetType -->
export interface RelationshipsDirective {
  patterns: RelationshipPattern[];
}

// Pipeline directive: <!-- PIPELINE: pipeline_name -->
export interface PipelineDirective {
  preferred: string;
  fallback?: string[];
}

// Constraints for block content
export interface ConstraintsDirective {
  minWords?: number;
  maxWords?: number;
  minEntities?: number;
  maxEntities?: number;
}

// Combined directives for a block
export interface BlockDirectives {
  chunk?: ChunkDirective;
  entityTypes?: EntityTypesDirective;
  relationships?: RelationshipsDirective;
  pipeline?: PipelineDirective;
  constraints?: ConstraintsDirective;
  raw?: string[]; // Original directive strings
}

// Combined directives for a section
export interface SectionDirectives {
  sectionId?: string;
  pipeline?: PipelineDirective;
  raw?: string[];
}

// Pipeline names
export type PipelineName =
  | 'knowledge_base'
  | 'tableau'
  | 'bigwinboard'
  | 'aboutslots'
  | 'slot_graph'
  | 'confluence'
  | 'consolidator';

// Pipeline to section affinity (which pipelines prefer which sections)
export const PIPELINE_SECTION_AFFINITY: Record<PipelineName, string[]> = {
  knowledge_base: ['design_vision', 'game_mechanics', 'player_experience'],
  tableau: ['success_metrics', 'progression_systems'],
  bigwinboard: ['game_mechanics', 'math_framework'],
  aboutslots: ['math_framework', 'compliance'],
  slot_graph: ['game_mechanics', 'design_vision'],
  confluence: ['data_sources', 'compliance'],
  consolidator: ['executive_summary'],
};

// Pipeline priority for queue resolution (higher = more priority)
export const PIPELINE_PRIORITY: Record<PipelineName, number> = {
  consolidator: 10,
  knowledge_base: 7,
  tableau: 6,
  bigwinboard: 5,
  aboutslots: 5,
  slot_graph: 5,
  confluence: 4,
};

// Pipeline display colors for UI
export const PIPELINE_COLORS: Record<PipelineName, string> = {
  knowledge_base: '#9333ea', // purple-600
  tableau: '#2563eb', // blue-600
  bigwinboard: '#16a34a', // green-600
  aboutslots: '#ea580c', // orange-600
  slot_graph: '#0891b2', // cyan-600
  confluence: '#64748b', // slate-500
  consolidator: '#eab308', // yellow-500
};

// Validation result for directive compliance
export interface DirectiveValidationResult {
  isValid: boolean;
  errors: DirectiveValidationError[];
  warnings: DirectiveValidationWarning[];
}

export interface DirectiveValidationError {
  type: 'missing_chunk_id' | 'invalid_entity_type' | 'constraint_violation';
  message: string;
  blockId?: string;
}

export interface DirectiveValidationWarning {
  type: 'entity_count_low' | 'entity_count_high' | 'missing_relationship' | 'word_count';
  message: string;
  blockId?: string;
  expected?: number | string;
  actual?: number | string;
}

// Edit intent from a pipeline
export interface EditIntent {
  pipelineName: PipelineName;
  blockId: string;
  sectionId: string;
  priority: number;
  affinityScore: number;
  timestamp: number;
}

// Queued edit waiting for lock
export interface QueuedEdit {
  intent: EditIntent;
  position: number; // Position in queue
  estimatedWaitMs: number;
}

// Streaming edit state
export interface StreamingEdit {
  blockId: string;
  pipelineName: PipelineName;
  streamingContent: string;
  isComplete: boolean;
  startedAt: number;
  lastChunkAt: number;
}
