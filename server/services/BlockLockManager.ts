import { EventEmitter } from 'events';
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

// Events emitted by BlockLockManager
export interface BlockLockEvents {
  'lock:acquired': (lock: BlockLock) => void;
  'lock:released': (blockId: string, lockedBy: string) => void;
  'lock:expired': (lock: BlockLock) => void;
  'lock:timeout_warning': (lock: BlockLock, expiresIn: number) => void;
}

export class BlockLockManager extends EventEmitter {
  private readonly DEFAULT_LOCK_TIMEOUT = 30_000; // 30 seconds
  private readonly TIMEOUT_WARNING_THRESHOLD = 5_000; // 5 seconds before expiry
  private watchdogInterval: NodeJS.Timeout | null = null;
  private watchdogRunning: boolean = false;

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

  /**
   * Start the timeout watchdog
   * Monitors locks and emits warnings/expirations
   */
  startWatchdog(intervalMs: number = 1000): void {
    if (this.watchdogRunning) return;

    this.watchdogRunning = true;
    this.watchdogInterval = setInterval(async () => {
      await this.checkLockTimeouts();
    }, intervalMs);

    console.log('[BlockLockManager] Watchdog started');
  }

  /**
   * Stop the timeout watchdog
   */
  stopWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
    this.watchdogRunning = false;
    console.log('[BlockLockManager] Watchdog stopped');
  }

  /**
   * Check for locks that are about to expire or have expired
   */
  private async checkLockTimeouts(): Promise<void> {
    try {
      const now = new Date();
      const warningThreshold = new Date(now.getTime() + this.TIMEOUT_WARNING_THRESHOLD);

      // Get all current locks
      const locks = await db()
        .select()
        .from(blockLocks);

      for (const lock of locks) {
        const expiresAt = new Date(lock.expiresAt);

        // Check if expired
        if (expiresAt <= now) {
          // Delete expired lock
          await db()
            .delete(blockLocks)
            .where(eq(blockLocks.id, lock.id));

          this.emit('lock:expired', {
            blockId: lock.blockId,
            documentId: lock.documentId,
            sessionId: lock.sessionId,
            lockedBy: lock.lockedBy,
            acquiredAt: lock.acquiredAt,
            expiresAt: lock.expiresAt,
          });
        }
        // Check if about to expire
        else if (expiresAt <= warningThreshold) {
          const expiresIn = expiresAt.getTime() - now.getTime();
          this.emit('lock:timeout_warning', {
            blockId: lock.blockId,
            documentId: lock.documentId,
            sessionId: lock.sessionId,
            lockedBy: lock.lockedBy,
            acquiredAt: lock.acquiredAt,
            expiresAt: lock.expiresAt,
          }, expiresIn);
        }
      }
    } catch (error) {
      console.error('[BlockLockManager] Watchdog error:', error);
    }
  }

  /**
   * Force release a lock (admin/cleanup)
   */
  async forceReleaseLock(blockId: string): Promise<void> {
    const [lock] = await db()
      .select()
      .from(blockLocks)
      .where(eq(blockLocks.blockId, blockId))
      .limit(1);

    if (lock) {
      await db()
        .delete(blockLocks)
        .where(eq(blockLocks.blockId, blockId));

      this.emit('lock:released', blockId, lock.lockedBy);
    }
  }

  /**
   * Get lock statistics for monitoring
   */
  async getLockStats(): Promise<{
    totalLocks: number;
    locksByPipeline: Record<string, number>;
    expiringWithin5Seconds: number;
    averageLockAge: number;
  }> {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() + 5000);

    const locks = await db()
      .select()
      .from(blockLocks);

    const locksByPipeline: Record<string, number> = {};
    let totalAge = 0;
    let expiringCount = 0;

    for (const lock of locks) {
      // Count by pipeline
      locksByPipeline[lock.lockedBy] = (locksByPipeline[lock.lockedBy] || 0) + 1;

      // Calculate age
      totalAge += now.getTime() - new Date(lock.acquiredAt).getTime();

      // Check if expiring soon
      if (new Date(lock.expiresAt) <= warningThreshold) {
        expiringCount++;
      }
    }

    return {
      totalLocks: locks.length,
      locksByPipeline,
      expiringWithin5Seconds: expiringCount,
      averageLockAge: locks.length > 0 ? totalAge / locks.length : 0,
    };
  }
}

// Singleton instance
export const blockLockManager = new BlockLockManager();
