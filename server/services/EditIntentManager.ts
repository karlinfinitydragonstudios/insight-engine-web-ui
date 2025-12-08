/**
 * Edit Intent Manager
 *
 * Manages the queue of edit intents from pipelines.
 * Coordinates with BlockLockManager to grant locks based on priority and affinity.
 */

import { EventEmitter } from 'events';
import {
  PIPELINE_SECTION_AFFINITY,
  PIPELINE_PRIORITY,
} from '../types/template';

// Edit intent from a pipeline
export interface EditIntent {
  id: string;
  pipelineName: string;
  documentId: string;
  sectionId: string;
  blockId: string;
  priority: number;
  affinityScore: number;
  timestamp: number;
  status: 'pending' | 'queued' | 'granted' | 'completed' | 'cancelled';
}

// Queue entry with computed score
interface QueueEntry {
  intent: EditIntent;
  score: number; // Combined priority + affinity + time bonus
  queuedAt: number;
}

// Events emitted by EditIntentManager
export interface EditIntentEvents {
  'intent:declared': (intent: EditIntent) => void;
  'intent:queued': (intent: EditIntent, position: number) => void;
  'intent:granted': (intent: EditIntent) => void;
  'intent:completed': (intent: EditIntent) => void;
  'intent:cancelled': (intent: EditIntent, reason: string) => void;
  'queue:updated': (documentId: string, queue: QueueEntry[]) => void;
}

export class EditIntentManager extends EventEmitter {
  // Queue per document -> per block
  private queues: Map<string, Map<string, QueueEntry[]>> = new Map();

  // Active intents by ID
  private intents: Map<string, EditIntent> = new Map();

  // Lock grant callback (injected by PipelineOrchestrator)
  private lockGrantCallback?: (intent: EditIntent) => Promise<boolean>;

  constructor() {
    super();
  }

  /**
   * Set the callback for granting locks
   */
  setLockGrantCallback(callback: (intent: EditIntent) => Promise<boolean>): void {
    this.lockGrantCallback = callback;
  }

  /**
   * Declare an edit intent from a pipeline
   */
  declareIntent(
    pipelineName: string,
    documentId: string,
    sectionId: string,
    blockId: string,
    sectionType?: string
  ): EditIntent {
    const basePriority = PIPELINE_PRIORITY[pipelineName] || 5;
    const affinityScore = this.calculateAffinityScore(pipelineName, sectionType);

    const intent: EditIntent = {
      id: `${pipelineName}-${blockId}-${Date.now()}`,
      pipelineName,
      documentId,
      sectionId,
      blockId,
      priority: basePriority,
      affinityScore,
      timestamp: Date.now(),
      status: 'pending',
    };

    this.intents.set(intent.id, intent);
    this.emit('intent:declared', intent);

    return intent;
  }

  /**
   * Calculate affinity score based on pipeline-section mapping
   */
  private calculateAffinityScore(pipelineName: string, sectionType?: string): number {
    if (!sectionType) return 0;

    const affineSections = PIPELINE_SECTION_AFFINITY[pipelineName] || [];
    const index = affineSections.indexOf(sectionType);

    if (index === -1) return 0;
    // Higher score for better affinity match (first in list = best match)
    return Math.max(0, 3 - index);
  }

  /**
   * Queue an intent for lock acquisition
   */
  async queueIntent(intentId: string): Promise<number> {
    const intent = this.intents.get(intentId);
    if (!intent) {
      throw new Error(`Intent not found: ${intentId}`);
    }

    const { documentId, blockId } = intent;

    // Get or create document queue
    if (!this.queues.has(documentId)) {
      this.queues.set(documentId, new Map());
    }
    const docQueues = this.queues.get(documentId)!;

    // Get or create block queue
    if (!docQueues.has(blockId)) {
      docQueues.set(blockId, []);
    }
    const blockQueue = docQueues.get(blockId)!;

    // Calculate combined score
    const score = this.calculateScore(intent);

    const entry: QueueEntry = {
      intent,
      score,
      queuedAt: Date.now(),
    };

    // Insert in sorted order (highest score first)
    const insertIndex = blockQueue.findIndex((e) => e.score < score);
    if (insertIndex === -1) {
      blockQueue.push(entry);
    } else {
      blockQueue.splice(insertIndex, 0, entry);
    }

    intent.status = 'queued';
    const position = blockQueue.indexOf(entry);

    this.emit('intent:queued', intent, position);
    this.emit('queue:updated', documentId, blockQueue);

    // Try to grant if first in queue
    if (position === 0) {
      await this.tryGrantNext(documentId, blockId);
    }

    return position;
  }

  /**
   * Calculate combined score for queue ordering
   */
  private calculateScore(intent: EditIntent): number {
    // Base priority (0-10)
    let score = intent.priority * 10;

    // Affinity bonus (0-3)
    score += intent.affinityScore * 5;

    // Time decay: older requests get slight bonus
    const ageMs = Date.now() - intent.timestamp;
    const ageBonus = Math.min(ageMs / 10000, 5); // Max 5 points for 50+ seconds
    score += ageBonus;

    return score;
  }

