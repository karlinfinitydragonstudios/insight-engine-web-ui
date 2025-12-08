import { BlockLockManager } from './BlockLockManager';

// Pipeline names
type PipelineName =
  | 'knowledge_base'
  | 'tableau'
  | 'bigwinboard'
  | 'aboutslots'
  | 'slot_graph'
  | 'confluence';

interface PipelineEvent {
  type: 'started' | 'progress' | 'content' | 'block_update' | 'complete' | 'error';
  sessionId: string;
  pipelineName: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

interface PipelineState {
  name: PipelineName;
  status: 'pending' | 'running' | 'paused' | 'complete' | 'error' | 'cancelled';
  currentTurn: number;
  maxTurns: number;
  allocatedBlocks: string[];
}

// Pipeline to block type affinity mapping
const PIPELINE_BLOCK_AFFINITY: Record<string, string[]> = {
  knowledge_base: ['design_concept', 'feature', 'psychological_mechanism'],
  tableau: ['metric_table', 'chart', 'player_metric'],
  bigwinboard: ['competitor_analysis', 'market_benchmark'],
  aboutslots: ['rtp_configuration', 'volatility_profile', 'math_model'],
  slot_graph: ['game_mechanics', 'feature'],
  confluence: ['ab_test_result', 'experiment_data'],
};

export class PipelineOrchestrator {
  private blockLockManager: BlockLockManager;
  private activeSessions: Map<string, Map<string, PipelineState>> = new Map();
  private cancelTokens: Map<string, boolean> = new Map();

  constructor(blockLockManager: BlockLockManager) {
    this.blockLockManager = blockLockManager;
  }

  /**
   * Execute analysis with progressive streaming.
   * Pipelines run in parallel, results stream to UI as they complete.
   */
  async executeAnalysis(
    sessionId: string,
    documentId: string,
    query: string,
    eventCallback: (event: PipelineEvent | Record<string, unknown>) => void
  ): Promise<void> {
    // Initialize session tracking
    this.activeSessions.set(sessionId, new Map());
    this.cancelTokens.set(sessionId, false);

    // Determine which pipelines to activate based on query
    const pipelineNames = this.decidePipelines(query);

    // Notify that analysis is starting
    eventCallback({
      type: 'analysis_started',
      sessionId,
      timestamp: Date.now(),
      payload: { pipelines: pipelineNames, query },
    });

    // Start all pipelines in parallel (non-blocking)
    const pipelinePromises = pipelineNames.map((name) =>
      this.executePipeline(
        name,
        sessionId,
        documentId,
        query,
        eventCallback
      ).catch((error) => {
        eventCallback({
          type: 'error',
          sessionId,
          pipelineName: name,
          timestamp: Date.now(),
          payload: { error: error.message },
        });
      })
    );

    // Wait for all pipelines but don't block the caller
    Promise.allSettled(pipelinePromises).then(() => {
      eventCallback({
        type: 'analysis_complete',
        sessionId,
        timestamp: Date.now(),
        payload: {},
      });
      this.cleanup(sessionId);
    });
  }

  /**
   * Decide which pipelines to activate based on query
   */
  private decidePipelines(query: string): PipelineName[] {
    const queryLower = query.toLowerCase();
    const pipelines: PipelineName[] = [];

    // Simple keyword-based pipeline selection
    // In production, this would use an LLM to make smarter decisions
    if (queryLower.includes('design') || queryLower.includes('feature') || queryLower.includes('mechanic')) {
      pipelines.push('knowledge_base');
    }
    if (queryLower.includes('metric') || queryLower.includes('performance') || queryLower.includes('data')) {
      pipelines.push('tableau');
    }
    if (queryLower.includes('competitor') || queryLower.includes('market') || queryLower.includes('benchmark')) {
      pipelines.push('bigwinboard');
    }
    if (queryLower.includes('rtp') || queryLower.includes('volatility') || queryLower.includes('math')) {
      pipelines.push('aboutslots');
    }
    if (queryLower.includes('slot') || queryLower.includes('game')) {
      pipelines.push('slot_graph');
    }
    if (queryLower.includes('test') || queryLower.includes('experiment') || queryLower.includes('ab')) {
      pipelines.push('confluence');
    }

    // Default to knowledge_base if no specific match
    if (pipelines.length === 0) {
      pipelines.push('knowledge_base');
    }

    return pipelines;
  }

