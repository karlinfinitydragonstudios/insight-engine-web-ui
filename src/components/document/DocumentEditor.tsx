import { FileText, Plus } from 'lucide-react';
import { DocumentSection } from './DocumentSection';
import { BlockContainer } from './BlockContainer';
import { useDocumentStore } from '../../store';

export function DocumentEditor() {
  const { activeDocument, blockLocks } = useDocumentStore();
  const { document, isLoading, error } = activeDocument;

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
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            New Document
          </button>
        </div>
      </div>
    );
  }

  const getLockForBlock = (blockId: string) => {
    return blockLocks.find((lock) => lock.blockId === blockId);
  };

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-4xl mx-auto py-8 px-6">
        {/* Document Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {document.fileName}
          </h1>
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
        <div className="space-y-8">
          {document.content.sections.map((section) => (
            <DocumentSection key={section.id} section={section}>
              {section.blocks.map((block) => (
                <BlockContainer
                  key={block.id}
                  block={block}
                  lock={getLockForBlock(block.id)}
                />
              ))}
            </DocumentSection>
          ))}
        </div>

        {/* Add Section Button */}
        <div className="mt-8 pt-8 border-t border-border">
          <button className="w-full py-4 border-2 border-dashed border-border hover:border-primary/50 rounded-lg flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <Plus className="w-5 h-5" />
            Add Section
          </button>
        </div>
      </div>
    </div>
  );
}
