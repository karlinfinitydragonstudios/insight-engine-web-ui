import { FileText, HelpCircle } from 'lucide-react';
import { useDocumentStore, useAppStore } from '../../store';
import { cn } from '../../lib/utils';
import { SettingsDropdown } from './SettingsDropdown';

export function Header() {
  const { activeDocument } = useDocumentStore();
  const { session } = useAppStore();

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4">
      {/* Left: Logo and Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Insight Engine
            </h1>
          </div>
        </div>

        {/* Document Name */}
        {activeDocument.document && (
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
            <span className="text-sm text-muted-foreground">
              {activeDocument.document.fileName}
            </span>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                activeDocument.document.status === 'draft' &&
                  'bg-yellow-500/20 text-yellow-500',
                activeDocument.document.status === 'review' &&
                  'bg-blue-500/20 text-blue-500',
                activeDocument.document.status === 'finalized' &&
                  'bg-green-500/20 text-green-500',
                activeDocument.document.status === 'archived' &&
                  'bg-gray-500/20 text-gray-500'
              )}
            >
              {activeDocument.document.status}
            </span>
            {activeDocument.hasUnsavedChanges && (
              <span className="w-2 h-2 rounded-full bg-orange-500" title="Unsaved changes" />
            )}
          </div>
        )}
      </div>

      {/* Right: Status and Actions */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              session.status === 'connected' && 'bg-green-500',
              session.status === 'connecting' && 'bg-yellow-500 animate-pulse',
              session.status === 'reconnecting' && 'bg-orange-500 animate-pulse',
              session.status === 'disconnected' && 'bg-red-500',
              session.status === 'error' && 'bg-red-500'
            )}
          />
          <span className="text-xs text-muted-foreground capitalize">
            {session.status}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <SettingsDropdown />
          <button
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title="Help"
          >
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  );
}
