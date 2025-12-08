import { useEffect, useState } from 'react';
import { Loader2, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import type { StreamingEdit, PipelineName, QueuedEdit } from '../../types/directive';
import { PIPELINE_COLORS } from '../../types/directive';
import { cn } from '../../lib/utils';

interface StreamingBlockOverlayProps {
  streamingEdit?: StreamingEdit;
  queuedEdit?: QueuedEdit;
  timeoutWarning?: number; // seconds remaining
  isComplete?: boolean;
}

export function StreamingBlockOverlay({
  streamingEdit,
  queuedEdit,
  timeoutWarning,
  isComplete,
}: StreamingBlockOverlayProps) {
  const [showContent, setShowContent] = useState(true);

  // Typewriter cursor animation
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (!streamingEdit || streamingEdit.isComplete) return;

    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 530);

    return () => clearInterval(interval);
  }, [streamingEdit]);

  // Calculate elapsed time for streaming
  const elapsedTime = streamingEdit
    ? Math.floor((Date.now() - streamingEdit.startedAt) / 1000)
    : 0;

  // Get pipeline color
  const pipelineColor = streamingEdit
    ? PIPELINE_COLORS[streamingEdit.pipelineName]
    : queuedEdit
    ? PIPELINE_COLORS[queuedEdit.intent.pipelineName]
    : '#64748b';

  // Render queued state
  if (queuedEdit && !streamingEdit) {
    return (
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Amber ring for queued */}
        <div
          className="absolute inset-0 rounded-lg ring-2"
          style={{ borderColor: '#f59e0b', boxShadow: '0 0 0 2px #f59e0b40' }}
        />

        {/* Queue badge */}
        <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-amber-500 text-black text-xs px-2 py-0.5 rounded-full shadow-lg">
          <Clock className="w-3 h-3" />
          <span className="font-medium">
            {queuedEdit.intent.pipelineName} (#{queuedEdit.position})
          </span>
        </div>

        {/* Estimated wait overlay */}
        <div className="absolute inset-0 bg-amber-500/5 rounded-lg flex items-center justify-center">
          <div className="bg-background/90 px-3 py-2 rounded-lg text-sm text-muted-foreground">
            Waiting for lock... ~{Math.ceil(queuedEdit.estimatedWaitMs / 1000)}s
          </div>
        </div>
      </div>
    );
  }

  // Render streaming state
  if (streamingEdit && !streamingEdit.isComplete) {
    return (
      <div className="absolute inset-0 z-10">
        {/* Pipeline-colored ring */}
        <div
          className="absolute inset-0 rounded-lg ring-2 animate-pulse"
          style={{ boxShadow: `0 0 0 2px ${pipelineColor}40` }}
        />

        {/* Streaming badge */}
        <div
          className="absolute -top-2 -right-2 flex items-center gap-1 text-white text-xs px-2 py-0.5 rounded-full shadow-lg"
          style={{ backgroundColor: pipelineColor }}
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="font-medium">{streamingEdit.pipelineName}</span>
          <span className="opacity-75">{elapsedTime}s</span>
        </div>

        {/* Timeout warning */}
        {timeoutWarning !== undefined && timeoutWarning <= 5 && (
          <div className="absolute -bottom-2 -right-2 flex items-center gap-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full shadow-lg animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            <span className="font-medium">{timeoutWarning}s left</span>
          </div>
        )}

        {/* Streaming content overlay */}
        {showContent && streamingEdit.streamingContent && (
          <div className="absolute inset-0 bg-background/95 rounded-lg p-4 overflow-auto">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">
                {streamingEdit.streamingContent}
                {cursorVisible && (
                  <span
                    className="inline-block w-0.5 h-4 ml-0.5 align-middle"
                    style={{ backgroundColor: pipelineColor }}
                  />
                )}
              </p>
            </div>
          </div>
        )}

        {/* Toggle content visibility */}
        <button
          className="absolute bottom-2 left-2 text-xs text-muted-foreground hover:text-foreground transition-colors pointer-events-auto"
          onClick={() => setShowContent(!showContent)}
        >
          {showContent ? 'Hide preview' : 'Show preview'}
        </button>
      </div>
    );
  }

  // Render completion state (brief flash)
  if (isComplete || streamingEdit?.isComplete) {
    return (
      <div className="absolute inset-0 z-10 pointer-events-none animate-fade-out">
        <div
          className="absolute inset-0 rounded-lg ring-2"
          style={{ boxShadow: `0 0 0 2px ${pipelineColor}40` }}
        />
        <div
          className="absolute -top-2 -right-2 flex items-center gap-1 text-white text-xs px-2 py-0.5 rounded-full shadow-lg"
          style={{ backgroundColor: pipelineColor }}
        >
          <CheckCircle className="w-3 h-3" />
          <span className="font-medium">Complete</span>
        </div>
      </div>
    );
  }

  return null;
}

// Compact indicator for block header
interface StreamingIndicatorProps {
  pipelineName: PipelineName;
  isStreaming: boolean;
  isQueued?: boolean;
  queuePosition?: number;
}

export function StreamingIndicator({
  pipelineName,
  isStreaming,
  isQueued,
  queuePosition,
}: StreamingIndicatorProps) {
  const color = PIPELINE_COLORS[pipelineName];

  if (isQueued && queuePosition !== undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">
        <Clock className="w-3 h-3" />
        #{queuePosition}
      </span>
    );
  }

  if (isStreaming) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded text-white"
        style={{ backgroundColor: color }}
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        {pipelineName}
      </span>
    );
  }

  return null;
}

// Progress bar for streaming
interface StreamingProgressProps {
  streamingEdit: StreamingEdit;
  estimatedDuration?: number; // ms
}

export function StreamingProgress({
  streamingEdit,
  estimatedDuration = 30000,
}: StreamingProgressProps) {
  const elapsed = Date.now() - streamingEdit.startedAt;
  const progress = Math.min((elapsed / estimatedDuration) * 100, 95);
  const color = PIPELINE_COLORS[streamingEdit.pipelineName];

  return (
    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
