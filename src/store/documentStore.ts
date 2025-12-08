import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Document, Section, Block, BlockLock } from '../types';

interface ActiveDocument {
  document: Document | null;
  isLoading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
}

interface DocumentListItem {
  id: string;
  fileName: string;
  version: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentList {
  documents: DocumentListItem[];
  isLoading: boolean;
  error: string | null;
}

interface DocumentState {
  activeDocument: ActiveDocument;
  documentList: DocumentList;
  blockLocks: BlockLock[];
  recentDocuments: { id: string; fileName: string; accessedAt: string }[];

  // Actions
  setDocument: (document: Document | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setDocumentList: (documents: DocumentListItem[]) => void;
  setDocumentListLoading: (isLoading: boolean) => void;
  setDocumentListError: (error: string | null) => void;
  addToDocumentList: (doc: DocumentListItem) => void;
  removeFromDocumentList: (id: string) => void;
  updateBlock: (blockId: string, content: Record<string, unknown>) => void;
  updateSection: (sectionId: string, updates: Partial<Section>) => void;
  setBlockLocks: (locks: BlockLock[]) => void;
  addBlockLock: (lock: BlockLock) => void;
  setBlockLock: (lock: Partial<BlockLock> & { blockId: string }) => void;
  removeBlockLock: (blockId: string) => void;
  addRecentDocument: (id: string, fileName: string) => void;
  markUnsavedChanges: (hasChanges: boolean) => void;
}

export const useDocumentStore = create<DocumentState>()(
  devtools(
    (set, get) => ({
      activeDocument: {
        document: null,
        isLoading: false,
        error: null,
        hasUnsavedChanges: false,
      },
      documentList: {
        documents: [],
        isLoading: false,
        error: null,
      },
      blockLocks: [],
      recentDocuments: [],

      setDocumentList: (documents) =>
        set(
          (state) => ({
            documentList: { ...state.documentList, documents, isLoading: false, error: null },
          }),
          false,
          'setDocumentList'
        ),

      setDocumentListLoading: (isLoading) =>
        set(
          (state) => ({
            documentList: { ...state.documentList, isLoading },
          }),
          false,
          'setDocumentListLoading'
        ),

      setDocumentListError: (error) =>
        set(
          (state) => ({
            documentList: { ...state.documentList, error, isLoading: false },
          }),
          false,
          'setDocumentListError'
        ),

      addToDocumentList: (doc) =>
        set(
          (state) => ({
            documentList: {
              ...state.documentList,
              documents: [doc, ...state.documentList.documents],
            },
          }),
          false,
          'addToDocumentList'
        ),

      removeFromDocumentList: (id) =>
        set(
          (state) => ({
            documentList: {
              ...state.documentList,
              documents: state.documentList.documents.filter((d) => d.id !== id),
            },
          }),
          false,
          'removeFromDocumentList'
        ),

      setDocument: (document) =>
        set(
          (state) => ({
            activeDocument: {
              ...state.activeDocument,
              document,
              isLoading: false,
              error: null,
              hasUnsavedChanges: false,
            },
          }),
          false,
          'setDocument'
        ),

      setLoading: (isLoading) =>
        set(
          (state) => ({
            activeDocument: { ...state.activeDocument, isLoading },
          }),
          false,
          'setLoading'
        ),

      setError: (error) =>
        set(
          (state) => ({
            activeDocument: { ...state.activeDocument, error, isLoading: false },
          }),
          false,
          'setError'
        ),

      updateBlock: (blockId, content) =>
        set(
          (state) => {
            if (!state.activeDocument.document) return state;

            const updatedSections = state.activeDocument.document.content.sections.map(
              (section) => ({
                ...section,
                blocks: section.blocks.map((block) =>
                  block.id === blockId
                    ? { ...block, content, updatedAt: new Date().toISOString() }
                    : block
                ),
              })
            );

            return {
              activeDocument: {
                ...state.activeDocument,
                document: {
                  ...state.activeDocument.document,
                  content: {
                    ...state.activeDocument.document.content,
                    sections: updatedSections,
                  },
                  updatedAt: new Date().toISOString(),
                },
                hasUnsavedChanges: true,
              },
            };
          },
          false,
          'updateBlock'
        ),

      updateSection: (sectionId, updates) =>
        set(
          (state) => {
            if (!state.activeDocument.document) return state;

            const updatedSections = state.activeDocument.document.content.sections.map(
              (section) =>
                section.id === sectionId ? { ...section, ...updates } : section
            );

            return {
              activeDocument: {
                ...state.activeDocument,
                document: {
                  ...state.activeDocument.document,
                  content: {
                    ...state.activeDocument.document.content,
                    sections: updatedSections,
                  },
                  updatedAt: new Date().toISOString(),
                },
                hasUnsavedChanges: true,
              },
            };
          },
          false,
          'updateSection'
        ),

      setBlockLocks: (locks) =>
        set({ blockLocks: locks }, false, 'setBlockLocks'),

      addBlockLock: (lock) =>
        set(
          (state) => ({
            blockLocks: [...state.blockLocks.filter((l) => l.blockId !== lock.blockId), lock],
          }),
          false,
          'addBlockLock'
        ),

      setBlockLock: (lock) =>
        set(
          (state) => {
            const existing = state.blockLocks.find((l) => l.blockId === lock.blockId);
            const newLock: BlockLock = {
              id: existing?.id || `lock-${lock.blockId}-${Date.now()}`,
              blockId: lock.blockId,
              documentId: lock.documentId || existing?.documentId || '',
              sessionId: lock.sessionId || existing?.sessionId || '',
              lockedBy: lock.lockedBy || existing?.lockedBy || '',
              lockType: 'exclusive',
              acquiredAt: lock.acquiredAt || existing?.acquiredAt || new Date().toISOString(),
              expiresAt: lock.expiresAt || existing?.expiresAt || '',
            };
            return {
              blockLocks: [
                ...state.blockLocks.filter((l) => l.blockId !== lock.blockId),
                newLock,
              ],
            };
          },
          false,
          'setBlockLock'
        ),

      removeBlockLock: (blockId) =>
        set(
          (state) => ({
            blockLocks: state.blockLocks.filter((l) => l.blockId !== blockId),
          }),
          false,
          'removeBlockLock'
        ),

      addRecentDocument: (id, fileName) =>
        set(
          (state) => {
            const filtered = state.recentDocuments.filter((d) => d.id !== id);
            return {
              recentDocuments: [
                { id, fileName, accessedAt: new Date().toISOString() },
                ...filtered,
              ].slice(0, 10), // Keep only 10 recent documents
            };
          },
          false,
          'addRecentDocument'
        ),

      markUnsavedChanges: (hasChanges) =>
        set(
          (state) => ({
            activeDocument: {
              ...state.activeDocument,
              hasUnsavedChanges: hasChanges,
            },
          }),
          false,
          'markUnsavedChanges'
        ),
    }),
    { name: 'DocumentStore' }
  )
);
