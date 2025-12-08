import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { PipelineState, PipelineName, PipelineStatus } from '../types';

interface PipelineStoreState {
  pipelines: Map<string, PipelineState>;
  isAnalyzing: boolean;
  currentQuery: string | null;

  // Actions
  startAnalysis: (query: string) => void;
  endAnalysis: () => void;
  setPipeline: (name: string, state: PipelineState) => void;
  updatePipelineProgress: (name: string, progress: number, currentTurn: number) => void;
  setPipelineStatus: (name: string, status: PipelineStatus) => void;
  setPipelineContent: (name: string, content: string) => void;
  setPipelineError: (name: string, error: string) => void;
  completePipeline: (name: string, status: 'complete' | 'cancelled') => void;
  setError: (name: string, error: string) => void;
  clearPipelines: () => void;
  getActivePipelines: () => PipelineState[];
}

export const usePipelineStore = create<PipelineStoreState>()(
  devtools(
    (set, get) => ({
      pipelines: new Map(),
      isAnalyzing: false,
      currentQuery: null,

      startAnalysis: (query) =>
        set(
          {
            isAnalyzing: true,
            currentQuery: query,
            pipelines: new Map(),
          },
          false,
          'startAnalysis'
        ),

      endAnalysis: () =>
        set(
          {
            isAnalyzing: false,
          },
          false,
          'endAnalysis'
        ),

      setPipeline: (name, state) =>
        set(
          (prev) => {
            const pipelines = new Map(prev.pipelines);
            pipelines.set(name, state);
            return { pipelines };
          },
          false,
          'setPipeline'
        ),

      updatePipelineProgress: (name, progress, currentTurn) =>
        set(
          (prev) => {
            const pipelines = new Map(prev.pipelines);
            const existing = pipelines.get(name);
            if (existing) {
              pipelines.set(name, {
                ...existing,
                progress,
                currentTurn,
                status: 'running',
              });
            }
            return { pipelines };
          },
          false,
          'updatePipelineProgress'
        ),

      setPipelineStatus: (name, status) =>
        set(
          (prev) => {
            const pipelines = new Map(prev.pipelines);
            const existing = pipelines.get(name);
            if (existing) {
              pipelines.set(name, {
                ...existing,
                status,
                ...(status === 'complete' ? { completedAt: Date.now() } : {}),
              });
            }
            return { pipelines };
          },
          false,
          'setPipelineStatus'
        ),

      setPipelineContent: (name, content) =>
        set(
          (prev) => {
            const pipelines = new Map(prev.pipelines);
            const existing = pipelines.get(name);
            if (existing) {
              pipelines.set(name, {
                ...existing,
                lastContent: content,
              });
            }
            return { pipelines };
          },
          false,
          'setPipelineContent'
        ),

      setPipelineError: (name, error) =>
        set(
          (prev) => {
            const pipelines = new Map(prev.pipelines);
            const existing = pipelines.get(name);
            if (existing) {
              pipelines.set(name, {
                ...existing,
                status: 'error',
                error,
              });
            }
            return { pipelines };
          },
          false,
          'setPipelineError'
        ),

      completePipeline: (name, status) =>
        set(
          (prev) => {
            const pipelines = new Map(prev.pipelines);
            const existing = pipelines.get(name);
            if (existing) {
              pipelines.set(name, {
                ...existing,
                status,
                progress: 100,
                completedAt: Date.now(),
              });
            }
            return { pipelines };
          },
          false,
          'completePipeline'
        ),

      setError: (name, error) =>
        set(
          (prev) => {
            const pipelines = new Map(prev.pipelines);
            const existing = pipelines.get(name);
            if (existing) {
              pipelines.set(name, {
                ...existing,
                status: 'error',
                error,
              });
            }
            return { pipelines };
          },
          false,
          'setError'
        ),

      clearPipelines: () =>
        set(
          {
            pipelines: new Map(),
            isAnalyzing: false,
            currentQuery: null,
          },
          false,
          'clearPipelines'
        ),

      getActivePipelines: () => {
        const { pipelines } = get();
        return Array.from(pipelines.values()).filter(
          (p) => p.status === 'running' || p.status === 'pending'
        );
      },
    }),
    { name: 'PipelineStore' }
  )
);
