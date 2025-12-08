import { db } from '../config/database';
import { blockLocks } from '../db/schema';
import { eq, and, lt, inArray } from 'drizzle-orm';

export interface BlockLock {
  blockId: string;
  documentId: string;
  sessionId: string;
  lockedBy: string;
  acquiredAt: Date;
  expiresAt: Date;
}

export interface LockRequest {
  blockIds: string[];
  documentId: string;
  sessionId: string;
  requestedBy: string;
  timeoutMs?: number;
}

export interface LockResult {
  granted: BlockLock[];
  denied: { blockId: string; heldBy: string }[];
}

export class BlockLockManager {
  private readonly DEFAULT_LOCK_TIMEOUT = 30_000; // 30 seconds

  /**
   * Attempt to acquire exclusive locks on blocks.
   * Returns which locks were granted and which were denied.
   */
  async acquireLocks(request: LockRequest): Promise<LockResult> {
    const { blockIds, documentId, sessionId, requestedBy, timeoutMs } = request;
    const expiresAt = new Date(Date.now() + (timeoutMs || this.DEFAULT_LOCK_TIMEOUT));

    const granted: BlockLock[] = [];
    const denied: { blockId: string; heldBy: string }[] = [];

    // Clean up expired locks first
    await db().delete(blockLocks).where(lt(blockLocks.expiresAt, new Date()));

    for (const blockId of blockIds) {
      try {
        // Check if lock exists
        const [existing] = await db()
          .select()
          .from(blockLocks)
          .where(eq(blockLocks.blockId, blockId))
          .limit(1);

        if (existing) {
          denied.push({
            blockId,
            heldBy: existing.lockedBy,
          });
          continue;
        }

        // Try to acquire lock
        const [lock] = await db()
          .insert(blockLocks)
          .values({
            blockId,
            documentId,
            sessionId,
            lockedBy: requestedBy,
            expiresAt,
          })
          .returning();

        granted.push({
          blockId: lock.blockId,
          documentId: lock.documentId,
          sessionId: lock.sessionId,
          lockedBy: lock.lockedBy,
          acquiredAt: lock.acquiredAt,
          expiresAt: lock.expiresAt,
        });
      } catch (error) {
        // Lock might have been acquired by another process
        const [existing] = await db()
          .select()
          .from(blockLocks)
          .where(eq(blockLocks.blockId, blockId))
          .limit(1);

        denied.push({
          blockId,
          heldBy: existing?.lockedBy || 'unknown',
        });
      }
    }

    return { granted, denied };
  }

  /**
   * Release locks held by a specific entity
   */
  async releaseLocks(blockIds: string[], lockedBy: string): Promise<void> {
    if (blockIds.length === 0) return;

    await db()
      .delete(blockLocks)
      .where(
        and(
          inArray(blockLocks.blockId, blockIds),
          eq(blockLocks.lockedBy, lockedBy)
        )
      );
  }

  /**
   * Release all locks for a session (used on disconnect)
   */
  async releaseSessionLocks(sessionId: string): Promise<void> {
    await db().delete(blockLocks).where(eq(blockLocks.sessionId, sessionId));
  }

  /**
   * Extend lock timeout (for long-running operations)
   */
  async extendLocks(blockIds: string[], lockedBy: string, additionalMs: number): Promise<void> {
    if (blockIds.length === 0) return;

    const newExpiresAt = new Date(Date.now() + additionalMs);

    await db()
      .update(blockLocks)
      .set({ expiresAt: newExpiresAt })
      .where(
        and(
          inArray(blockLocks.blockId, blockIds),
          eq(blockLocks.lockedBy, lockedBy)
        )
      );
  }

  /**
   * Get all locks for a document (for UI display)
   */
  async getDocumentLocks(documentId: string): Promise<BlockLock[]> {
    // Clean up expired locks first
    await db().delete(blockLocks).where(lt(blockLocks.expiresAt, new Date()));

    const locks = await db()
      .select()
      .from(blockLocks)
      .where(eq(blockLocks.documentId, documentId));

    return locks.map((lock) => ({
      blockId: lock.blockId,
      documentId: lock.documentId,
      sessionId: lock.sessionId,
      lockedBy: lock.lockedBy,
      acquiredAt: lock.acquiredAt,
      expiresAt: lock.expiresAt,
    }));
  }

  /**
   * Check if a specific block is locked
   */
  async isBlockLocked(blockId: string): Promise<{ locked: boolean; lockedBy?: string }> {
    const [lock] = await db()
      .select()
      .from(blockLocks)
      .where(
        and(
          eq(blockLocks.blockId, blockId),
          lt(new Date(), blockLocks.expiresAt)
        )
      )
      .limit(1);

    if (lock) {
      return { locked: true, lockedBy: lock.lockedBy };
    }

    return { locked: false };
  }
}
