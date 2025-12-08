import { X, Pause, Play, RotateCcw } from 'lucide-react';
import { usePipelineStore } from '../../store';
import { PipelineProgress } from './PipelineProgress';
import { cn } from '../../lib/utils';

export function PipelineStatusBar() {
  const { pipelines, isAnalyzing, currentQuery, clearPipelines } = usePipelineStore();

  const pipelineArray = Array.from(pipelines.values());
  const activePipelines = pipelineArray.filter(
    (p) => p.status === 'running' || p.status === 'pending'
  );
  const completedPipelines = pipelineArray.filter((p) => p.status === 'complete');
  const errorPipelines = pipelineArray.filter((p) => p.status === 'error');

  if (!isAnalyzing && pipelineArray.length === 0) {
    return null;
  }

  return (
    <div className="h-14 bg-card border-t border-border px-4 flex items-center justify-between">
      {/* Left: Pipeline Progress */}
      <div className="flex items-center gap-4 overflow-x-auto">
        {pipelineArray.map((pipeline) => (
          <PipelineProgress key={pipeline.name} pipeline={pipeline} />
        ))}
      </div>

      {/* Right: Summary and Actions */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Summary */}
        <div className="flex items-center gap-3 text-xs">
          {activePipelines.length > 0 && (
            <span className="text-blue-400">
              {activePipelines.length} running
            </span>
          )}
          {completedPipelines.length > 0 && (
            <span className="text-green-400">
              {completedPipelines.length} complete
            </span>
          )}
          {errorPipelines.length > 0 && (
            <span className="text-red-400">
              {errorPipelines.length} failed
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isAnalyzing && (
            <>
              <button
                className="p-1.5 rounded hover:bg-accent transition-colors"
                title="Pause all"
              >
                <Pause className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                className="p-1.5 rounded hover:bg-accent transition-colors"
                title="Cancel all"
                onClick={clearPipelines}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          )}
          {!isAnalyzing && pipelineArray.length > 0 && (
            <>
              <button
                className="p-1.5 rounded hover:bg-accent transition-colors"
                title="Rerun analysis"
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                className="p-1.5 rounded hover:bg-accent transition-colors"
                title="Clear"
                onClick={clearPipelines}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
