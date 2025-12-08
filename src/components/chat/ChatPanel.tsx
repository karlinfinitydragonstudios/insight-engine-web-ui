import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useChatStore, usePipelineStore } from '../../store';
import { cn } from '../../lib/utils';

export function ChatPanel() {
  const { messages, isLoading, streamingMessageId } = useChatStore();
  const { isAnalyzing } = usePipelineStore();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isAnalyzing) return;

    // TODO: Implement actual message sending via WebSocket
    console.log('Sending message:', input);
    setInput('');
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