  /**
   * Try to grant the next intent in queue
   */
  private async tryGrantNext(documentId: string, blockId: string): Promise<void> {
    const docQueues = this.queues.get(documentId);
    if (!docQueues) return;

    const blockQueue = docQueues.get(blockId);
    if (!blockQueue || blockQueue.length === 0) return;

    const nextEntry = blockQueue[0];
    const intent = nextEntry.intent;

    if (intent.status !== 'queued') return;

    // Try to acquire lock
    if (this.lockGrantCallback) {
      const granted = await this.lockGrantCallback(intent);
      if (granted) {
        intent.status = 'granted';
        this.emit('intent:granted', intent);
      }
    } else {
      // No lock manager, auto-grant
      intent.status = 'granted';
      this.emit('intent:granted', intent);
    }
  }

  /**
   * Mark an intent as completed and process next in queue
   */
  async completeIntent(intentId: string): Promise<void> {
    const intent = this.intents.get(intentId);
    if (!intent) return;

    const { documentId, blockId } = intent;

    intent.status = 'completed';
    this.emit('intent:completed', intent);

    // Remove from queue
    this.removeFromQueue(documentId, blockId, intentId);

    // Try to grant next
    await this.tryGrantNext(documentId, blockId);
  }

  /**
   * Cancel an intent
   */
  cancelIntent(intentId: string, reason: string): void {
    const intent = this.intents.get(intentId);
    if (!intent) return;

    const { documentId, blockId } = intent;

    intent.status = 'cancelled';
    this.emit('intent:cancelled', intent, reason);

    // Remove from queue
    this.removeFromQueue(documentId, blockId, intentId);

    // Clean up
    this.intents.delete(intentId);
  }

  /**
   * Remove an intent from the queue
   */
  private removeFromQueue(documentId: string, blockId: string, intentId: string): void {
    const docQueues = this.queues.get(documentId);
    if (!docQueues) return;

    const blockQueue = docQueues.get(blockId);
    if (!blockQueue) return;

    const index = blockQueue.findIndex((e) => e.intent.id === intentId);
    if (index !== -1) {
      blockQueue.splice(index, 1);
      this.emit('queue:updated', documentId, blockQueue);
    }

    // Clean up empty queues
    if (blockQueue.length === 0) {
      docQueues.delete(blockId);
    }
    if (docQueues.size === 0) {
      this.queues.delete(documentId);
    }
  }

  /**
   * Get queue position for an intent
   */
  getQueuePosition(intentId: string): number {
    const intent = this.intents.get(intentId);
    if (!intent) return -1;

    const { documentId, blockId } = intent;
    const docQueues = this.queues.get(documentId);
    if (!docQueues) return -1;

    const blockQueue = docQueues.get(blockId);
    if (!blockQueue) return -1;

    return blockQueue.findIndex((e) => e.intent.id === intentId);
  }

  /**
   * Get all pending intents for a document
   */
  getDocumentIntents(documentId: string): EditIntent[] {
    return Array.from(this.intents.values()).filter(
      (i) => i.documentId === documentId && i.status !== 'completed' && i.status !== 'cancelled'
    );
  }

  /**
   * Get all intents for a specific block
   */
  getBlockIntents(documentId: string, blockId: string): EditIntent[] {
    return Array.from(this.intents.values()).filter(
      (i) =>
        i.documentId === documentId &&
        i.blockId === blockId &&
        i.status !== 'completed' &&
        i.status !== 'cancelled'
    );
  }

  /**
   * Get the current queue for a block
   */
  getBlockQueue(documentId: string, blockId: string): QueueEntry[] {
    const docQueues = this.queues.get(documentId);
    if (!docQueues) return [];

    return docQueues.get(blockId) || [];
  }

  /**
   * Cancel all intents for a pipeline
   */
  cancelPipelineIntents(pipelineName: string, reason: string): void {
    const toCancel = Array.from(this.intents.values()).filter(
      (i) => i.pipelineName === pipelineName && i.status !== 'completed' && i.status !== 'cancelled'
    );

    for (const intent of toCancel) {
      this.cancelIntent(intent.id, reason);
    }
  }

  /**
   * Cancel all intents for a document
   */
  cancelDocumentIntents(documentId: string, reason: string): void {
    const toCancel = Array.from(this.intents.values()).filter(
      (i) => i.documentId === documentId && i.status !== 'completed' && i.status !== 'cancelled'
    );

    for (const intent of toCancel) {
      this.cancelIntent(intent.id, reason);
    }
  }

  /**
   * Get intent by ID
   */
  getIntent(intentId: string): EditIntent | undefined {
    return this.intents.get(intentId);
  }

  /**
   * Cleanup completed/cancelled intents older than specified age
   */
  cleanup(maxAgeMs: number = 5 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;

    for (const [id, intent] of this.intents) {
      if (
        (intent.status === 'completed' || intent.status === 'cancelled') &&
        intent.timestamp < cutoff
      ) {
        this.intents.delete(id);
      }
    }
  }
}

// Singleton instance
export const editIntentManager = new EditIntentManager();
