import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChatMessage, DocumentReference } from '../types';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  streamingMessageId: string | null;
  referencedDocuments: Map<string, DocumentReference>;

  // Actions
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  appendToMessage: (messageId: string, content: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  setLoading: (isLoading: boolean) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  updateStreamingContent: (content: string) => void;
  setStreamingMessage: (messageId: string | null) => void;
  addDocumentReference: (ref: DocumentReference) => void;
  removeDocumentReference: (documentId: string) => void;
  clearDocumentReferences: () => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set) => ({
      messages: [],
      isLoading: false,
      isStreaming: false,
      streamingContent: '',
      streamingMessageId: null,
      referencedDocuments: new Map(),

      addMessage: (message) =>
        set(
          (state) => ({
            messages: [...state.messages, message],
          }),
          false,
          'addMessage'
        ),

      updateMessage: (messageId, updates) =>
        set(
          (state) => ({
            messages: state.messages.map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
          }),
          false,
          'updateMessage'
        ),

      appendToMessage: (messageId, content) =>
        set(
          (state) => ({
            messages: state.messages.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: msg.content + content }
                : msg
            ),
          }),
          false,
          'appendToMessage'
        ),

      setMessages: (messages) =>
        set({ messages }, false, 'setMessages'),

      clearMessages: () =>
        set({ messages: [], streamingMessageId: null }, false, 'clearMessages'),

      setLoading: (isLoading) =>
        set({ isLoading }, false, 'setLoading'),

      setIsStreaming: (isStreaming) =>
        set({ isStreaming, streamingContent: isStreaming ? '' : '' }, false, 'setIsStreaming'),

      updateStreamingContent: (content) =>
        set(
          (state) => ({ streamingContent: state.streamingContent + content }),
          false,
          'updateStreamingContent'
        ),

      setStreamingMessage: (messageId) =>
        set({ streamingMessageId: messageId }, false, 'setStreamingMessage'),

      addDocumentReference: (ref) =>
        set(
          (state) => {
            const refs = new Map(state.referencedDocuments);
            refs.set(ref.documentId, ref);
            return { referencedDocuments: refs };
          },
          false,
          'addDocumentReference'
        ),

      removeDocumentReference: (documentId) =>
        set(
          (state) => {
            const refs = new Map(state.referencedDocuments);
            refs.delete(documentId);
            return { referencedDocuments: refs };
          },
          false,
          'removeDocumentReference'
        ),

      clearDocumentReferences: () =>
        set(
          { referencedDocuments: new Map() },
          false,
          'clearDocumentReferences'
        ),
    }),
    { name: 'ChatStore' }
  )
);
