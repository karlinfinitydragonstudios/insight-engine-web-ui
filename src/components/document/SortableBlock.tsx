import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';

interface SortableBlockProps {
  id: string;
  children: React.ReactNode;
}

export function SortableBlock({ id, children }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/block flex items-stretch',
        isDragging && 'z-50 opacity-90'
      )}
    >
      {/* Drag handle container - slides in from left on hover */}
      <div
        className={cn(
          'flex-shrink-0 flex items-center transition-all duration-200 ease-out overflow-hidden',
          'w-0 group-hover/block:w-7',
          isDragging && 'w-7'
        )}
      >
        <div
          {...attributes}
          {...listeners}
          className={cn(
            'p-1 rounded hover:bg-accent/80 cursor-grab transition-opacity duration-200',
            'opacity-0 group-hover/block:opacity-100',
            isDragging && 'cursor-grabbing opacity-100'
          )}
          title="Drag to reorder"
        >
          {/* 6 dots grid (2x3) */}
          <div className="grid grid-cols-2 gap-[3px]">
            <div className="w-[4px] h-[4px] rounded-full bg-muted-foreground/60" />
            <div className="w-[4px] h-[4px] rounded-full bg-muted-foreground/60" />
            <div className="w-[4px] h-[4px] rounded-full bg-muted-foreground/60" />
            <div className="w-[4px] h-[4px] rounded-full bg-muted-foreground/60" />
            <div className="w-[4px] h-[4px] rounded-full bg-muted-foreground/60" />
            <div className="w-[4px] h-[4px] rounded-full bg-muted-foreground/60" />
          </div>
        </div>
      </div>

      {/* Block content - shrinks to make room for handle */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
