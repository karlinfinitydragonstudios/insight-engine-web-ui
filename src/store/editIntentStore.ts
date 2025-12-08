import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  PipelineName,
  EditIntent,
  QueuedEdit,
  StreamingEdit,
} from '../types/directive';

interface EditIntentState {
  // Active intents by block ID
  intents: Map<string, EditIntent>;

  // Streaming edits by block ID
  activeEdits: Map<string, StreamingEdit>;

  // Queue of edits waiting for locks
  queuedEdits: QueuedEdit[];

  // Track which blocks have pending validation
  pendingValidation: Set<string>;

  // Lock timeout warnings (blockId -> seconds remaining)
  timeoutWarnings: Map<string, number>;

  // Actions
  declareIntent: (intent: EditIntent) => void;
  removeIntent: (blockId: string) => void;
  clearIntents: () => void;

  addToQueue: (edit: QueuedEdit) => void;
  removeFromQueue: (blockId: string) => void;
  updateQueuePosition: (blockId: string, position: number) => void;

  startStreaming: (blockId: string, pipelineName: PipelineName) => void;
  appendStreamingContent: (blockId: string, content: string) => void;
  completeStreaming: (blockId: string) => void;
  cancelStreaming: (blockId: string) => void;

  setPendingValidation: (blockId: string, pending: boolean) => void;

  setTimeoutWarning: (blockId: string, secondsRemaining: number) => void;
  clearTimeoutWarning: (blockId: string) => void;

  // Computed helpers
  getBlockIntent: (blockId: string) => EditIntent | undefined;
  getBlockStreamingEdit: (blockId: string) => StreamingEdit | undefined;
  getQueuePosition: (blockId: string) => number | undefined;
  isBlockStreaming: (blockId: string) => boolean;
  getBlocksBeingEditedByPipeline: (pipelineName: PipelineName) => string[];
}

export const useEditIntentStore = create<EditIntentState>()(
  devtools(
    (set, get) => ({
      intents: new Map(),
      activeEdits: new Map(),
      queuedEdits: [],
      pendingValidation: new Set(),
      timeoutWarnings: new Map(),

      // Intent management
      declareIntent: (intent) =>
        set(
          (state) => {
            const newIntents = new Map(state.intents);
            newIntents.set(intent.blockId, intent);
            return { intents: newIntents };
          },
          false,
          'declareIntent'
        ),

      removeIntent: (blockId) =>
        set(
          (state) => {
            const newIntents = new Map(state.intents);
            newIntents.delete(blockId);
            return { intents: newIntents };
          },
          false,
          'removeIntent'
        ),

      clearIntents: () =>
        set(
          { intents: new Map() },
          false,
          'clearIntents'
        ),

      // Queue management
      addToQueue: (edit) =>
        set(
          (state) => ({
            queuedEdits: [...state.queuedEdits, edit].sort(
              (a, b) => a.position - b.position
            ),
          }),
          false,
          'addToQueue'
        ),

      removeFromQueue: (blockId) =>
        set(
          (state) => ({
            queuedEdits: state.queuedEdits.filter(
              (e) => e.intent.blockId !== blockId
            ),
          }),
          false,
          'removeFromQueue'
        ),

      updateQueuePosition: (blockId, position) =>
        set(
          (state) => ({
            queuedEdits: state.queuedEdits
              .map((e) =>
                e.intent.blockId === blockId ? { ...e, position } : e
              )
              .sort((a, b) => a.position - b.position),
          }),
          false,
          'updateQueuePosition'
        ),

      // Streaming management
      startStreaming: (blockId, pipelineName) =>
        set(
          (state) => {
            const newActiveEdits = new Map(state.activeEdits);
            newActiveEdits.set(blockId, {
              blockId,
              pipelineName,
              streamingContent: '',
              isComplete: false,
              startedAt: Date.now(),
              lastChunkAt: Date.now(),
            });

            // Remove from queue when streaming starts
            const newQueuedEdits = state.queuedEdits.filter(
              (e) => e.intent.blockId !== blockId
            );

            return {
              activeEdits: newActiveEdits,
              queuedEdits: newQueuedEdits,
            };
          },
          false,
          'startStreaming'
        ),

      appendStreamingContent: (blockId, content) =>
        set(
          (state) => {
            const existing = state.activeEdits.get(blockId);
            if (!existing) return state;

            const newActiveEdits = new Map(state.activeEdits);
            newActiveEdits.set(blockId, {
              ...existing,
              streamingContent: existing.streamingContent + content,
              lastChunkAt: Date.now(),
            });
            return { activeEdits: newActiveEdits };
          },
          false,
          'appendStreamingContent'
        ),

      completeStreaming: (blockId) =>
        set(
          (state) => {
            const existing = state.activeEdits.get(blockId);
            if (!existing) return state;

            const newActiveEdits = new Map(state.activeEdits);
            newActiveEdits.set(blockId, {
              ...existing,
              isComplete: true,
            });

            // Also remove from intents
            const newIntents = new Map(state.intents);
            newIntents.delete(blockId);

            return {
              activeEdits: newActiveEdits,
              intents: newIntents,
            };
          },
          false,
          'completeStreaming'
        ),

      cancelStreaming: (blockId) =>
        set(
          (state) => {
            const newActiveEdits = new Map(state.activeEdits);
            newActiveEdits.delete(blockId);

            const newIntents = new Map(state.intents);
            newIntents.delete(blockId);

            return {
              activeEdits: newActiveEdits,
              intents: newIntents,
            };
          },
          false,
          'cancelStreaming'
        ),

      // Validation management
      setPendingValidation: (blockId, pending) =>
        set(
          (state) => {
            const newPendingValidation = new Set(state.pendingValidation);
            if (pending) {
              newPendingValidation.add(blockId);
            } else {
              newPendingValidation.delete(blockId);
            }
            return { pendingValidation: newPendingValidation };
          },
          false,
          'setPendingValidation'
        ),

      // Timeout warning management
      setTimeoutWarning: (blockId, secondsRemaining) =>
        set(
          (state) => {
            const newWarnings = new Map(state.timeoutWarnings);
            newWarnings.set(blockId, secondsRemaining);
            return { timeoutWarnings: newWarnings };
          },
          false,
          'setTimeoutWarning'
        ),

      clearTimeoutWarning: (blockId) =>
        set(
          (state) => {
            const newWarnings = new Map(state.timeoutWarnings);
            newWarnings.delete(blockId);
            return { timeoutWarnings: newWarnings };
          },
          false,
          'clearTimeoutWarning'
        ),

      // Computed helpers
      getBlockIntent: (blockId) => get().intents.get(blockId),

      getBlockStreamingEdit: (blockId) => get().activeEdits.get(blockId),

      getQueuePosition: (blockId) => {
        const edit = get().queuedEdits.find(
          (e) => e.intent.blockId === blockId
        );
        return edit?.position;
      },

      isBlockStreaming: (blockId) => {
        const edit = get().activeEdits.get(blockId);
        return edit ? !edit.isComplete : false;
      },

      getBlocksBeingEditedByPipeline: (pipelineName) => {
        const blocks: string[] = [];
        get().activeEdits.forEach((edit, blockId) => {
          if (edit.pipelineName === pipelineName && !edit.isComplete) {
            blocks.push(blockId);
          }
        });
        return blocks;
      },
    }),
    { name: 'EditIntentStore' }
  )
);

