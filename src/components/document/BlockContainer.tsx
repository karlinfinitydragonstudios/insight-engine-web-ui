import { useState } from 'react';
import { Loader2, Lock, MoreHorizontal, GripVertical } from 'lucide-react';
import type { Block, BlockLock } from '../../types';
import { BlockRenderer } from './BlockRenderer';
import { cn } from '../../lib/utils';

interface BlockContainerProps {
  block: Block;
  lock?: BlockLock;
}

export function BlockContainer({ block, lock }: BlockContainerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isLocked = !!lock;
  const isLockedByPipeline = lock && lock.lockedBy !== 'user';

  return (
    <div
      className={cn(
        'relative group rounded-lg transition-all',
        isLocked && isLockedByPipeline && 'ring-2 ring-yellow-500/50 bg-yellow-500/5',
        !isLocked && isHovered && 'bg-accent/30',
        isEditing && 'ring-2 ring-primary/50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Lock Indicator */}
      {isLocked && isLockedByPipeline && (
        <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-full shadow-lg">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="font-medium">{lock.lockedBy}</span>
        </div>
      )}

      {/* Block Toolbar - visible on hover when not locked */}
      {isHovered && !isLocked && (
        <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 rounded hover:bg-accent transition-colors cursor-grab"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Block Content */}
      <div
        className={cn(
          'p-4 rounded-lg',
          isLocked && 'pointer-events-none opacity-75'
        )}
      >
        <BlockRenderer
          block={block}
          isEditing={isEditing}
          onStartEdit={() => !isLocked && setIsEditing(true)}
          onEndEdit={() => setIsEditing(false)}
        />
      </div>

      {/* Block Footer - visible on hover */}
      {isHovered && !isLocked && (
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1 rounded hover:bg-accent transition-colors"
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Block Metadata */}
      <div className="px-4 pb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="capitalize">{block.type.replace(/_/g, ' ')}</span>
        <div className="flex items-center gap-2">
          <span>{block.wordCount} words</span>
          {isLocked && (
            <span className="flex items-center gap-1 text-yellow-400">
              <Lock className="w-3 h-3" />
              Locked
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
