import type { BlockDirectives, ValidationResult, ValidationError, ValidationWarning } from '../types/template';

/**
 * Validates block content against directive constraints
 */
export class DirectiveValidator {
  /**
   * Validate block content against its directives
   */
  validate(
    blockId: string,
    content: Record<string, unknown>,
    directives: BlockDirectives
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Extract text content for analysis
    const text = this.extractText(content);
    const wordCount = this.countWords(text);

    // Extract entities if present
    const entities = (content.entities as Array<{ type: string }>) || [];

    // Validate chunk ID requirement
    if (directives.chunk && !directives.chunk.id) {
      errors.push({
        type: 'missing_chunk_id',
        message: 'Block requires a chunk ID but none was provided',
        blockId,
      });
    }

    // Validate entity count
    if (directives.chunk?.entityRange) {
      const { min, max } = directives.chunk.entityRange;
      const entityCount = entities.length;

      if (entityCount < min) {
        warnings.push({
          type: 'entity_count_low',
          message: `Block has ${entityCount} entities, expected at least ${min}`,
          blockId,
          expected: min,
          actual: entityCount,
        });
      }

      if (entityCount > max) {
        warnings.push({
          type: 'entity_count_high',
          message: `Block has ${entityCount} entities, expected at most ${max}`,
          blockId,
          expected: max,
          actual: entityCount,
        });
      }
    }

    // Validate entity types
    if (directives.entityTypes?.types && entities.length > 0) {
      const allowedTypes = new Set(directives.entityTypes.types);
      const invalidEntities = entities.filter((e) => !allowedTypes.has(e.type));

      if (invalidEntities.length > 0) {
        warnings.push({
          type: 'invalid_entity_type',
          message: `Block contains ${invalidEntities.length} entities with unexpected types: ${invalidEntities.map((e) => e.type).join(', ')}`,
          blockId,
          expected: directives.entityTypes.types.join(', '),
          actual: invalidEntities.map((e) => e.type).join(', '),
        });
      }
    }

    // Validate relationships
    if (directives.relationships?.patterns) {
      const relationships = (content.relationships as Array<{ type: string; targetType: string }>) || [];

      for (const pattern of directives.relationships.patterns) {
        const hasMatch = relationships.some(
          (r) => r.type === pattern.type && r.targetType === pattern.targetType
        );

        if (!hasMatch) {
          warnings.push({
            type: 'missing_relationship',
            message: `Expected relationship ${pattern.type} -> ${pattern.targetType} not found`,
            blockId,
            expected: `${pattern.type} -> ${pattern.targetType}`,
          });
        }
      }
    }

    // Validate word count constraints
    if (directives.constraints) {
      const { minWords, maxWords } = directives.constraints;

      if (minWords && wordCount < minWords) {
        warnings.push({
          type: 'word_count',
          message: `Block has ${wordCount} words, expected at least ${minWords}`,
          blockId,
          expected: minWords,
          actual: wordCount,
        });
      }

      if (maxWords && wordCount > maxWords) {
        warnings.push({
          type: 'word_count',
          message: `Block has ${wordCount} words, expected at most ${maxWords}`,
          blockId,
          expected: maxWords,
          actual: wordCount,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate multiple blocks
   */
  validateBlocks(
    blocks: Array<{
      id: string;
      content: Record<string, unknown>;
      directives: BlockDirectives;
    }>
  ): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();

    for (const block of blocks) {
      results.set(block.id, this.validate(block.id, block.content, block.directives));
    }

    return results;
  }

  /**
   * Get summary of validation across all blocks
   */
  getSummary(results: Map<string, ValidationResult>): {
    totalBlocks: number;
    validBlocks: number;
    errorCount: number;
    warningCount: number;
    blocksByStatus: { valid: string[]; errors: string[]; warnings: string[] };
  } {
    const summary = {
      totalBlocks: results.size,
      validBlocks: 0,
      errorCount: 0,
      warningCount: 0,
      blocksByStatus: {
        valid: [] as string[],
        errors: [] as string[],
        warnings: [] as string[],
      },
    };

    results.forEach((result, blockId) => {
      summary.errorCount += result.errors.length;
      summary.warningCount += result.warnings.length;

      if (result.errors.length > 0) {
        summary.blocksByStatus.errors.push(blockId);
      } else if (result.warnings.length > 0) {
        summary.blocksByStatus.warnings.push(blockId);
      } else {
        summary.validBlocks++;
        summary.blocksByStatus.valid.push(blockId);
      }
    });

    return summary;
  }

  /**
   * Extract text from block content
   */
  private extractText(content: Record<string, unknown>): string {
    if (typeof content.text === 'string') {
      return content.text;
    }
    if (typeof content.content === 'string') {
      return content.content;
    }
    // Recursively extract text from nested objects
    return JSON.stringify(content);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length;
  }
}

// Singleton instance
export const directiveValidator = new DirectiveValidator();
