import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({
  isVisible,
  message = 'Loading...',
  className,
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-200',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        className
      )}
    >
      <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card border border-border shadow-lg">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-sm font-medium text-foreground">{message}</span>
      </div>
    </div>
  );
}
