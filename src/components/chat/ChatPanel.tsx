import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useChatStore, usePipelineStore, useAppStore } from '../../store';
import { SessionListItem } from '../../store/appStore';
import { cn } from '../../lib/utils';
import { v4 as uuidv4 } from 'uuid';

const API_URL = 'http://localhost:8000';

export function ChatPanel() {
  const { messages, isLoading, streamingMessageId, addMessage, setLoading, setStreamingMessage, appendToMessage, clearMessages, setMessages } = useChatStore();
  const { isAnalyzing } = usePipelineStore();
  const { session, sessionList, updateSessionTitle, setSessionId, addSession } = useAppStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousSessionId = useRef<string | null>(null);

  // Load messages when sessionId changes
  useEffect(() => {
    if (session.sessionId && session.sessionId !== previousSessionId.current) {
      previousSessionId.current = session.sessionId;
      clearMessages();
      loadMessages(session.sessionId);
    }
  }, [session.sessionId, clearMessages]);

  const loadMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/chat/${sessionId}/history`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages.map((msg: any) => ({
            id: msg.id,
            sessionId: msg.sessionId,
            role: msg.role,
            content: msg.content,
            timestamp: msg.createdAt,
            documentReferences: msg.documentReferences || [],
          })));
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [input]);

  // Generate title from first message
  const generateTitle = useCallback(async (sessionId: string, content: string) => {
    // Create a short title from the first message
    const title = content.length > 30 ? content.substring(0, 30) + '...' : content;

    try {
      const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });

      if (res.ok) {
        updateSessionTitle(sessionId, title);
      }
    } catch (error) {
      console.error('Failed to update session title:', error);
    }
  }, [updateSessionTitle]);

  const sendMessage = useCallback(async (content: string) => {
    let sessionId = session.sessionId;
    const isFirstMessage = messages.length === 0;

    // Create session via API if none exists
    if (!sessionId) {
      try {
        const res = await fetch(`${API_URL}/api/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Chat', metadata: {} }),
        });
        if (!res.ok) {
          console.error('Failed to create session');
          return;
        }
        const data = await res.json();
        sessionId = data.sessionId as string;
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
        console.error('Failed to create session:', error);
        return;
      }
    }

    // At this point sessionId is guaranteed to be a string
    const currentSessionId = sessionId as string;

    // Add user message to UI immediately
    const userMessage = {
      id: uuidv4(),
      sessionId: currentSessionId,
      role: 'user' as const,
      content,
      timestamp: new Date().toISOString(),
      documentReferences: [],
    };
    addMessage(userMessage);
    setLoading(true);

    // Create placeholder for assistant message
    const assistantMessageId = uuidv4();
    const assistantMessage = {
      id: assistantMessageId,
      sessionId: currentSessionId,
      role: 'assistant' as const,
      content: '',
      timestamp: new Date().toISOString(),
      documentReferences: [],
    };
    addMessage(assistantMessage);
    setStreamingMessage(assistantMessageId);

    // Generate title from first message
    if (isFirstMessage) {
      generateTitle(currentSessionId, content);
    }

    try {
      const response = await fetch(`${API_URL}/api/chat/${currentSessionId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'token') {
                appendToMessage(assistantMessageId, data.content);
              } else if (data.type === 'complete') {
                setStreamingMessage(null);
                setLoading(false);
              } else if (data.type === 'error') {
                console.error('Stream error:', data.error);
                appendToMessage(assistantMessageId, `\n\nError: ${data.error}`);
                setStreamingMessage(null);
                setLoading(false);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      appendToMessage(assistantMessageId, `Error: Failed to send message. Make sure the server is running.`);
      setStreamingMessage(null);
      setLoading(false);
    }
  }, [session.sessionId, messages.length, addMessage, setLoading, setStreamingMessage, appendToMessage, generateTitle, addSession, setSessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isAnalyzing) return;

    const content = input.trim();
    setInput('');
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Get current session title
  const currentSession = sessionList.sessions.find(s => s.id === session.sessionId);
  const sessionTitle = currentSession?.title || 'New Chat';

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground truncate" title={sessionTitle}>
            {sessionTitle}
          </h2>
          <div className="flex items-center gap-2">
            {isAnalyzing && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Analyzing...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Start a conversation
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Ask questions about your design document or request changes to specific sections.
            </p>
            <div className="mt-6 space-y-2">
              <p className="text-xs text-muted-foreground">Try asking:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  'Analyze game mechanics',
                  'Update RTP to 96.5%',
                  'Add volatility section',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={message.id === streamingMessageId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end gap-2 bg-background rounded-lg border border-border focus-within:border-primary/50 transition-colors">
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2">
              <button
                type="button"
                className="p-1.5 rounded hover:bg-accent transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                className="p-1.5 rounded hover:bg-accent transition-colors"
                title="Voice input"
              >
                <Mic className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-transparent py-3 pr-2 resize-none focus:outline-none text-sm text-foreground placeholder:text-muted-foreground"
              rows={1}
              disabled={isLoading || isAnalyzing}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isAnalyzing}
              className={cn(
                'p-2 m-2 rounded-lg transition-colors',
                input.trim() && !isLoading && !isAnalyzing
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-accent text-muted-foreground cursor-not-allowed'
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Hint */}
          <p className="text-xs text-muted-foreground mt-2">
            Use <kbd className="px-1 py-0.5 bg-accent rounded text-xs">@doc:Name</kbd> to reference documents
          </p>
        </form>
      </div>
    </div>
  );
}
