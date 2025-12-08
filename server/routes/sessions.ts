import { Router } from 'express';
import { db } from '../config/database';
import { sessions } from '../db/schema';
import { eq, lt } from 'drizzle-orm';

export const sessionsRouter = Router();

const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

// Create session
sessionsRouter.post('/', async (req, res) => {
  try {
    const { userId, metadata } = req.body;

    const expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS);

    const [session] = await db()
      .insert(sessions)
      .values({
        userId,
        status: 'active',
        expiresAt,
        metadata: metadata || {},
      })
      .returning();

    res.status(201).json({
      sessionId: session.id,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get session
sessionsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [session] = await db()
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      await db()
        .update(sessions)
        .set({ status: 'expired' })
        .where(eq(sessions.id, id));

      return res.status(410).json({ error: 'Session expired' });
    }

    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Heartbeat / refresh session
sessionsRouter.post('/:id/heartbeat', async (req, res) => {
  try {
    const { id } = req.params;

    const newExpiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS);

    const [updated] = await db()
      .update(sessions)
      .set({
        lastActivityAt: new Date(),
        expiresAt: newExpiresAt,
      })
      .where(eq(sessions.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: updated.id,
      expiresAt: updated.expiresAt,
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Restore session
sessionsRouter.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const [session] = await db()
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check if expired (allow 24-hour grace period for restore)
    const graceExpiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (session.expiresAt && new Date(session.expiresAt) < graceExpiresAt) {
      return res.status(410).json({ error: 'Session expired and cannot be restored' });
    }

    // Restore session
    const newExpiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS);

    const [restored] = await db()
      .update(sessions)
      .set({
        status: 'active',
        lastActivityAt: new Date(),
        expiresAt: newExpiresAt,
      })
      .where(eq(sessions.id, id))
      .returning();

    res.json({
      sessionId: restored.id,
      expiresAt: restored.expiresAt,
    });
  } catch (error) {
    console.error('Restore session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Terminate session
sessionsRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [terminated] = await db()
      .update(sessions)
      .set({ status: 'terminated' })
      .where(eq(sessions.id, id))
      .returning();

    if (!terminated) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session terminated' });
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cleanup expired sessions (can be called by cron job)
sessionsRouter.post('/cleanup', async (req, res) => {
  try {
    const result = await db()
      .update(sessions)
      .set({ status: 'expired' })
      .where(lt(sessions.expiresAt, new Date()));

    res.json({ message: 'Cleanup complete' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
