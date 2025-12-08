/**
 * Template and Directive Type Definitions
 *
 * These types define the structure for parsing markdown templates with
 * HTML comment directives into structured documents.
 */

// Directive types that can appear in HTML comments
export type DirectiveType =
  | 'SECTION_ID'
  | 'CHUNK'
  | 'ENTITY_TYPES'
  | 'RELATIONSHIPS'
  | 'PIPELINE'
  | 'DOCUMENT_METADATA';

// Parsed chunk directive: <!-- CHUNK: id | POSITION: n | ENTITIES: min-max -->
export interface ChunkDirective {
  id: string;
  position?: number;
  entityRange?: {
    min: number;
    max: number;
  };
}

// Parsed entity types directive: <!-- ENTITY_TYPES: Type1, Type2 -->
export interface EntityTypesDirective {
  types: string[];
}

// Parsed relationships directive: <!-- RELATIONSHIPS: TYPE -> TargetType -->
export interface RelationshipPattern {
  type: string;
  targetType: string;
}

export interface RelationshipsDirective {
  patterns: RelationshipPattern[];
}

// Parsed pipeline directive: <!-- PIPELINE: pipeline_name -->
export interface PipelineDirective {
  preferred: string;
  fallback?: string[];
}

// Constraints parsed from various sources
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
  raw?: string[]; // Original directive strings for round-trip export
}

// Combined directives for a section
export interface SectionDirectives {
  sectionId?: string;
  pipeline?: PipelineDirective;
  raw?: string[];
}

// Document metadata parsed from template header
export interface DocumentMetadataDirective {
  version?: string;
  status?: 'draft' | 'review' | 'finalized';
  created?: string;
  updated?: string;
  author?: string;
  generationMode?: 'one-shot' | 'editing';
  parentDocumentId?: string;
  totalChunks?: number;
  totalEntities?: number;
}

// Parsed template structure
export interface ParsedTemplate {
  metadata: DocumentMetadataDirective;
  sections: ParsedSection[];
  rawContent: string;
}

export interface ParsedSection {
  id: string;
  type: string;
  title: string;
  position: number;
  directives: SectionDirectives;
  blocks: ParsedBlock[];
}

export interface ParsedBlock {
  id: string;
  type: string;
  position: number;
  content: BlockContent;
  directives: BlockDirectives;
  rawMarkdown: string;
}

// Block content structure (varies by type)
export interface BlockContent {
  text?: string;
  heading?: {
    level: number;
    text: string;
  };
  feature?: {
    featureId?: string;
    name?: string;
    category?: string;
    mechanicalOverview?: string;
    playerExperience?: string;
  };
  mathModel?: {
    modelId?: string;
    name?: string;
    parameters?: Record<string, unknown>;
  };
  table?: {
    headers: string[];
    rows: string[][];
  };
  [key: string]: unknown;
}

// Pipeline to Section affinity mapping
export const PIPELINE_SECTION_AFFINITY: Record<string, string[]> = {
  knowledge_base: ['design_vision', 'game_mechanics', 'player_experience'],
  tableau: ['success_metrics', 'progression_systems', 'metrics'],
  bigwinboard: ['game_mechanics', 'math_framework'],
  aboutslots: ['math_framework', 'compliance'],
  slot_graph: ['game_mechanics', 'design_vision'],
  confluence: ['data_sources', 'compliance', 'attribution'],
  consolidator: ['executive_summary'],
};

// Section type to expected entity types mapping
export const SECTION_EXPECTED_ENTITIES: Record<string, string[]> = {
  executive_summary: ['DesignConcept', 'PlayerArchetype'],
  design_vision: ['DesignConcept', 'FeatureType', 'PlayerMetric'],
  game_mechanics: ['FeatureType', 'PsychologicalMechanism', 'PlayerArchetype'],
  math_framework: ['MathModel', 'VolatilityProfile', 'RTPConfiguration'],
  player_experience: ['PlayerArchetype', 'EngagementDriver', 'PsychologicalMechanism'],
  progression_systems: ['SpinMilestone', 'EngagementDriver', 'PlayerMetric'],
  success_metrics: ['PlayerMetric', 'FeatureType', 'DesignConcept'],
  compliance: ['RTPConfiguration'],
  data_sources: [],
};

// Pipeline priority for edit queue resolution
export const PIPELINE_PRIORITY: Record<string, number> = {
  consolidator: 10,
  knowledge_base: 7,
  tableau: 6,
  bigwinboard: 5,
  aboutslots: 5,
  slot_graph: 5,
  confluence: 4,
};

// Template file info
export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  fileName: string;
  path: string;
  sectionCount: number;
  chunkCount: number;
}

// Request/Response types for API
export interface CreateDocumentFromTemplateRequest {
  templateId: string;
  documentName: string;
  initialMetadata?: Partial<DocumentMetadataDirective>;
}

export interface CreateDocumentFromTemplateResponse {
  documentId: string;
  sectionCount: number;
  blockCount: number;
}

// Validation types
export interface ValidationError {
  type: 'missing_chunk_id' | 'invalid_entity_type' | 'constraint_violation';
  message: string;
  blockId?: string;
}

export interface ValidationWarning {
  type: 'entity_count_low' | 'entity_count_high' | 'missing_relationship' | 'word_count' | 'invalid_entity_type';
  message: string;
  blockId?: string;
  expected?: number | string;
  actual?: number | string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
