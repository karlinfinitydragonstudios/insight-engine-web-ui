import { User, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType } from '../../types';
import { cn } from '../../lib/utils';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div
      className={cn(
        'flex gap-3 animate-in',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-blue-500' : 'bg-primary/20'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex flex-col max-w-[80%]',
          isUser && 'items-end'
        )}
      >
        {/* Header */}
        <div className={cn('flex items-center gap-2 mb-1', isUser && 'flex-row-reverse')}>
          <span className="text-xs font-medium text-foreground">
            {isUser ? 'You' : isSystem ? 'System' : 'Insight Engine'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            'rounded-lg px-4 py-2',
            isUser
              ? 'bg-blue-500 text-white'
              : isSystem
              ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-200'
              : 'bg-accent text-foreground'
          )}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-code:bg-black/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/30 prose-pre:p-3 prose-pre:rounded-lg">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && (
            <span className="inline-flex items-center gap-1 mt-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs opacity-70">Generating...</span>
            </span>
          )}
        </div>

        {/* Data Sources */}
        {message.dataSources && message.dataSources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.dataSources.map((source) => (
              <span
                key={source.source}
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  source.status === 'completed' && 'bg-green-500/20 text-green-400',
                  source.status === 'loading' && 'bg-blue-500/20 text-blue-400',
                  source.status === 'pending' && 'bg-gray-500/20 text-gray-400',
                  source.status === 'error' && 'bg-red-500/20 text-red-400'
                )}
              >
                {source.status === 'loading' && (
                  <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                )}
                {source.source}
                {source.resultCount !== undefined && ` (${source.resultCount})`}
              </span>
            ))}
          </div>
        )}

        {/* Document References */}
        {message.documentReferences && message.documentReferences.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.documentReferences.map((ref) => (
              <button
                key={ref.documentId}
                className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
              >
                @{ref.documentName}
                {ref.sectionId && `#${ref.sectionId}`}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
