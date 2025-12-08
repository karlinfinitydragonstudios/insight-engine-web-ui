import type { Block } from '../../types';

interface BlockRendererProps {
  block: Block;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
}

export function BlockRenderer({
  block,
  isEditing,
  onStartEdit,
  onEndEdit,
}: BlockRendererProps) {
  // Render based on block type
  switch (block.type) {
    case 'paragraph':
      return (
        <ParagraphBlock
          block={block}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
        />
      );
    case 'heading':
      return <HeadingBlock block={block} />;
    case 'feature':
      return <FeatureBlock block={block} />;
    case 'math_model':
      return <MathModelBlock block={block} />;
    case 'metric_table':
      return <MetricTableBlock block={block} />;
    case 'callout':
      return <CalloutBlock block={block} />;
    default:
      return <GenericBlock block={block} />;
  }
}

// Paragraph Block
function ParagraphBlock({
  block,
  isEditing,
  onStartEdit,
  onEndEdit,
}: {
  block: Block;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
}) {
  const content = block.content as { text?: string };

  if (isEditing) {
    return (
      <textarea
        className="w-full bg-transparent text-foreground resize-none focus:outline-none"
        defaultValue={content.text || ''}
        autoFocus
        onBlur={onEndEdit}
        rows={3}
      />
    );
  }

  return (
    <p
      className="text-foreground leading-relaxed cursor-text"
      onClick={onStartEdit}
    >
      {content.text || 'Click to add content...'}
    </p>
  );
}

// Heading Block
function HeadingBlock({ block }: { block: Block }) {
  const content = block.content as { text?: string; level?: number };
  const level = content.level || 2;

  const sizeClasses: Record<number, string> = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-semibold',
    3: 'text-xl font-semibold',
    4: 'text-lg font-medium',
  };

  const className = `${sizeClasses[level] || sizeClasses[2]} text-foreground`;

  switch (level) {
    case 1:
      return <h1 className={className}>{content.text || 'Heading'}</h1>;
    case 3:
      return <h3 className={className}>{content.text || 'Heading'}</h3>;
    case 4:
      return <h4 className={className}>{content.text || 'Heading'}</h4>;
    default:
      return <h2 className={className}>{content.text || 'Heading'}</h2>;
  }
}

// Feature Block
function FeatureBlock({ block }: { block: Block }) {
  const content = block.content as {
    featureName?: string;
    category?: string;
    mechanicalOverview?: string;
    playerExperience?: string;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {content.featureName || 'Feature Name'}
        </h3>
        {content.category && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
            {content.category}
          </span>
        )}
      </div>
      {content.mechanicalOverview && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">
            Mechanical Overview
          </h4>
          <p className="text-sm text-foreground">{content.mechanicalOverview}</p>
        </div>
      )}
      {content.playerExperience && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">
            Player Experience
          </h4>
          <p className="text-sm text-foreground">{content.playerExperience}</p>
        </div>
      )}
    </div>
  );
}

// Math Model Block
function MathModelBlock({ block }: { block: Block }) {
  const content = block.content as {
    modelName?: string;
    rtp?: number;
    volatility?: string;
    hitFrequency?: number;
    maxWinMultiplier?: number;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">
        {content.modelName || 'Math Model'}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">RTP</div>
          <div className="text-xl font-bold text-primary">
            {content.rtp ? `${content.rtp}%` : '-'}
          </div>
        </div>
        <div className="bg-background rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Volatility</div>
          <div className="text-xl font-bold text-foreground capitalize">
            {content.volatility || '-'}
          </div>
        </div>
        <div className="bg-background rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Hit Frequency</div>
          <div className="text-xl font-bold text-foreground">
            {content.hitFrequency ? `1:${content.hitFrequency}` : '-'}
          </div>
        </div>
        <div className="bg-background rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Max Win</div>
          <div className="text-xl font-bold text-foreground">
            {content.maxWinMultiplier ? `${content.maxWinMultiplier}x` : '-'}
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Table Block
function MetricTableBlock({ block }: { block: Block }) {
  const content = block.content as {
    title?: string;
    headers?: string[];
    rows?: string[][];
  };

  return (
    <div className="space-y-2">
      {content.title && (
        <h3 className="text-lg font-semibold text-foreground">{content.title}</h3>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {(content.headers || []).map((header, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-medium text-muted-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(content.rows || []).map((row, i) => (
              <tr key={i} className="border-b border-border/50">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Callout Block
function CalloutBlock({ block }: { block: Block }) {
  const content = block.content as {
    type?: 'info' | 'warning' | 'success' | 'error';
    title?: string;
    text?: string;
  };

  const typeStyles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
  };

  const style = typeStyles[content.type || 'info'];

  return (
    <div className={`rounded-lg border p-4 ${style}`}>
      {content.title && (
        <h4 className="font-medium mb-1">{content.title}</h4>
      )}
      <p className="text-sm opacity-90">{content.text || ''}</p>
    </div>
  );
}

// Generic Block (fallback)
function GenericBlock({ block }: { block: Block }) {
  return (
    <div className="bg-background rounded-lg p-4">
      <div className="text-xs text-muted-foreground mb-2 capitalize">
        {block.type.replace(/_/g, ' ')}
      </div>
      <pre className="text-xs text-foreground overflow-auto">
        {JSON.stringify(block.content, null, 2)}
      </pre>
    </div>
  );
}
