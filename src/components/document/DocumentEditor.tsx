import { useState, useRef } from 'react';
import { FileText, Plus, Loader2 } from 'lucide-react';
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
import { DocumentSection } from './DocumentSection';
import { SortableSection } from './SortableSection';
import { BlockContainer } from './BlockContainer';
import { useDocumentStore } from '../../store';
import type { SectionType } from '../../types';

const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: 'executive_summary', label: 'Executive Summary' },
  { value: 'design_vision', label: 'Design Vision' },
  { value: 'game_mechanics', label: 'Game Mechanics' },
  { value: 'math_framework', label: 'Math Framework' },
  { value: 'player_experience', label: 'Player Experience' },
  { value: 'progression_systems', label: 'Progression Systems' },
  { value: 'success_metrics', label: 'Success Metrics' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'data_sources', label: 'Data Sources' },
  { value: 'custom', label: 'Custom Section' },
];

export function DocumentEditor() {
  const { activeDocument, blockLocks, setDocument, setLoading, setError } = useDocumentStore();
  const { document, isLoading, error } = activeDocument;
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showAddSectionDialog, setShowAddSectionDialog] = useState(false);
  const [newSectionType, setNewSectionType] = useState<SectionType>('custom');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Drag-and-drop sensors - MUST be called before any early returns
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

  const handleCreateDocument = async () => {
    if (!newDocName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: newDocName.trim() }),
      });

      if (!response.ok) throw new Error('Failed to create document');

      const newDoc = await response.json();

      // Fetch the full document with sections
      const fullResponse = await fetch(`/api/documents/${newDoc.id}`);
      if (!fullResponse.ok) throw new Error('Failed to load document');

      const fullDoc = await fullResponse.json();
      setDocument(fullDoc);
      setShowNewDocDialog(false);
      setNewDocName('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddSection = async () => {
    if (!document || !newSectionTitle.trim()) return;

    setIsAddingSection(true);
    try {
      const position = document.content.sections.length;
      const response = await fetch(`/api/documents/${document.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionType: newSectionType,
          title: newSectionTitle.trim(),
          position,
        }),
      });

      if (!response.ok) throw new Error('Failed to add section');

      // Refresh the full document to get the new section
      const fullResponse = await fetch(`/api/documents/${document.id}`);
      if (!fullResponse.ok) throw new Error('Failed to reload document');

      const fullDoc = await fullResponse.json();
      setDocument(fullDoc);
      setShowAddSectionDialog(false);
      setNewSectionTitle('');
      setNewSectionType('custom');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsAddingSection(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-foreground">No document open</h3>
          <p className="text-sm text-muted-foreground">
            Create a new document or open an existing one to start editing.
          </p>
          <button
            onClick={() => setShowNewDocDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Document
          </button>

          {/* New Document Dialog */}
          {showNewDocDialog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
                <h2 className="text-lg font-semibold mb-4">Create New Document</h2>
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Document name..."
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateDocument()}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowNewDocDialog(false);
                      setNewDocName('');
                    }}
                    className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateDocument}
                    disabled={!newDocName.trim() || isCreating}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const getLockForBlock = (blockId: string) => {
    return blockLocks.find((lock) => lock.blockId === blockId);
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!document) return;
    try {
      const response = await fetch(`/api/documents/blocks/${blockId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete block');
      await refreshDocument();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSaveBlock = async (blockId: string, content: Record<string, unknown>) => {
    if (!document) return;
    try {
      const response = await fetch(`/api/documents/blocks/${blockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, updatedBy: 'user' }),
      });
      if (!response.ok) throw new Error('Failed to save block');
      await refreshDocument();
    } catch (err) {
      setError((err as Error).message);
      throw err; // Re-throw to let BlockRenderer know save failed
    }
  };

  const handleMoveBlock = async (blockId: string, sectionId: string, direction: 'up' | 'down') => {
    if (!document) return;

    const section = document.content.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const currentIndex = section.blocks.findIndex((b) => b.id === blockId);
    if (currentIndex === -1) return;

    const newPosition = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newPosition < 0 || newPosition >= section.blocks.length) return;

    try {
      const response = await fetch(`/api/documents/blocks/${blockId}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPosition }),
      });
      if (!response.ok) throw new Error('Failed to move block');
      await refreshDocument();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!document) return;
    try {
      const response = await fetch(`/api/documents/${document.id}/sections/${sectionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete section');

      // Refresh the document
      const fullResponse = await fetch(`/api/documents/${document.id}`);
      if (fullResponse.ok) {
        const fullDoc = await fullResponse.json();
        setDocument(fullDoc);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const refreshDocument = async () => {
    if (!document) return;
    try {
      const fullResponse = await fetch(`/api/documents/${document.id}`);
      if (fullResponse.ok) {
        const fullDoc = await fullResponse.json();
        setDocument(fullDoc);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Optimistic block move within a section
  const handleOptimisticBlockMove = async (sectionId: string, blockId: string, newPosition: number) => {
    if (!document) return;

    const sectionIndex = document.content.sections.findIndex((s) => s.id === sectionId);
    if (sectionIndex === -1) return;

    const section = document.content.sections[sectionIndex];
    const blocks = [...section.blocks];
    const oldIndex = blocks.findIndex((b) => b.id === blockId);
    if (oldIndex === -1 || oldIndex === newPosition) return;

    // Optimistic update: reorder blocks immediately
    const [movedBlock] = blocks.splice(oldIndex, 1);
    blocks.splice(newPosition, 0, movedBlock);

    // Update local state immediately
    const updatedSections = [...document.content.sections];
    updatedSections[sectionIndex] = { ...section, blocks };

    setDocument({
      ...document,
      content: {
        ...document.content,
        sections: updatedSections,
      },
    });

    // Show saving indicator
    setIsSaving(true);

    // Persist to server in background
    try {
      const response = await fetch(`/api/documents/blocks/${blockId}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPosition }),
      });
      if (!response.ok) throw new Error('Failed to move block');
    } catch (err) {
      // Revert on error
      setError((err as Error).message);
      await refreshDocument();
    } finally {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setIsSaving(false), 500);
    }
  };

  const handleMoveSection = async (sectionId: string, direction: 'up' | 'down') => {
    if (!document) return;

    const sections = document.content.sections;
    const currentIndex = sections.findIndex((s) => s.id === sectionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    try {
      const response = await fetch(`/api/documents/${document.id}/sections/${sectionId}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPosition: newIndex }),
      });
      if (!response.ok) throw new Error('Failed to move section');

      await refreshDocument();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Handle section drag end with optimistic update
  const handleSectionDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !document) return;

    const sections = [...document.content.sections];
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic update: reorder sections immediately in UI
    const [movedSection] = sections.splice(oldIndex, 1);
    sections.splice(newIndex, 0, movedSection);

    // Update local state immediately
    setDocument({
      ...document,
      content: {
        ...document.content,
        sections,
        order: sections.map((s) => s.id),
      },
    });

    // Show saving indicator
    setIsSaving(true);

    // Persist to server in background
    try {
      const response = await fetch(`/api/documents/${document.id}/sections/${active.id}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPosition: newIndex }),
      });
      if (!response.ok) throw new Error('Failed to move section');
    } catch (err) {
      // Revert on error
      setError((err as Error).message);
      await refreshDocument();
    } finally {
      // Clear saving indicator after a brief delay for UX
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setIsSaving(false), 500);
    }
  };

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-4xl mx-auto py-8 px-6">
        {/* Document Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              {document.fileName}
            </h1>
            {isSaving && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Saving...</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Version {document.version}</span>
            <span>•</span>
            <span className="capitalize">{document.status}</span>
            <span>•</span>
            <span>
              Last updated{' '}
              {new Date(document.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Document Sections */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext
            items={document.content.sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-8">
              {document.content.sections.map((section, index) => (
                <SortableSection key={section.id} section={section}>
                  {(dragHandleProps) => (
                    <DocumentSection
                      section={section}
                      documentId={document.id}
                      onDelete={handleDeleteSection}
                      onMoveUp={(sectionId) => handleMoveSection(sectionId, 'up')}
                      onMoveDown={(sectionId) => handleMoveSection(sectionId, 'down')}
                      onBlockAdded={refreshDocument}
                      onBlockMoved={(blockId, newPosition) => handleOptimisticBlockMove(section.id, blockId, newPosition)}
                      isFirst={index === 0}
                      isLast={index === document.content.sections.length - 1}
                      dragHandleProps={dragHandleProps}
                      renderBlock={(block, blockIndex) => {
                        const fullBlock = section.blocks.find((b) => b.id === block.id);
                        if (!fullBlock) return null;
                        return (
                          <BlockContainer
                            block={fullBlock}
                            onDelete={handleDeleteBlock}
                            onMoveUp={(blockId) => handleMoveBlock(blockId, section.id, 'up')}
                            onMoveDown={(blockId) => handleMoveBlock(blockId, section.id, 'down')}
                            onSave={handleSaveBlock}
                            isFirst={blockIndex === 0}
                            isLast={blockIndex === section.blocks.length - 1}
                            lock={getLockForBlock(fullBlock.id)}
                          />
                        );
                      }}
                    >
                      {null}
                    </DocumentSection>
                  )}
                </SortableSection>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add Section Button */}
        <div className="mt-8 pt-8 border-t border-border">
          <button
            onClick={() => setShowAddSectionDialog(true)}
            className="w-full py-4 border-2 border-dashed border-border hover:border-primary/50 rounded-lg flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Section
          </button>
        </div>

        {/* Add Section Dialog */}
        {showAddSectionDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
              <h2 className="text-lg font-semibold mb-4">Add New Section</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Section Type
                  </label>
                  <select
                    value={newSectionType}
                    onChange={(e) => {
                      setNewSectionType(e.target.value as SectionType);
                      // Auto-fill title based on type selection
                      const selected = SECTION_TYPES.find(t => t.value === e.target.value);
                      if (selected && e.target.value !== 'custom') {
                        setNewSectionTitle(selected.label);
                      }
                    }}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {SECTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder="Enter section title..."
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowAddSectionDialog(false);
                    setNewSectionTitle('');
                    setNewSectionType('custom');
                  }}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSection}
                  disabled={!newSectionTitle.trim() || isAddingSection}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isAddingSection ? 'Adding...' : 'Add Section'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
