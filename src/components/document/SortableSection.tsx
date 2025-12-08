import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Section } from '../../types';
import { cn } from '../../lib/utils';

export interface DragHandleProps {
  attributes: React.HTMLAttributes<HTMLElement>;
  listeners: DraggableSyntheticListeners;
  isDragging: boolean;
}

interface SortableSectionProps {
  section: Section;
  children: (dragHandleProps: DragHandleProps) => React.ReactNode;
}

export function SortableSection({ section, children }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    // Only translate, don't scale/resize during drag
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        isDragging && 'z-50 opacity-90'
      )}
    >
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}
