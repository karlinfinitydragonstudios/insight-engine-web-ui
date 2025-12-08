import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { BlockLockManager } from '../services/BlockLockManager';
import { PipelineOrchestrator } from '../services/PipelineOrchestrator';

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

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private blockLockManager: BlockLockManager;
  private pipelineOrchestrator: PipelineOrchestrator;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.blockLockManager = new BlockLockManager();
    this.pipelineOrchestrator = new PipelineOrchestrator(this.blockLockManager);
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
