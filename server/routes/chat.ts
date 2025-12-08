import { Router } from 'express';
import { db } from '../config/database';
import { chatMessages, sessions } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { openaiService, type ChatMessage } from '../services/OpenAIService';

export const chatRouter = Router();

// In-memory message store for stateless operation (when DB is unavailable)
const messageStore = new Map<string, Array<{ role: string; content: string }>>();

// Helper to ensure session exists in database
async function ensureSession(sessionId: string): Promise<boolean> {
  try {
    const [existing] = await db()
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!existing) {
      // Create new session
      await db().insert(sessions).values({
        id: sessionId,
        status: 'active',
        metadata: {},
      });
    }
    return true;
  } catch (error) {
    console.error('Failed to ensure session:', error);
    return false;
  }
}

// Send message and get streaming AI response
chatRouter.post('/:sessionId/send', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set up SSE headers first
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Ensure session exists in database
    const sessionReady = await ensureSession(sessionId);

    // Get or create in-memory message history (for OpenAI context)
    if (!messageStore.has(sessionId)) {
      messageStore.set(sessionId, []);
    }
    const history = messageStore.get(sessionId)!;

    // Add user message to history
    history.push({ role: 'user', content: message });

    // Save user message to database if session is ready
    if (sessionReady) {
      try {
        await db().insert(chatMessages).values({
          sessionId,
          role: 'user',
          content: message,
          documentReferences: [],
        });
      } catch (dbError) {
        console.error('Failed to save user message:', dbError);
      }
    }

    // Build messages for OpenAI
    const chatHistory: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an intelligent document analysis assistant called Insight Engine.
You help users understand, analyze, and work with documents.
Provide clear, well-structured responses using markdown formatting.
Use headers, bullet points, code blocks, and emphasis where appropriate.`,
      },
      ...history.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Send start event
    res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

    // Stream response
    await openaiService.streamChat(chatHistory, {
      onToken: (token) => {
        res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      },
      onComplete: async (fullContent) => {
        // Add assistant response to history
        history.push({ role: 'assistant', content: fullContent });

        // Save assistant message to database
        if (sessionReady) {
          try {
            await db().insert(chatMessages).values({
              sessionId,
              role: 'assistant',
              content: fullContent,
              documentReferences: [],
            });
            // Update session activity
            await db()
              .update(sessions)
              .set({ lastActivityAt: new Date() })
              .where(eq(sessions.id, sessionId));
          } catch (dbError) {
            console.error('Failed to save assistant message:', dbError);
          }
        }

        res.write(`data: ${JSON.stringify({ type: 'complete', content: fullContent })}\n\n`);
        res.end();
      },
      onError: (error) => {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Internal server error' })}\n\n`);
      res.end();
    }
  }
});

// Get chat history for session
chatRouter.get('/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 0, pageSize = 50 } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limit = parseInt(pageSize as string, 10);
    const offset = pageNum * limit;

    // Get messages
    const messages = await db()
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const allMessages = await db()
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
    const [session] = await db()
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Create message
    const [message] = await db()
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
    await db()
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

    const [message] = await db()
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

    const [updated] = await db()
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

    const messages = await db()
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

    const messages = await db()
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