  /**
   * Execute a single pipeline with event streaming
   */
  private async executePipeline(
    pipelineName: PipelineName,
    sessionId: string,
    documentId: string,
    query: string,
    eventCallback: (event: PipelineEvent) => void
  ): Promise<void> {
    // Initialize pipeline state
    const pipelineState: PipelineState = {
      name: pipelineName,
      status: 'pending',
      currentTurn: 0,
      maxTurns: 10, // Simulated
      allocatedBlocks: [],
    };

    const sessionPipelines = this.activeSessions.get(sessionId);
    if (sessionPipelines) {
      sessionPipelines.set(pipelineName, pipelineState);
    }

    // Emit started event
    eventCallback({
      type: 'started',
      sessionId,
      pipelineName,
      timestamp: Date.now(),
      payload: { maxTurns: pipelineState.maxTurns },
    });

    pipelineState.status = 'running';

    try {
      // Simulate pipeline execution with turns
      for (let turn = 1; turn <= pipelineState.maxTurns; turn++) {
        // Check for cancellation
        if (this.cancelTokens.get(sessionId)) {
          pipelineState.status = 'cancelled';
          eventCallback({
            type: 'complete',
            sessionId,
            pipelineName,
            timestamp: Date.now(),
            payload: { status: 'cancelled', turns: turn - 1 },
          });
          return;
        }

        pipelineState.currentTurn = turn;

        // Emit progress
        eventCallback({
          type: 'progress',
          sessionId,
          pipelineName,
          timestamp: Date.now(),
          payload: { turn, maxTurns: pipelineState.maxTurns },
        });

        // Simulate work
        await this.delay(500 + Math.random() * 1000);

        // Emit content update every few turns
        if (turn % 3 === 0) {
          eventCallback({
            type: 'content',
            sessionId,
            pipelineName,
            timestamp: Date.now(),
            payload: {
              content: `[${pipelineName}] Progress update at turn ${turn}...`,
              isPartial: true,
            },
          });
        }
      }

      // Pipeline complete
      pipelineState.status = 'complete';
      eventCallback({
        type: 'complete',
        sessionId,
        pipelineName,
        timestamp: Date.now(),
        payload: {
          status: 'complete',
          turns: pipelineState.maxTurns,
          result: `Simulated result from ${pipelineName}`,
        },
      });

    } catch (error) {
      pipelineState.status = 'error';
      eventCallback({
        type: 'error',
        sessionId,
        pipelineName,
        timestamp: Date.now(),
        payload: { error: (error as Error).message },
      });
    }
  }

  /**
   * Control a running pipeline
   */
  async controlPipeline(
    sessionId: string,
    pipelineName: string,
    action: 'pause' | 'resume' | 'cancel' | 'redirect',
    payload?: Record<string, unknown>
  ): Promise<void> {
    const sessionPipelines = this.activeSessions.get(sessionId);
    if (!sessionPipelines) {
      throw new Error('Session not found');
    }

    const pipelineState = sessionPipelines.get(pipelineName);
    if (!pipelineState) {
      throw new Error('Pipeline not found');
    }

    switch (action) {
      case 'pause':
        pipelineState.status = 'paused';
        break;
      case 'resume':
        pipelineState.status = 'running';
        break;
      case 'cancel':
        this.cancelTokens.set(sessionId, true);
        break;
      case 'redirect':
        // Redirect would re-query with new focus
        break;
    }
  }

  /**
   * Cancel all pipelines for a session
   */
  cancelSession(sessionId: string): void {
    this.cancelTokens.set(sessionId, true);
    this.cleanup(sessionId);
  }

  /**
   * Cleanup session resources
   */
  private cleanup(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    this.cancelTokens.delete(sessionId);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
