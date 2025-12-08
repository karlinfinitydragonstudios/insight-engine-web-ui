import { useCallback, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { usePipelineStore, useDocumentStore, useChatStore } from '../store';
import type { PipelineState } from '../types/pipeline';

interface UseStreamingAnalysisReturn {
  startAnalysis: (documentId: string, query: string) => void;
  controlPipeline: (pipelineName: string, action: 'pause' | 'resume' | 'cancel' | 'redirect') => void;
  isConnected: boolean;
}

export function useStreamingAnalysis(): UseStreamingAnalysisReturn {
  const { send, subscribe, isConnected } = useWebSocket();
  const { setPipeline, updatePipelineProgress, completePipeline, setError, clearPipelines } = usePipelineStore();
  const { updateBlock, setBlockLock, removeBlockLock } = useDocumentStore();
  const { addMessage, updateStreamingContent, setIsStreaming } = useChatStore();

  // Handle analysis_started event
  useEffect(() => {
    return subscribe('analysis_started', (message) => {
      const { pipelines, query } = message.payload as { pipelines: string[]; query: string };
      clearPipelines();

      // Initialize pipeline states
      pipelines.forEach((pipelineName) => {
        const pipelineState: PipelineState = {
          name: pipelineName as PipelineState['name'],
          status: 'pending',
          progress: 0,
          currentTurn: 0,
          maxTurns: 0,
          startedAt: Date.now(),
        };
        setPipeline(pipelineName, pipelineState);
      });

      setIsStreaming(true);
    });
  }, [subscribe, clearPipelines, setPipeline, setIsStreaming]);

  // Handle pipeline started
  useEffect(() => {
    return subscribe('started', (message) => {
      const { pipelineName, payload } = message;
      if (pipelineName) {
        setPipeline(pipelineName, {
          name: pipelineName as PipelineState['name'],
          status: 'running',
          progress: 0,
          currentTurn: 0,
          maxTurns: (payload?.maxTurns as number) || 10,
          startedAt: Date.now(),
        });
      }
    });
  }, [subscribe, setPipeline]);

  // Handle pipeline progress
  useEffect(() => {
    return subscribe('progress', (message) => {
      const { pipelineName, payload } = message;
      if (pipelineName && payload) {
        const { turn, maxTurns } = payload as { turn: number; maxTurns: number };
        const progress = Math.round((turn / maxTurns) * 100);
        updatePipelineProgress(pipelineName, progress, turn);
      }
    });
  }, [subscribe, updatePipelineProgress]);

  // Handle content updates
  useEffect(() => {
    return subscribe('content', (message) => {
      const { pipelineName, payload } = message;
      if (payload) {
        const { content, isPartial } = payload as { content: string; isPartial: boolean };

        // Update streaming content in chat
        if (isPartial) {
          updateStreamingContent(content);
        } else {
          // Final content - add as a message
          addMessage({
            id: `msg-${Date.now()}`,
            sessionId: message.sessionId || '',
            role: 'assistant',
            content,
            timestamp: new Date().toISOString(),
            documentReferences: [],
            dataSources: pipelineName
              ? [{ source: pipelineName as any, status: 'completed' }]
              : [],
          });
        }
      }
    });
  }, [subscribe, updateStreamingContent, addMessage]);

  // Handle block updates
  useEffect(() => {
    return subscribe('block_update', (message) => {
      const { payload } = message;
      if (payload) {
        const { blockId, content, updatedBy } = payload as {
          blockId: string;
          content: Record<string, unknown>;
          updatedBy: string;
        };
        updateBlock(blockId, content);
      }
    });
  }, [subscribe, updateBlock]);

  // Handle pipeline completion
  useEffect(() => {
    return subscribe('complete', (message) => {
      const { pipelineName, payload } = message;
      if (pipelineName) {
        const { status, result } = payload as { status: string; result?: string };
        completePipeline(pipelineName, status === 'complete' ? 'complete' : 'cancelled');

        // If there's a result, add it as a message
        if (result && status === 'complete') {
          addMessage({
            id: `msg-${Date.now()}-${pipelineName}`,
            sessionId: message.sessionId || '',
            role: 'assistant',
            content: result,
            timestamp: new Date().toISOString(),
            documentReferences: [],
            dataSources: [{ source: pipelineName as any, status: 'completed' }],
          });
        }
      }
    });
  }, [subscribe, completePipeline, addMessage]);

  // Handle analysis complete
  useEffect(() => {
    return subscribe('analysis_complete', () => {
      setIsStreaming(false);
    });
  }, [subscribe, setIsStreaming]);

  // Handle errors
  useEffect(() => {
    return subscribe('error', (message) => {
      const { pipelineName, payload } = message;
      const errorMessage = (payload?.error as string) || (payload?.message as string) || 'Unknown error';

      if (pipelineName) {
        setError(pipelineName, errorMessage);
      }

      console.error(`Pipeline error${pipelineName ? ` (${pipelineName})` : ''}:`, errorMessage);
    });
  }, [subscribe, setError]);

  // Handle lock changes
  useEffect(() => {
    return subscribe('locks_changed', (message) => {
      const { payload } = message;
      // Refresh locks from server - in a real implementation, this would fetch fresh data
      console.log('Locks changed for document:', payload?.documentId);
    });
  }, [subscribe]);

  // Handle lock results
  useEffect(() => {
    return subscribe('lock_result', (message) => {
      const { payload } = message;
      if (payload) {
        const { granted, denied } = payload as {
          granted: Array<{ blockId: string; lockedBy: string; expiresAt: string }>;
          denied: Array<{ blockId: string; heldBy: string }>;
        };

        // Update store with lock information
        granted.forEach((lock) => {
          setBlockLock({
            blockId: lock.blockId,
            lockedBy: lock.lockedBy,
            expiresAt: lock.expiresAt,
          });
        });
      }
    });
  }, [subscribe, setBlockLock]);

  // Handle locks released
  useEffect(() => {
    return subscribe('locks_released', (message) => {
      const { payload } = message;
      if (payload) {
        const { blockIds } = payload as { blockIds: string[] };
        blockIds.forEach((blockId) => removeBlockLock(blockId));
      }
    });
  }, [subscribe, removeBlockLock]);

  const startAnalysis = useCallback(
    (documentId: string, query: string) => {
      send({
        type: 'start_analysis',
        payload: { documentId, query },
      });
    },
    [send]
  );

  const controlPipeline = useCallback(
    (pipelineName: string, action: 'pause' | 'resume' | 'cancel' | 'redirect') => {
      send({
        type: 'control_pipeline',
        payload: { pipelineName, action },
      });
    },
    [send]
  );

  return {
    startAnalysis,
    controlPipeline,
    isConnected,
  };
}
