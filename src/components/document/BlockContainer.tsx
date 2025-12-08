import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Lock, MoreHorizontal, Clock, AlertTriangle, Trash2, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import type { Block, BlockLock } from '../../types';
import { BlockRenderer } from './BlockRenderer';
import { StreamingBlockOverlay } from './StreamingBlockOverlay';
import { useBlockEditState } from '../../store/editIntentStore';
import { PIPELINE_COLORS } from '../../types/directive';
import { cn } from '../../lib/utils';

interface BlockContainerProps {
  block: Block;
  lock?: BlockLock;
  onDelete?: (blockId: string) => void;
  onMoveUp?: (blockId: string) => void;
  onMoveDown?: (blockId: string) => void;
  onSave?: (blockId: string, content: Record<string, unknown>) => Promise<void>;
  isFirst?: boolean;
  isLast?: boolean;
}

export function BlockContainer({
  block,
  lock,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSave,
  isFirst = false,
  isLast = false,
}: BlockContainerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCompleteFlash, setShowCompleteFlash] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Position menu when it opens
  useEffect(() => {
    if (showMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 192, // 192px = w-48
      });
    }
  }, [showMenu]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Get streaming/queue state from edit intent store
  const {
    intent,
    streamingEdit,
    queuePosition,
    timeoutWarning,
    isStreaming,
    isQueued,
  } = useBlockEditState(block.id);

  const isLocked = !!lock;
  const isLockedByPipeline = lock && lock.lockedBy !== 'user';

  // Get the pipeline name for coloring
  const pipelineName = streamingEdit?.pipelineName || intent?.pipelineName;
  const pipelineColor = pipelineName ? PIPELINE_COLORS[pipelineName] : undefined;

  // Show completion flash briefly
  useEffect(() => {
    if (streamingEdit?.isComplete) {
      setShowCompleteFlash(true);
      const timer = setTimeout(() => {
        setShowCompleteFlash(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [streamingEdit?.isComplete]);

  // Build queued edit object if needed
  const queuedEdit = isQueued && intent
    ? {
        intent: {
          pipelineName: intent.pipelineName,
          blockId: intent.blockId,
          sectionId: intent.sectionId,
          priority: intent.priority,
          affinityScore: intent.affinityScore,
          timestamp: intent.timestamp,
        },
        position: queuePosition!,
        estimatedWaitMs: (queuePosition || 1) * 5000, // Rough estimate
      }
    : undefined;

  // Determine ring color based on state
  const getRingStyle = () => {
    if (isStreaming && pipelineColor) {
      return {
        boxShadow: `0 0 0 2px ${pipelineColor}40`,
        borderColor: pipelineColor,
      };
    }
    if (isQueued) {
      return {
        boxShadow: '0 0 0 2px #f59e0b40',
        borderColor: '#f59e0b',
      };
    }
    if (isLocked && isLockedByPipeline) {
      return {
        boxShadow: '0 0 0 2px #eab30840',
        borderColor: '#eab308',
      };
    }
    return {};
  };

  return (
    <div
      className={cn(
        'relative group rounded-lg transition-all',
        isStreaming && 'ring-2',
        isQueued && !isStreaming && 'ring-2 ring-amber-500/50 bg-amber-500/5',
        isLocked && isLockedByPipeline && !isStreaming && !isQueued && 'ring-2 ring-yellow-500/50 bg-yellow-500/5',
        !isLocked && !isStreaming && !isQueued && isHovered && 'bg-accent/30',
        isEditing && 'ring-2 ring-primary/50'
      )}
      style={getRingStyle()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Streaming/Queue Overlay */}
      {(isStreaming || isQueued || showCompleteFlash) && (
        <StreamingBlockOverlay
          streamingEdit={streamingEdit}
          queuedEdit={queuedEdit}
          timeoutWarning={timeoutWarning}
          isComplete={showCompleteFlash}
        />
      )}

      {/* Lock Indicator - show when locked but not streaming/queued */}
      {isLocked && isLockedByPipeline && !isStreaming && !isQueued && (
        <div
          className="absolute -top-2 -right-2 z-10 flex items-center gap-1 text-black text-xs px-2 py-0.5 rounded-full shadow-lg"
          style={{ backgroundColor: pipelineColor || '#eab308' }}
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="font-medium">{lock.lockedBy}</span>
        </div>
      )}

      {/* Timeout Warning Badge */}
      {timeoutWarning !== undefined && timeoutWarning <= 10 && !isStreaming && (
        <div className="absolute -bottom-2 -right-2 z-10 flex items-center gap-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full shadow-lg animate-pulse">
          <AlertTriangle className="w-3 h-3" />
          <span className="font-medium">{timeoutWarning}s</span>
        </div>
      )}

      {/* Block Content */}
      <div
        className={cn(
          'p-4 rounded-lg',
          (isLocked || isStreaming || isQueued) && 'pointer-events-none opacity-75'
        )}
      >
        <BlockRenderer
          block={block}
          isEditing={isEditing}
          onStartEdit={() => !isLocked && !isStreaming && !isQueued && setIsEditing(true)}
          onEndEdit={() => setIsEditing(false)}
          onSave={onSave}
        />
      </div>

      {/* Block Menu Button - visible on hover when not locked */}
      {isHovered && !isLocked && !isStreaming && !isQueued && (
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            ref={menuButtonRef}
            className="p-1 rounded hover:bg-accent transition-colors"
            title="More options"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Block Dropdown Menu - Portal */}
      {showMenu && createPortal(
        <div
          ref={menuRef}
          className="fixed w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-[100]"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {!isFirst && onMoveUp && (
            <button
              className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent transition-colors"
              onClick={() => {
                onMoveUp(block.id);
                setShowMenu(false);
              }}
            >
              <ArrowUp className="w-4 h-4" />
              Move Up
            </button>
          )}
          {!isLast && onMoveDown && (
            <button
              className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent transition-colors"
              onClick={() => {
                onMoveDown(block.id);
                setShowMenu(false);
              }}
            >
              <ArrowDown className="w-4 h-4" />
              Move Down
            </button>
          )}
          <button
            className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent transition-colors"
            onClick={() => {
              navigator.clipboard.writeText(block.id);
              setShowMenu(false);
            }}
          >
            <Copy className="w-4 h-4" />
            Copy Block ID
          </button>
          {onDelete && (
            <>
              <div className="border-t border-border my-1" />
              <button
                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent text-red-400 transition-colors"
                onClick={() => {
                  if (window.confirm('Delete this block? This cannot be undone.')) {
                    onDelete(block.id);
                  }
                  setShowMenu(false);
                }}
              >
                <Trash2 className="w-4 h-4" />
                Delete Block
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Block Metadata */}
      <div className="px-4 pb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="capitalize">{block.type.replace(/_/g, ' ')}</span>
        <div className="flex items-center gap-2">
          <span>{block.wordCount} words</span>

          {/* Queue position indicator */}
          {isQueued && queuePosition !== undefined && (
            <span className="flex items-center gap-1 text-amber-500">
              <Clock className="w-3 h-3" />
              Queue #{queuePosition}
            </span>
          )}

          {/* Streaming indicator */}
          {isStreaming && pipelineName && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-xs"
              style={{ backgroundColor: pipelineColor }}
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              {pipelineName}
            </span>
          )}

          {/* Lock indicator when not streaming */}
          {isLocked && !isStreaming && !isQueued && (
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
