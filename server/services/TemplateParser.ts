/**
 * Template Parser Service
 *
 * Parses markdown templates with HTML comment directives into structured documents.
 * Extracts section/block hierarchy and preserves directive metadata for pipeline editing.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ParsedTemplate,
  ParsedSection,
  ParsedBlock,
  BlockDirectives,
  SectionDirectives,
  DocumentMetadataDirective,
  ChunkDirective,
  EntityTypesDirective,
  RelationshipsDirective,
  PipelineDirective,
  BlockContent,
  TemplateInfo,
} from '../types/template';

// Regex patterns for parsing directives
const DIRECTIVE_PATTERN = /<!--\s*([A-Z_]+):\s*(.+?)\s*-->/g;
const SECTION_HEADER_PATTERN = /^##\s+(\d+\.?\d*\.?)\s+(.+)$/m;
const SUBSECTION_HEADER_PATTERN = /^###\s+(\d+\.\d+\.?\d*)\s+(.+)$/m;
const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;
const TABLE_PATTERN = /\|(.+)\|/g;

// Section ID to type mapping
const SECTION_ID_TO_TYPE: Record<string, string> = {
  design_vision: 'design_vision',
  game_mechanics: 'game_mechanics',
  math_framework: 'math_framework',
  player_experience: 'player_experience',
  progression: 'progression_systems',
  metrics: 'success_metrics',
  compliance: 'compliance',
  attribution: 'data_sources',
  changelog: 'custom',
  entity_summary: 'custom',
};

export class TemplateParser {
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || path.join(process.cwd(), 'sandbox', 'templates');
  }

  /**
   * List available templates
   */
  async listTemplates(): Promise<TemplateInfo[]> {
    const templates: TemplateInfo[] = [];

    try {
      const files = fs.readdirSync(this.templatesDir);
      const mdFiles = files.filter((f) => f.endsWith('.md') && !f.startsWith('entity_'));

      for (const file of mdFiles) {
        const filePath = path.join(this.templatesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = this.parseTemplate(content);

        templates.push({
          id: file.replace('.md', ''),
          name: this.extractTemplateName(content),
          description: this.extractDescription(content),
          fileName: file,
          path: filePath,
          sectionCount: parsed.sections.length,
          chunkCount: parsed.sections.reduce((acc, s) => acc + s.blocks.length, 0),
        });
      }
    } catch (error) {
      console.error('Error listing templates:', error);
    }

    return templates;
  }

  /**
   * Load and parse a template by ID
   */
  async loadTemplate(templateId: string): Promise<ParsedTemplate> {
    const filePath = path.join(this.templatesDir, `${templateId}.md`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseTemplate(content);
  }

  /**
   * Parse markdown template content into structured format
   */
  parseTemplate(content: string): ParsedTemplate {
    const metadata = this.parseMetadata(content);
    const sections = this.parseSections(content);

    return {
      metadata,
      sections,
      rawContent: content,
    };
  }

  /**
   * Extract document metadata from header comments
   */
  private parseMetadata(content: string): DocumentMetadataDirective {
    const metadata: DocumentMetadataDirective = {};

    // Find metadata block
    const metadataMatch = content.match(
      /<!--\s*DOCUMENT METADATA\s*-->([\s\S]*?)<!--\s*END METADATA\s*-->/
    );

    if (metadataMatch) {
      const metadataBlock = metadataMatch[1];
      const lines = metadataBlock.split('\n');

      for (const line of lines) {
        const match = line.match(/<!--\s*(\w+):\s*(.+?)\s*-->/);
        if (match) {
          const [, key, value] = match;
          switch (key.toLowerCase()) {
            case 'version':
              metadata.version = value;
              break;
            case 'status':
              metadata.status = value as 'draft' | 'review' | 'finalized';
              break;
            case 'created':
              metadata.created = value;
              break;
            case 'updated':
              metadata.updated = value;
              break;
            case 'author':
              metadata.author = value;
              break;
            case 'generation_mode':
              metadata.generationMode = value as 'one-shot' | 'editing';
              break;
            case 'parent_document_id':
              metadata.parentDocumentId = value;
              break;
            case 'total_chunks':
              metadata.totalChunks = parseInt(value) || undefined;
              break;
            case 'total_entities':
              metadata.totalEntities = parseInt(value) || undefined;
              break;
          }
        }
      }
    }

    return metadata;
  }

  /**
   * Parse sections from markdown content
   */
  private parseSections(content: string): ParsedSection[] {
    const sections: ParsedSection[] = [];
    let currentSection: ParsedSection | null = null;
    let currentSectionContent = '';
    let sectionPosition = 0;

    // Split content by major section headers (## N. Title)
    const lines = content.split('\n');
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for section header
      const sectionMatch = line.match(/^##\s+(\d+)\.\s+(.+)$/);

      if (sectionMatch) {
        // Save previous section
        if (currentSection && currentSectionContent) {
          currentSection.blocks = this.parseBlocks(currentSectionContent, currentSection.id);
          sections.push(currentSection);
        }

        const [, number, title] = sectionMatch;
        const sectionId = this.inferSectionId(title, currentSectionContent, lines, i);

        currentSection = {
          id: sectionId,
          type: SECTION_ID_TO_TYPE[sectionId] || 'custom',
          title: title.trim(),
          position: sectionPosition++,
          directives: { sectionId },
          blocks: [],
        };
        currentSectionContent = '';
        inSection = true;
        continue;
      }

      // Check for SECTION_ID directive
      const sectionIdMatch = line.match(/<!--\s*SECTION_ID:\s*(\w+)\s*-->/);
      if (sectionIdMatch && currentSection) {
        currentSection.id = sectionIdMatch[1];
        currentSection.type = SECTION_ID_TO_TYPE[sectionIdMatch[1]] || 'custom';
        currentSection.directives.sectionId = sectionIdMatch[1];
      }

      if (inSection) {
        currentSectionContent += line + '\n';
      }
    }

    // Don't forget the last section
    if (currentSection && currentSectionContent) {
      currentSection.blocks = this.parseBlocks(currentSectionContent, currentSection.id);
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Parse blocks within a section
   */
  private parseBlocks(sectionContent: string, sectionId: string): ParsedBlock[] {
    const blocks: ParsedBlock[] = [];
    let currentBlock: Partial<ParsedBlock> | null = null;
    let currentDirectives: BlockDirectives = {};
    let currentContent = '';
    let blockPosition = 0;

    const lines = sectionContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for CHUNK directive (starts a new block)
      const chunkMatch = line.match(/<!--\s*CHUNK:\s*(.+?)\s*-->/);
      if (chunkMatch) {
        // Save previous block
        if (currentBlock && currentContent.trim()) {
          currentBlock.content = this.parseBlockContent(currentContent, currentBlock.type || 'paragraph');
          currentBlock.rawMarkdown = currentContent;
          blocks.push(currentBlock as ParsedBlock);
        }

        // Parse chunk directive
        const chunkDirective = this.parseChunkDirective(chunkMatch[1]);

        currentDirectives = {
          chunk: chunkDirective,
          raw: [line],
        };
        currentBlock = {
          id: chunkDirective.id,
          type: this.inferBlockType(lines, i, sectionId),
          position: chunkDirective.position ?? blockPosition++,
          directives: currentDirectives,
        };
        currentContent = '';
        continue;
      }

      // Check for other directives and add to current block
      const directiveMatch = line.match(/<!--\s*([A-Z_]+):\s*(.+?)\s*-->/);
      if (directiveMatch && currentBlock) {
        const [, directiveType, directiveValue] = directiveMatch;
        currentDirectives.raw = currentDirectives.raw || [];
        currentDirectives.raw.push(line);

        switch (directiveType) {
          case 'ENTITY_TYPES':
            currentDirectives.entityTypes = this.parseEntityTypesDirective(directiveValue);
            break;
          case 'RELATIONSHIPS':
            currentDirectives.relationships = this.parseRelationshipsDirective(directiveValue);
            break;
          case 'PIPELINE':
            currentDirectives.pipeline = this.parsePipelineDirective(directiveValue);
            break;
        }
        continue;
      }

      // Accumulate content
      if (currentBlock) {
        currentContent += line + '\n';
      }
    }

    // Don't forget the last block
    if (currentBlock && currentContent.trim()) {
      currentBlock.content = this.parseBlockContent(currentContent, currentBlock.type || 'paragraph');
      currentBlock.rawMarkdown = currentContent;
      blocks.push(currentBlock as ParsedBlock);
    }

    return blocks;
  }

  /**
   * Parse CHUNK directive value: "id | POSITION: n | ENTITIES: min-max"
   */
  private parseChunkDirective(value: string): ChunkDirective {
    const parts = value.split('|').map((p) => p.trim());
    const directive: ChunkDirective = { id: parts[0] };

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];

      const posMatch = part.match(/POSITION:\s*(\d+)/);
      if (posMatch) {
        directive.position = parseInt(posMatch[1]);
      }

      const entitiesMatch = part.match(/ENTITIES:\s*(\d+)-(\d+)/);
      if (entitiesMatch) {
        directive.entityRange = {
          min: parseInt(entitiesMatch[1]),
          max: parseInt(entitiesMatch[2]),
        };
      }
    }

    return directive;
  }

  /**
   * Parse ENTITY_TYPES directive: "Type1, Type2, Type3"
   */
  private parseEntityTypesDirective(value: string): EntityTypesDirective {
    return {
      types: value.split(',').map((t) => t.trim()),
    };
  }

  /**
   * Parse RELATIONSHIPS directive: "TYPE1 -> Target1, TYPE2 -> Target2"
   */
  private parseRelationshipsDirective(value: string): RelationshipsDirective {
    const patterns = value.split(',').map((r) => {
      const match = r.trim().match(/(\w+)\s*->\s*(\w+)/);
      if (match) {
        return { type: match[1], targetType: match[2] };
      }
      return null;
    });

    return {
      patterns: patterns.filter((p): p is { type: string; targetType: string } => p !== null),
    };
  }

  /**
   * Parse PIPELINE directive: "pipeline_name" or "primary, fallback1, fallback2"
   */
  private parsePipelineDirective(value: string): PipelineDirective {
    const parts = value.split(',').map((p) => p.trim());
    return {
      preferred: parts[0],
      fallback: parts.length > 1 ? parts.slice(1) : undefined,
    };
  }

  /**
   * Infer block type from surrounding content
   */
  private inferBlockType(lines: string[], startIndex: number, sectionId: string): string {
    // Look at the next few non-directive lines
    for (let i = startIndex + 1; i < Math.min(startIndex + 10, lines.length); i++) {
      const line = lines[i].trim();

      // Skip empty lines and directives
      if (!line || line.startsWith('<!--')) continue;

      // Check for heading
      if (line.startsWith('#')) {
        return 'heading';
      }

      // Check for table
      if (line.startsWith('|') && line.includes('|')) {
        return 'metric_table';
      }

      // Check for feature pattern
      if (line.includes('**Feature ID**') || line.includes('**Feature Name**')) {
        return 'feature';
      }

      // Check for math model pattern
      if (line.includes('**Model ID**') || line.includes('**Volatility')) {
        return 'math_model';
      }

      // Check for archetype pattern
      if (line.includes('**Archetype ID**') || line.includes('**Player Profile**')) {
        return 'archetype_profile';
      }

      // Default based on section
      if (sectionId === 'math_framework') {
        return 'math_model';
      }
      if (sectionId === 'game_mechanics') {
        return 'feature';
      }
      if (sectionId === 'player_experience') {
        return 'archetype_profile';
      }

      return 'paragraph';
    }

    return 'paragraph';
  }

  /**
   * Parse block content based on type
   */
  private parseBlockContent(markdown: string, blockType: string): BlockContent {
    const trimmed = markdown.trim();

    switch (blockType) {
      case 'heading': {
        const match = trimmed.match(/^(#{1,6})\s+(.+)$/m);
        if (match) {
          return {
            heading: {
              level: match[1].length,
              text: match[2],
            },
          };
        }
        return { text: trimmed };
      }

      case 'metric_table': {
        const rows = trimmed.split('\n').filter((line) => line.includes('|'));
        if (rows.length >= 2) {
          const headers = rows[0]
            .split('|')
            .filter((c) => c.trim())
            .map((c) => c.trim());
          const dataRows = rows.slice(2).map((row) =>
            row
              .split('|')
              .filter((c) => c.trim())
              .map((c) => c.trim())
          );
          return {
            table: {
              headers,
              rows: dataRows,
            },
          };
        }
        return { text: trimmed };
      }

      case 'feature': {
        return {
          text: trimmed,
          feature: this.extractFeatureFields(trimmed),
        };
      }

      case 'math_model': {
        return {
          text: trimmed,
          mathModel: this.extractMathModelFields(trimmed),
        };
      }

      default:
        return { text: trimmed };
    }
  }

  /**
   * Extract feature fields from markdown
   */
  private extractFeatureFields(
    markdown: string
  ): BlockContent['feature'] {
    const feature: BlockContent['feature'] = {};

    const idMatch = markdown.match(/\*\*Feature ID\*\*:\s*`?([^`\n]+)`?/);
    if (idMatch) feature.featureId = idMatch[1].trim();

    const nameMatch = markdown.match(/\*\*Feature Name\*\*:\s*(.+)/);
    if (nameMatch) feature.name = nameMatch[1].trim();

    const categoryMatch = markdown.match(/\*\*Feature Category\*\*:\s*(.+)/);
    if (categoryMatch) feature.category = categoryMatch[1].trim();

    return feature;
  }

  /**
   * Extract math model fields from markdown
   */
  private extractMathModelFields(
    markdown: string
  ): BlockContent['mathModel'] {
    const model: BlockContent['mathModel'] = {};

    const idMatch = markdown.match(/\*\*Model ID\*\*:\s*`?([^`\n]+)`?/);
    if (idMatch) model.modelId = idMatch[1].trim();

    const nameMatch = markdown.match(/\*\*Model Name\*\*:\s*(.+)/);
    if (nameMatch) model.name = nameMatch[1].trim();

    return model;
  }

  /**
   * Infer section ID from title and context
   */
  private inferSectionId(
    title: string,
    precedingContent: string,
    lines: string[],
    currentIndex: number
  ): string {
    // Check for explicit SECTION_ID directive in following lines
    for (let i = currentIndex + 1; i < Math.min(currentIndex + 5, lines.length); i++) {
      const match = lines[i].match(/<!--\s*SECTION_ID:\s*(\w+)\s*-->/);
      if (match) {
        return match[1];
      }
    }

    // Infer from title
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('executive') || lowerTitle.includes('summary')) {
      return 'executive_summary';
    }
    if (lowerTitle.includes('design') && lowerTitle.includes('vision')) {
      return 'design_vision';
    }
    if (lowerTitle.includes('mechanic') || lowerTitle.includes('feature')) {
      return 'game_mechanics';
    }
    if (lowerTitle.includes('math') || lowerTitle.includes('balance')) {
      return 'math_framework';
    }
    if (lowerTitle.includes('player') && lowerTitle.includes('experience')) {
      return 'player_experience';
    }
    if (lowerTitle.includes('progression') || lowerTitle.includes('milestone')) {
      return 'progression_systems';
    }
    if (lowerTitle.includes('metric') || lowerTitle.includes('success')) {
      return 'success_metrics';
    }
    if (lowerTitle.includes('compliance') || lowerTitle.includes('regulatory')) {
      return 'compliance';
    }
    if (lowerTitle.includes('source') || lowerTitle.includes('attribution')) {
      return 'data_sources';
    }

    return 'custom';
  }

  /**
   * Extract template name from content
   */
  private extractTemplateName(content: string): string {
    const match = content.match(/^#\s+(.+?)(?:\[|\n)/m);
    if (match) {
      return match[1].replace(':', '').trim();
    }
    return 'Unnamed Template';
  }

  /**
   * Extract description from content
   */
  private extractDescription(content: string): string {
    // Look for first paragraph after title
    const lines = content.split('\n');
    let foundTitle = false;

    for (const line of lines) {
      if (line.startsWith('# ')) {
        foundTitle = true;
        continue;
      }
      if (foundTitle && line.trim() && !line.startsWith('#') && !line.startsWith('<!--')) {
        return line.trim().substring(0, 200);
      }
    }

    return 'No description available';
  }
}

// Singleton instance
export const templateParser = new TemplateParser();
