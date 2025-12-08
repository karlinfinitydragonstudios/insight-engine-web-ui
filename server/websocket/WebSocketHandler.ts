import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { BlockLockManager, blockLockManager } from '../services/BlockLockManager';
import { PipelineOrchestrator } from '../services/PipelineOrchestrator';
import { editIntentManager, EditIntent } from '../services/EditIntentManager';

interface ClientConnection {
  ws: WebSocket;
  sessionId: string;
  userId?: string;
  documentId?: string;
  connectedAt: Date;
}

interface WebSocketMessage {
  type: string;
  payload?: Record<string, unknown>;
}

// New message types for edit intents and streaming
export type OutgoingMessageType =
  | 'connected'
  | 'error'
  | 'pong'
  | 'subscribed'
  | 'unsubscribed'
  | 'lock_result'
  | 'locks_changed'
  | 'locks_released'
  | 'pipeline_control_ack'
  | 'block_update'
  // New types for edit intents and streaming
  | 'edit_intent_declared'
  | 'lock_queued'
  | 'lock_granted'
  | 'block_streaming_start'
  | 'block_content_chunk'
  | 'block_streaming_end'
  | 'edit_validation_result'
  | 'lock_timeout_warning'
  | 'lock_expired';

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private blockLockManager: BlockLockManager;
  private pipelineOrchestrator: PipelineOrchestrator;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.blockLockManager = blockLockManager;
    this.pipelineOrchestrator = new PipelineOrchestrator(this.blockLockManager);

    // Set up edit intent event handlers
    this.setupEditIntentHandlers();

    // Set up block lock event handlers
    this.setupBlockLockHandlers();
  }

  /**
   * Set up handlers for edit intent events
   */
  private setupEditIntentHandlers(): void {
    editIntentManager.on('intent:declared', (intent: EditIntent) => {
      this.broadcastToDocument(intent.documentId, {
        type: 'edit_intent_declared',
        payload: {
          intentId: intent.id,
          blockId: intent.blockId,
          sectionId: intent.sectionId,
          pipelineName: intent.pipelineName,
          priority: intent.priority,
        },
      });
    });

    editIntentManager.on('intent:queued', (intent: EditIntent, position: number) => {
      this.broadcastToDocument(intent.documentId, {
        type: 'lock_queued',
        payload: {
          intentId: intent.id,
          blockId: intent.blockId,
          pipelineName: intent.pipelineName,
          position,
        },
      });
    });

    editIntentManager.on('intent:granted', (intent: EditIntent) => {
      this.broadcastToDocument(intent.documentId, {
        type: 'lock_granted',
        payload: {
          intentId: intent.id,
          blockId: intent.blockId,
          pipelineName: intent.pipelineName,
        },
      });
    });

    editIntentManager.on('intent:completed', (intent: EditIntent) => {
      this.broadcastToDocument(intent.documentId, {
        type: 'block_streaming_end',
        payload: {
          intentId: intent.id,
          blockId: intent.blockId,
          pipelineName: intent.pipelineName,
        },
      });
    });

    editIntentManager.on('intent:cancelled', (intent: EditIntent, reason: string) => {
      this.broadcastToDocument(intent.documentId, {
        type: 'error',
        payload: {
          intentId: intent.id,
          blockId: intent.blockId,
          pipelineName: intent.pipelineName,
          message: `Edit cancelled: ${reason}`,
        },
      });
    });
  }

  /**
   * Set up handlers for block lock events
   */
  private setupBlockLockHandlers(): void {
    this.blockLockManager.on('lock:timeout_warning', (lock, expiresIn) => {
      this.broadcastToDocument(lock.documentId, {
        type: 'lock_timeout_warning',
        payload: {
          blockId: lock.blockId,
          lockedBy: lock.lockedBy,
          expiresIn,
        },
      });
    });

    this.blockLockManager.on('lock:expired', (lock) => {
      this.broadcastToDocument(lock.documentId, {
        type: 'lock_expired',
        payload: {
          blockId: lock.blockId,
          lockedBy: lock.lockedBy,
        },
      });
    });

    this.blockLockManager.on('lock:released', (blockId, lockedBy) => {
      // We need documentId here - broadcast to all documents for now
      // In production, you'd track blockId -> documentId mapping
      this.clients.forEach((client) => {
        if (client.documentId) {
          this.send(client.ws, {
            type: 'locks_released',
            payload: { blockIds: [blockId], lockedBy },
          });
        }
      });
    });
  }

  initialize() {
    this.wss.on('connection', (ws, req) => {
      const sessionId = this.extractSessionId(req) || uuidv4();

      const client: ClientConnection = {
        ws,
        sessionId,
        connectedAt: new Date(),
      };

      this.clients.set(sessionId, client);
      console.log(`📡 Client connected: ${sessionId}`);

      // Send welcome message
      this.send(ws, {
        type: 'connected',
        payload: { sessionId },
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          await this.handleMessage(sessionId, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
          this.send(ws, {
            type: 'error',
            payload: { message: 'Invalid message format' },
          });
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(sessionId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for ${sessionId}:`, error);
        this.handleDisconnect(sessionId);
      });
    });

    // Heartbeat to keep connections alive
    setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    }, 30000);
  }

  private extractSessionId(req: any): string | null {
    const url = new URL(req.url || '', `ws://${req.headers.host}`);
    return url.searchParams.get('sessionId');
  }

  private async handleMessage(sessionId: string, message: WebSocketMessage) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    console.log(`📥 Message from ${sessionId}:`, message.type);

    switch (message.type) {
      case 'start_analysis':
        await this.handleStartAnalysis(sessionId, message.payload);
        break;

      case 'control_pipeline':
        await this.handlePipelineControl(sessionId, message.payload);
        break;

      case 'subscribe_document':
        this.handleSubscribeDocument(sessionId, message.payload);
        break;

      case 'unsubscribe_document':
        this.handleUnsubscribeDocument(sessionId);
        break;

      case 'user_edit':
        await this.handleUserEdit(sessionId, message.payload);
        break;

      case 'acquire_lock':
        await this.handleAcquireLock(sessionId, message.payload);
        break;

      case 'release_lock':
        await this.handleReleaseLock(sessionId, message.payload);
        break;

      case 'ping':
        this.send(client.ws, { type: 'pong' });
        break;

      default:
        this.send(client.ws, {
          type: 'error',
          payload: { message: `Unknown message type: ${message.type}` },
        });
    }
  }

  private async handleStartAnalysis(
    sessionId: string,
    payload: Record<string, unknown> | undefined
  ) {
    const client = this.clients.get(sessionId);
    if (!client || !payload) return;

    const { documentId, query } = payload as { documentId: string; query: string };

    if (!documentId || !query) {
      this.send(client.ws, {
        type: 'error',
        payload: { message: 'documentId and query are required' },
      });
      return;
    }

    // Event callback for streaming updates
    const eventCallback = (event: Record<string, unknown>) => {
      this.send(client.ws, event);

      // Broadcast block updates to all clients viewing this document
      if (event.type === 'block_update') {
        this.broadcastToDocument(documentId, event, sessionId);
      }
    };

    try {
      await this.pipelineOrchestrator.executeAnalysis(
        sessionId,
        documentId,
        query,
        eventCallback
      );
    } catch (error) {
      console.error('Analysis error:', error);
      this.send(client.ws, {
        type: 'error',
        payload: { message: 'Analysis failed' },
      });
    }
  }

  private async handlePipelineControl(
    sessionId: string,
    payload: Record<string, unknown> | undefined
  ) {
    const client = this.clients.get(sessionId);
    if (!client || !payload) return;

    const { pipelineName, action } = payload as {
      pipelineName: string;
      action: 'pause' | 'resume' | 'cancel' | 'redirect';
    };

    try {
      await this.pipelineOrchestrator.controlPipeline(
        sessionId,
        pipelineName,
        action,
        payload
      );

      this.send(client.ws, {
        type: 'pipeline_control_ack',
        payload: { pipelineName, action, success: true },
      });
    } catch (error) {
      this.send(client.ws, {
        type: 'pipeline_control_ack',
        payload: { pipelineName, action, success: false, error: (error as Error).message },
      });
    }
  }

  private handleSubscribeDocument(
    sessionId: string,
    payload: Record<string, unknown> | undefined
  ) {
    const client = this.clients.get(sessionId);
    if (!client || !payload) return;

    const { documentId } = payload as { documentId: string };
    client.documentId = documentId;

    this.send(client.ws, {
      type: 'subscribed',
      payload: { documentId },
    });
  }

  private handleUnsubscribeDocument(sessionId: string) {
    const client = this.clients.get(sessionId);
    if (!client) return;

    const documentId = client.documentId;
    client.documentId = undefined;

    this.send(client.ws, {
      type: 'unsubscribed',
      payload: { documentId },
    });
  }

  private async handleUserEdit(
    sessionId: string,
    payload: Record<string, unknown> | undefined
  ) {
    const client = this.clients.get(sessionId);
    if (!client || !payload) return;

    const { blockId, content, documentId } = payload as {
      blockId: string;
      content: Record<string, unknown>;
      documentId: string;
    };

    // Broadcast to other clients viewing this document
    this.broadcastToDocument(
      documentId,
      {
        type: 'block_update',
        payload: {
          blockId,
          content,
          updatedBy: 'user',
          sessionId,
        },
      },
      sessionId
    );
  }

  private async handleAcquireLock(
    sessionId: string,
    payload: Record<string, unknown> | undefined
  ) {
    const client = this.clients.get(sessionId);
    if (!client || !payload) return;

    const { blockIds, documentId } = payload as {
      blockIds: string[];
      documentId: string;
    };

    const result = await this.blockLockManager.acquireLocks({
      blockIds,
      documentId,
      sessionId,
      requestedBy: 'user',
    });

    this.send(client.ws, {
      type: 'lock_result',
      payload: result,
    });

    // Broadcast lock changes
    this.broadcastToDocument(documentId, {
      type: 'locks_changed',
      payload: { documentId },
    });
  }

  private async handleReleaseLock(
    sessionId: string,
    payload: Record<string, unknown> | undefined
  ) {
    const client = this.clients.get(sessionId);
    if (!client || !payload) return;

    const { blockIds, documentId } = payload as {
      blockIds: string[];
      documentId: string;
    };

    await this.blockLockManager.releaseLocks(blockIds, 'user');

    this.send(client.ws, {
      type: 'locks_released',
      payload: { blockIds },
    });

    // Broadcast lock changes
    this.broadcastToDocument(documentId, {
      type: 'locks_changed',
      payload: { documentId },
    });
  }

  private handleDisconnect(sessionId: string) {
    const client = this.clients.get(sessionId);
    if (client) {
      // Release any locks held by this session
      this.blockLockManager.releaseSessionLocks(sessionId);

      // Cancel any running pipelines
      this.pipelineOrchestrator.cancelSession(sessionId);
    }

    this.clients.delete(sessionId);
    console.log(`📴 Client disconnected: ${sessionId}`);
  }

  private send(ws: WebSocket, message: Record<string, unknown>) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcastToDocument(
    documentId: string,
    message: Record<string, unknown>,
    excludeSessionId?: string
  ) {
    this.clients.forEach((client, sid) => {
      if (client.documentId === documentId && sid !== excludeSessionId) {
        this.send(client.ws, message);
      }
    });
  }

  // Public method for sending updates from services
  public sendToSession(sessionId: string, message: Record<string, unknown>) {
    const client = this.clients.get(sessionId);
    if (client) {
      this.send(client.ws, message);
    }
  }
}
