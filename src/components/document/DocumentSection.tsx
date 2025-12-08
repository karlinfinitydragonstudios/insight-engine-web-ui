import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, MoreHorizontal, Plus, Trash2, Copy, ArrowUp, ArrowDown } from 'lucide-react';
import type { Section, BlockType } from '../../types';
import { cn } from '../../lib/utils';
import { SortableBlock } from './SortableBlock';
import type { DragHandleProps } from './SortableSection';

const BLOCK_TYPES: { value: BlockType; label: string; description: string }[] = [
  { value: 'paragraph', label: 'Paragraph', description: 'Basic text content' },
  { value: 'heading', label: 'Heading', description: 'Section or subsection header' },
  { value: 'feature', label: 'Feature', description: 'Game feature description' },
  { value: 'math_model', label: 'Math Model', description: 'Mathematical formula or model' },
  { value: 'metric_table', label: 'Metric Table', description: 'Data metrics in table format' },
  { value: 'archetype_profile', label: 'Archetype Profile', description: 'Player archetype details' },
  { value: 'chart', label: 'Chart', description: 'Visual data chart' },
  { value: 'image', label: 'Image', description: 'Image or screenshot' },
  { value: 'callout', label: 'Callout', description: 'Important note or warning' },
  { value: 'competitor_analysis', label: 'Competitor Analysis', description: 'Competitive comparison' },
  { value: 'ab_test_result', label: 'A/B Test Result', description: 'Test results and findings' },
];

interface DocumentSectionProps {
  section: Section;
  children: React.ReactNode;
  documentId: string;
  onDelete?: (sectionId: string) => void;
  onMoveUp?: (sectionId: string) => void;
  onMoveDown?: (sectionId: string) => void;
  onBlockAdded?: () => void;
  onBlockMoved?: (blockId: string, newPosition: number) => void;
  isFirst?: boolean;
  isLast?: boolean;
  renderBlock?: (block: { id: string }, index: number) => React.ReactNode;
  // Drag handle props from SortableSection
  dragHandleProps?: DragHandleProps;
}

