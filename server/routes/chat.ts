import { Router } from 'express';
import { db } from '../config/database';
import { chatMessages, sessions } from '../db/schema';
import { eq, desc, and, gt } from 'drizzle-orm';

export const chatRouter = Router();

// Get chat history for session
chatRouter.get('/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 0, pageSize = 50 } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limit = parseInt(pageSize as string, 10);
    const offset = pageNum * limit;

    // Get messages
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const allMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId));

    const totalMessages = allMessages.length;

    res.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page: pageNum,
        pageSize: limit,
        totalMessages,
        totalPages: Math.ceil(totalMessages / limit),
      },
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add message to chat
chatRouter.post('/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      role,
      content,
      documentId,
      documentContext,
      documentReferences,
      pipelineResults,
    } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: 'Role and content are required' });
    }

    // Verify session exists
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Create message
    const [message] = await db
      .insert(chatMessages)
      .values({
        sessionId,
        documentId,
        role,
        content,
        documentContext,
        documentReferences: documentReferences || [],
        pipelineResults,
      })
      .returning();

    // Update session activity
    await db
      .update(sessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(sessions.id, sessionId));

    res.status(201).json(message);
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single message
chatRouter.get('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const [message] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, messageId))
      .limit(1);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(message);
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update message (for streaming content)
chatRouter.patch('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, pipelineResults } = req.body;

    const [updated] = await db
      .update(chatMessages)
      .set({
        ...(content && { content }),
        ...(pipelineResults && { pipelineResults }),
      })
      .where(eq(chatMessages.id, messageId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent messages (for context)
chatRouter.get('/:sessionId/recent', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 10 } = req.query;

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(parseInt(limit as string, 10));

    res.json(messages.reverse()); // Return in chronological order
  } catch (error) {
    console.error('Get recent messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export chat history
chatRouter.get('/:sessionId/export', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);

    // Format as markdown
    const markdown = messages
      .map((msg) => {
        const role = msg.role === 'user' ? 'You' : 'Insight Engine';
        const timestamp = new Date(msg.createdAt).toLocaleString();
        return `### ${role} (${timestamp})\n\n${msg.content}\n`;
      })
      .join('\n---\n\n');

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="chat-export-${sessionId}.md"`
    );
    res.send(markdown);
  } catch (error) {
    console.error('Export chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
