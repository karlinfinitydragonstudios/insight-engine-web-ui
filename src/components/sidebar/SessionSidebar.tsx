import { useEffect, useState, useCallback } from 'react';
import { useAppStore, SessionListItem } from '../../store/appStore';
import { v4 as uuidv4 } from 'uuid';

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
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
        <h2 className="text-sm font-semibold text-text-primary">Chats</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChat}
            className="p-1.5 rounded hover:bg-background text-text-secondary hover:text-accent transition-colors"
            title="New Chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
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
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {sessionList.isLoading ? (
          <div className="flex items-center justify-center p-4">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessionList.error ? (
          <div className="p-4 text-sm text-red-400">{sessionList.error}</div>
        ) : sessionList.sessions.length === 0 ? (
          <div className="p-4 text-sm text-text-muted text-center">
            No conversations yet.
            <br />
            <button
              onClick={handleNewChat}
              className="text-accent hover:underline mt-2"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          <div className="py-2">
            {sessionList.sessions.map((s) => (
              <div
                key={s.id}
                className={`
                  group relative px-3 py-2 mx-2 rounded cursor-pointer
                  transition-colors
                  ${session.sessionId === s.id
                    ? 'bg-accent/20 text-accent'
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
                    <div className="text-sm font-medium truncate pr-12">{s.title}</div>
                    <div className="text-xs text-text-muted mt-0.5">{formatDate(s.lastActivityAt)}</div>

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
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this conversation?')) {
                            handleDeleteSession(s.id);
                          }
                        }}
                        className="p-1 rounded hover:bg-surface text-text-muted hover:text-red-400"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
