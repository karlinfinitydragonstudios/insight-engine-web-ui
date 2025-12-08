import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useChatStore, usePipelineStore, useAppStore } from '../../store';
import { cn } from '../../lib/utils';
import { v4 as uuidv4 } from 'uuid';

const API_URL = 'http://localhost:8000';

export function ChatPanel() {
  const { messages, isLoading, streamingMessageId, addMessage, setLoading, setStreamingMessage, appendToMessage } = useChatStore();
  const { isAnalyzing } = usePipelineStore();
  const { session } = useAppStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const sendMessage = useCallback(async (content: string) => {
    // Create a temporary session ID if not connected
    const sessionId = session.sessionId || uuidv4();

    // Add user message to UI immediately
    const userMessage = {
      id: uuidv4(),
      sessionId,
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
      sessionId,
      role: 'assistant' as const,
      content: '',
      timestamp: new Date().toISOString(),
      documentReferences: [],
    };
    addMessage(assistantMessage);
    setStreamingMessage(assistantMessageId);

    try {
      const response = await fetch(`${API_URL}/api/chat/${sessionId}/send`, {
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
  }, [session.sessionId, addMessage, setLoading, setStreamingMessage, appendToMessage]);

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

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Chat</h2>
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
