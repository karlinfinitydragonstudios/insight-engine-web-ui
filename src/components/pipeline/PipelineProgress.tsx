import { Loader2, CheckCircle, XCircle, PauseCircle, Clock } from 'lucide-react';
import type { PipelineState } from '../../types';
import { cn } from '../../lib/utils';

interface PipelineProgressProps {
  pipeline: PipelineState;
}

const pipelineLabels: Record<string, string> = {
  knowledge_base: 'Knowledge Base',
  tableau: 'Tableau',
  bigwinboard: 'BigWinBoard',
  aboutslots: 'AboutSlots',
  slot_graph: 'Slot Graph',
  confluence: 'Confluence',
  consolidator: 'Consolidator',
};

export function PipelineProgress({ pipeline }: PipelineProgressProps) {
  const progress = pipeline.maxTurns > 0
    ? (pipeline.currentTurn / pipeline.maxTurns) * 100
    : 0;

  const getStatusIcon = () => {
    switch (pipeline.status) {
      case 'pending':
        return <Clock className="w-3 h-3 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />;
      case 'paused':
        return <PauseCircle className="w-3 h-3 text-yellow-400" />;
      case 'complete':
        return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'error':
      case 'cancelled':
        return <XCircle className="w-3 h-3 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (pipeline.status) {
      case 'pending':
        return 'bg-gray-500';
      case 'running':
        return 'bg-blue-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'complete':
        return 'bg-green-500';
      case 'error':
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      {/* Status Icon */}
      {getStatusIcon()}

      {/* Pipeline Info */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-foreground">
            {pipelineLabels[pipeline.name] || pipeline.name}
          </span>
          {pipeline.status === 'running' && (
            <span className="text-xs text-muted-foreground">
              {pipeline.currentTurn}/{pipeline.maxTurns}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-background rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 rounded-full',
              getStatusColor()
            )}
            style={{
              width: pipeline.status === 'complete' ? '100%' : `${progress}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
