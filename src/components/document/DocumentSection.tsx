import { useState } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from 'lucide-react';
import type { Section } from '../../types';
import { cn } from '../../lib/utils';

interface DocumentSectionProps {
  section: Section;
  children: React.ReactNode;
}

export function DocumentSection({ section, children }: DocumentSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sectionTypeColors: Record<string, string> = {
    executive_summary: 'border-l-blue-500',
    design_vision: 'border-l-purple-500',
    game_mechanics: 'border-l-green-500',
    math_framework: 'border-l-orange-500',
    player_experience: 'border-l-pink-500',
    progression_systems: 'border-l-cyan-500',
    success_metrics: 'border-l-yellow-500',
    compliance: 'border-l-red-500',
    data_sources: 'border-l-gray-500',
    custom: 'border-l-primary',
  };

  const borderColor = sectionTypeColors[section.type] || 'border-l-primary';

  return (
    <div
      className={cn(
        'bg-card rounded-lg border border-border overflow-hidden',
        'border-l-4',
        borderColor
      )}
    >
      {/* Section Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/50 cursor-pointer transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <button className="p-0.5 rounded hover:bg-accent transition-colors">
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {section.title}
            </h2>
            <span className="text-xs text-muted-foreground capitalize">
              {section.type.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Validation warnings */}
          {section.validation?.warnings && section.validation.warnings.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
              {section.validation.warnings.length} suggestion
              {section.validation.warnings.length !== 1 && 's'}
            </span>
          )}

          {/* Block count */}
          <span className="text-xs text-muted-foreground">
            {section.blocks.length} block{section.blocks.length !== 1 && 's'}
          </span>

          {/* More menu */}
          <button
            className="p-1 rounded hover:bg-accent transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Show context menu
            }}
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Section Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-3">
          {children}

          {/* Add Block Button */}
          <button className="w-full py-2 border border-dashed border-border hover:border-primary/50 rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="w-4 h-4" />
            Add Block
          </button>
        </div>
      )}
    </div>
  );
}