// Selector hooks for common patterns
export const useBlockEditState = (blockId: string) => {
  const intent = useEditIntentStore((state) => state.intents.get(blockId));
  const streamingEdit = useEditIntentStore((state) =>
    state.activeEdits.get(blockId)
  );
  const queuePosition = useEditIntentStore((state) => {
    const edit = state.queuedEdits.find((e) => e.intent.blockId === blockId);
    return edit?.position;
  });
  const timeoutWarning = useEditIntentStore((state) =>
    state.timeoutWarnings.get(blockId)
  );
  const isPendingValidation = useEditIntentStore((state) =>
    state.pendingValidation.has(blockId)
  );

  return {
    intent,
    streamingEdit,
    queuePosition,
    timeoutWarning,
    isPendingValidation,
    isStreaming: streamingEdit ? !streamingEdit.isComplete : false,
    isQueued: queuePosition !== undefined,
  };
};

// Get all blocks with active edits for a document
export const useActiveEditBlocks = () => {
  return useEditIntentStore((state) => {
    const blockIds: string[] = [];
    state.activeEdits.forEach((edit, blockId) => {
      if (!edit.isComplete) {
        blockIds.push(blockId);
      }
    });
    return blockIds;
  });
};

// Get pipeline activity summary
export const usePipelineActivity = () => {
  return useEditIntentStore((state) => {
    const activity: Record<string, { editing: number; queued: number }> = {};

    state.activeEdits.forEach((edit) => {
      if (!edit.isComplete) {
        if (!activity[edit.pipelineName]) {
          activity[edit.pipelineName] = { editing: 0, queued: 0 };
        }
        activity[edit.pipelineName].editing++;
      }
    });

    state.queuedEdits.forEach((queued) => {
      const pipeline = queued.intent.pipelineName;
      if (!activity[pipeline]) {
        activity[pipeline] = { editing: 0, queued: 0 };
      }
      activity[pipeline].queued++;
    });

    return activity;
  });
};
