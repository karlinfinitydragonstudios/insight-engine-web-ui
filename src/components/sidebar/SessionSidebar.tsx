import { useEffect, useState, useCallback } from 'react';
import { useAppStore, SessionListItem } from '../../store/appStore';
import { useDocumentStore } from '../../store/documentStore';
import { FileText, ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function SessionSidebar() {
  const {
    ui,
    session,
    sessionList,
    toggleSidebar,
    setSessions,
    setSessionsLoading,
    setSessionsError,
    addSession,
    updateSessionTitle,
    removeSession,
    setSessionId,
  } = useAppStore();

  const {
    activeDocument,
    documentList,
    setDocument,
    setDocumentList,
    setDocumentListLoading,
    setDocumentListError,
    removeFromDocumentList,
    addToDocumentList,
    setLoading: setDocLoading,
    setError: setDocError,
  } = useDocumentStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [documentsExpanded, setDocumentsExpanded] = useState(true);
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const [showNewDocDialog, setShowNewDocDialog] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
    fetchDocuments();
  }, []);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/sessions`);
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      setSessions(data);

      // If we have a persisted sessionId, verify it exists in the list
      if (session.sessionId) {
        const exists = data.some((s: SessionListItem) => s.id === session.sessionId);
        if (!exists && data.length > 0) {
          // Persisted session no longer exists, select first one
          setSessionId(data[0].id);
        }
      } else if (data.length > 0) {
        // No session selected, pick the first one
        setSessionId(data[0].id);
      }
    } catch (error) {
      setSessionsError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const fetchDocuments = async () => {
    setDocumentListLoading(true);
    try {
      const res = await fetch('/api/documents');
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json();
      setDocumentList(data);
    } catch (error) {
      setDocumentListError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleSelectDocument = async (docId: string) => {
    setDocLoading(true);
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (!res.ok) throw new Error('Failed to load document');
      const data = await res.json();
      setDocument(data);
    } catch (error) {
      setDocError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        removeFromDocumentList(docId);
        // If deleting current document, clear it
        if (activeDocument.document?.id === docId) {
          setDocument(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleCreateDocument = async () => {
    if (!newDocName.trim()) return;

    setIsCreatingDoc(true);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: newDocName.trim() }),
      });

      if (!response.ok) throw new Error('Failed to create document');

      const newDoc = await response.json();

      // Add to list
      addToDocumentList({
        id: newDoc.id,
        fileName: newDoc.fileName,
        version: newDoc.version || '1.0.0',
        status: newDoc.status || 'draft',
        createdAt: newDoc.createdAt,
        updatedAt: newDoc.updatedAt,
      });

      // Fetch and select the full document
      const fullResponse = await fetch(`/api/documents/${newDoc.id}`);
      if (fullResponse.ok) {
        const fullDoc = await fullResponse.json();
        setDocument(fullDoc);
      }

      setShowNewDocDialog(false);
      setNewDocName('');
    } catch (err) {
      console.error('Failed to create document:', err);
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const handleNewChat = useCallback(async () => {
    try {
      // Create session in database
      const res = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat', metadata: {} }),
      });

      if (!res.ok) throw new Error('Failed to create session');

      const data = await res.json();
      const newSession: SessionListItem = {
        id: data.sessionId,
        title: data.title || 'New Chat',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };
      addSession(newSession);
      setSessionId(data.sessionId);
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  }, [addSession, setSessionId]);

  const handleSelectSession = useCallback((sessionId: string) => {
    setSessionId(sessionId);
  }, [setSessionId]);

  const handleStartEdit = useCallback((session: SessionListItem) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  }, []);

  const handleSaveTitle = useCallback(async (sessionId: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      });

      if (res.ok) {
        updateSessionTitle(sessionId, editTitle.trim());
      }
    } catch (error) {
      console.error('Failed to update title:', error);
    }

    setEditingId(null);
  }, [editTitle, updateSessionTitle]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        removeSession(sessionId);
        // If deleting current session, switch to another or create new
        if (session.sessionId === sessionId) {
          const remaining = sessionList.sessions.filter(s => s.id !== sessionId);
          if (remaining.length > 0) {
            setSessionId(remaining[0].id);
          } else {
            handleNewChat();
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, [removeSession, session.sessionId, sessionList.sessions, setSessionId, handleNewChat]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`
        flex flex-col bg-surface border-r border-border h-full
        transition-all duration-300 ease-in-out
        ${ui.sidebarOpen ? 'w-64' : 'w-0'}
        overflow-hidden
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text-primary">Workspace</h2>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded hover:bg-background text-text-secondary hover:text-text-primary transition-colors"
          title="Close sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Documents Section */}
        <div className="border-b border-border">
          <div className="flex items-center justify-between px-3 py-2 text-sm font-medium text-text-primary">
            <button
              onClick={() => setDocumentsExpanded(!documentsExpanded)}
              className="flex items-center gap-2 hover:text-accent transition-colors"
            >
              {documentsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <FileText className="w-4 h-4" />
              <span>Documents</span>
            </button>
            <button
              onClick={() => setShowNewDocDialog(true)}
              className="p-1 rounded hover:bg-surface text-text-muted hover:text-accent"
              title="New Document"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {documentsExpanded && (
            <div className="py-1">
              {documentList.isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : documentList.error ? (
                <div className="px-3 py-2 text-xs text-red-400">{documentList.error}</div>
              ) : documentList.documents.length === 0 ? (
                <div className="px-3 py-2 text-xs text-text-muted">No documents yet</div>
              ) : (
                documentList.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`
                      group relative px-3 py-1.5 mx-2 rounded cursor-pointer text-sm
                      transition-colors
                      ${activeDocument.document?.id === doc.id
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-background text-text-secondary hover:text-text-primary'}
                    `}
                    onClick={() => handleSelectDocument(doc.id)}
                  >
                    <div className="truncate pr-6">{doc.fileName}</div>
                    <div className="text-xs text-text-muted">{formatDate(doc.updatedAt)}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this document?')) {
                          handleDeleteDocument(doc.id);
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface text-text-muted hover:text-red-400 transition-opacity"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Chats Section */}
        <div>
          <div className="flex items-center justify-between px-3 py-2 text-sm font-medium text-text-primary">
            <button
              onClick={() => setChatsExpanded(!chatsExpanded)}
              className="flex items-center gap-2 hover:text-accent transition-colors"
            >
              {chatsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Chats</span>
            </button>
            <button
              onClick={handleNewChat}
              className="p-1 rounded hover:bg-surface text-text-muted hover:text-accent"
              title="New Chat"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {chatsExpanded && (
            <div className="py-1">
              {sessionList.isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sessionList.error ? (
                <div className="px-3 py-2 text-xs text-red-400">{sessionList.error}</div>
              ) : sessionList.sessions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-text-muted">No chats yet</div>
              ) : (
                sessionList.sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`
                      group relative px-3 py-1.5 mx-2 rounded cursor-pointer text-sm
                      transition-colors
                      ${session.sessionId === s.id
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-background text-text-secondary hover:text-text-primary'}
                    `}
                    onClick={() => handleSelectSession(s.id)}
                  >
                    {editingId === s.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleSaveTitle(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTitle(s.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <div className="truncate pr-12">{s.title}</div>
                        <div className="text-xs text-text-muted">{formatDate(s.lastActivityAt)}</div>

                        {/* Action buttons */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(s);
                            }}
                            className="p-1 rounded hover:bg-surface text-text-muted hover:text-text-primary"
                            title="Rename"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Delete this conversation?')) {
                                handleDeleteSession(s.id);
                              }
                            }}
                            className="p-1 rounded hover:bg-surface text-text-muted hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

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
                disabled={!newDocName.trim() || isCreatingDoc}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isCreatingDoc ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
