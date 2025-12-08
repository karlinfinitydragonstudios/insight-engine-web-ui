import { useCallback, useRef, useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface SplitPanelProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth: number; // Percentage (0-100)
  onWidthChange: (width: number) => void;
  minLeftWidth?: number;
  maxLeftWidth?: number;
}

export function SplitPanel({
  left,
  right,
  leftWidth,
  onWidthChange,
  minLeftWidth = 20,
  maxLeftWidth = 80,
}: SplitPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      const clampedPercentage = Math.min(
        Math.max(percentage, minLeftWidth),
        maxLeftWidth
      );

      onWidthChange(clampedPercentage);
    },
    [isDragging, minLeftWidth, maxLeftWidth, onWidthChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div ref={containerRef} className="h-full flex overflow-hidden">
      {/* Left Panel */}
      <div
        className="h-full overflow-hidden"
        style={{ width: `${leftWidth}%` }}
      >
        {left}
      </div>

      {/* Resizer */}
      <div
        className={cn(
          'w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors flex-shrink-0',
          isDragging && 'bg-primary'
        )}
        onMouseDown={handleMouseDown}
      />

      {/* Right Panel */}
      <div
        className="h-full overflow-hidden flex-1"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {right}
      </div>
    </div>
  );
}