export function DocumentSection({
  section,
  children,
  documentId,
  onDelete,
  onMoveUp,
  onMoveDown,
  onBlockAdded,
  onBlockMoved,
  isFirst = false,
  isLast = false,
  renderBlock,
  dragHandleProps,
}: DocumentSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [showAddBlockDialog, setShowAddBlockDialog] = useState(false);
  const [newBlockType, setNewBlockType] = useState<BlockType>('paragraph');
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Position menu and handle outside clicks
  useEffect(() => {
    if (showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 192, // 192px = w-48
      });
    }
  }, [showMenu]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Drag-and-drop sensors for blocks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle block drag end
  const handleBlockDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const blocks = section.blocks;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    if (onBlockMoved) {
      onBlockMoved(active.id as string, newIndex);
    } else {
      // Fallback: direct API call
      try {
        const response = await fetch(`/api/documents/blocks/${active.id}/position`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPosition: newIndex }),
        });
        if (!response.ok) throw new Error('Failed to move block');
        onBlockAdded?.(); // Refresh document
      } catch (err) {
        console.error('Move block error:', err);
      }
    }
  };

  const sectionTypeColors: Record<string, { border: string; bg: string }> = {
    executive_summary: { border: 'bg-blue-500', bg: 'hover:bg-blue-500/20' },
    design_vision: { border: 'bg-purple-500', bg: 'hover:bg-purple-500/20' },
    game_mechanics: { border: 'bg-green-500', bg: 'hover:bg-green-500/20' },
    math_framework: { border: 'bg-orange-500', bg: 'hover:bg-orange-500/20' },
    player_experience: { border: 'bg-pink-500', bg: 'hover:bg-pink-500/20' },
    progression_systems: { border: 'bg-cyan-500', bg: 'hover:bg-cyan-500/20' },
    success_metrics: { border: 'bg-yellow-500', bg: 'hover:bg-yellow-500/20' },
    compliance: { border: 'bg-red-500', bg: 'hover:bg-red-500/20' },
    data_sources: { border: 'bg-gray-500', bg: 'hover:bg-gray-500/20' },
    custom: { border: 'bg-primary', bg: 'hover:bg-primary/20' },
  };

  const colorConfig = sectionTypeColors[section.type] || sectionTypeColors.custom;

  const handleAddBlock = async () => {
    setIsAddingBlock(true);
    try {
      const position = section.blocks.length;
      const response = await fetch(`/api/documents/${documentId}/sections/${section.id}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockType: newBlockType,
          content: getDefaultContentForBlockType(newBlockType),
          position,
          createdBy: 'user',
        }),
      });

      if (!response.ok) throw new Error('Failed to add block');

      setShowAddBlockDialog(false);
      setNewBlockType('paragraph');
      onBlockAdded?.();
    } catch (err) {
      console.error('Add block error:', err);
    } finally {
      setIsAddingBlock(false);
    }
  };

  const getDefaultContentForBlockType = (type: BlockType): Record<string, unknown> => {
    switch (type) {
      case 'paragraph':
        return { text: '' };
      case 'heading':
        return { text: '', level: 2 };
      case 'feature':
        return { name: '', description: '', mechanics: [] };
      case 'math_model':
        return { formula: '', variables: [], description: '' };
      case 'metric_table':
        return { headers: [], rows: [] };
      case 'archetype_profile':
        return { name: '', traits: [], preferences: [] };
      case 'chart':
        return { chartType: 'bar', data: [], title: '' };
      case 'image':
        return { src: '', alt: '', caption: '' };
      case 'callout':
        return { type: 'info', text: '' };
      case 'competitor_analysis':
        return { competitor: '', strengths: [], weaknesses: [] };
      case 'ab_test_result':
        return { testName: '', variants: [], results: {} };
      default:
        return { text: '' };
    }
  };

  return (
    <div
      className={cn(
        'bg-card rounded-lg border border-border overflow-hidden flex',
        dragHandleProps?.isDragging && 'ring-2 ring-primary/50'
      )}
    >
      {/* Draggable colored left border - expands on hover */}
      <div
        {...(dragHandleProps?.attributes || {})}
        {...(dragHandleProps?.listeners || {})}
        className={cn(
          'w-1.5 hover:w-3 flex-shrink-0 transition-all cursor-grab',
          colorConfig.border,
          colorConfig.bg,
          dragHandleProps?.isDragging && 'cursor-grabbing w-3'
        )}
        title="Drag to reorder section"
      />

      {/* Section content wrapper */}
      <div className="flex-1 min-w-0">
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
            ref={buttonRef}
            className="p-1 rounded hover:bg-accent transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Dropdown Menu - Portal */}
          {showMenu && createPortal(
            <div
              ref={menuRef}
              className="fixed w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-[100]"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              {!isFirst && onMoveUp && (
                <button
                  className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveUp(section.id);
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveDown(section.id);
                    setShowMenu(false);
                  }}
                >
                  <ArrowDown className="w-4 h-4" />
                  Move Down
                </button>
              )}
              <button
                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(section.id);
                  setShowMenu(false);
                }}
              >
                <Copy className="w-4 h-4" />
                Copy Section ID
              </button>
              {onDelete && (
                <>
                  <div className="border-t border-border my-1" />
                  <button
                    className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-accent text-red-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete "${section.title}"? This cannot be undone.`)) {
                        onDelete(section.id);
                      }
                      setShowMenu(false);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Section
                  </button>
                </>
              )}
            </div>,
            document.body
          )}
        </div>
      </div>

      {/* Section Content */}
      {!isCollapsed && (
        <div className="p-4 space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleBlockDragEnd}
          >
            <SortableContext
              items={section.blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {renderBlock
                  ? section.blocks.map((block, index) => (
                      <SortableBlock key={block.id} id={block.id}>
                        {renderBlock(block, index)}
                      </SortableBlock>
                    ))
                  : children}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add Block Button */}
          <button
            onClick={() => setShowAddBlockDialog(true)}
            className="w-full py-2 border border-dashed border-border hover:border-primary/50 rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Block
          </button>
        </div>
      )}

      {/* Add Block Dialog */}
      {showAddBlockDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg w-full max-w-md shadow-xl max-h-[80vh] flex flex-col">
            <div className="p-6 pb-4 border-b border-border">
              <h2 className="text-lg font-semibold">Add New Block</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 py-4 space-y-2">
              {BLOCK_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setNewBlockType(type.value)}
                  className={cn(
                    'w-full px-4 py-3 text-left rounded-lg border transition-colors',
                    newBlockType === type.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                  )}
                >
                  <div className="font-medium text-foreground">{type.label}</div>
                  <div className="text-sm text-muted-foreground">{type.description}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 p-6 pt-4 border-t border-border">
              <button
                onClick={() => {
                  setShowAddBlockDialog(false);
                  setNewBlockType('paragraph');
                }}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBlock}
                disabled={isAddingBlock}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isAddingBlock ? 'Adding...' : 'Add Block'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
