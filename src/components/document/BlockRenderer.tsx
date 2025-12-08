import { useState, useEffect, useRef } from 'react';
import { Info, AlertTriangle, CheckCircle, XCircle, Plus, X } from 'lucide-react';
import type { Block } from '../../types';
import { cn } from '../../lib/utils';

interface BlockRendererProps {
  block: Block;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onSave?: (blockId: string, content: Record<string, unknown>) => Promise<void>;
}

export function BlockRenderer({
  block,
  isEditing,
  onStartEdit,
  onEndEdit,
  onSave,
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
          onSave={onSave}
        />
      );
    case 'heading':
      return (
        <HeadingBlock
          block={block}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
          onSave={onSave}
        />
      );
    case 'feature':
      return (
        <FeatureBlock
          block={block}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
          onSave={onSave}
        />
      );
    case 'math_model':
      return (
        <MathModelBlock
          block={block}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
          onSave={onSave}
        />
      );
    case 'metric_table':
      return (
        <MetricTableBlock
          block={block}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
          onSave={onSave}
        />
      );
    case 'callout':
      return (
        <CalloutBlock
          block={block}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
          onSave={onSave}
        />
      );
    case 'image':
      return (
        <ImageBlock
          block={block}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
          onSave={onSave}
        />
      );
    case 'archetype_profile':
      return (
        <ArchetypeProfileBlock
          block={block}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
          onSave={onSave}
        />
      );
    case 'chart':
      return (
        <ChartBlock
          block={block}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
          onSave={onSave}
        />
      );
    case 'competitor_analysis':
      return (
        <CompetitorAnalysisBlock
          block={block}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
          onSave={onSave}
        />
      );
    case 'ab_test_result':
      return (
        <ABTestResultBlock
          block={block}
          isEditing={isEditing}
          onStartEdit={onStartEdit}
          onEndEdit={onEndEdit}
          onSave={onSave}
        />
      );
    default:
      return <GenericBlock block={block} />;
  }
}

// Common Props Interface
interface EditableBlockProps {
  block: Block;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onSave?: (blockId: string, content: Record<string, unknown>) => Promise<void>;
}

// Common editable wrapper styles
const editableWrapperClass = 'cursor-text hover:bg-accent/30 rounded transition-colors';
const inputClass = 'w-full bg-muted border border-border rounded px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary';
const labelClass = 'block text-sm font-medium text-muted-foreground mb-1';

// Paragraph Block
function ParagraphBlock({ block, isEditing, onStartEdit, onEndEdit, onSave }: EditableBlockProps) {
  const content = block.content as { text?: string };
  const [text, setText] = useState(content.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(content.text || '');
  }, [content.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(text.length, text.length);
    }
  }, [isEditing, text.length]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(block.id, { text });
    }
    onEndEdit();
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <textarea
          ref={textareaRef}
          className={cn(inputClass, 'resize-none min-h-[100px]')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setText(content.text || '');
              onEndEdit();
            }
          }}
          rows={4}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => { setText(content.text || ''); onEndEdit(); }}
            className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <p
      className={cn('text-foreground leading-relaxed', editableWrapperClass)}
      onClick={onStartEdit}
    >
      {content.text || <span className="text-muted-foreground italic">Click to add content...</span>}
    </p>
  );
}

// Heading Block
function HeadingBlock({ block, isEditing, onStartEdit, onEndEdit, onSave }: EditableBlockProps) {
  const content = block.content as { text?: string; level?: number };
  const [text, setText] = useState(content.text || '');
  const [level, setLevel] = useState(content.level || 2);

  useEffect(() => {
    setText(content.text || '');
    setLevel(content.level || 2);
  }, [content.text, content.level]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(block.id, { text, level });
    }
    onEndEdit();
  };

  const sizeClasses: Record<number, string> = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-semibold',
    3: 'text-xl font-semibold',
    4: 'text-lg font-medium',
  };

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className={labelClass}>Heading Text</label>
            <input
              type="text"
              className={inputClass}
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') onEndEdit();
              }}
            />
          </div>
          <div className="w-24">
            <label className={labelClass}>Level</label>
            <select
              className={inputClass}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            >
              <option value={1}>H1</option>
              <option value={2}>H2</option>
              <option value={3}>H3</option>
              <option value={4}>H4</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onEndEdit} className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button onClick={handleSave} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">
            Save
          </button>
        </div>
      </div>
    );
  }

  const className = cn(sizeClasses[level] || sizeClasses[2], 'text-foreground', editableWrapperClass);
  const headingContent = content.text || <span className="text-muted-foreground italic">Click to add heading...</span>;

  // Use explicit conditional rendering for each heading level to avoid TypeScript issues
  switch (level) {
    case 1:
      return <h1 className={className} onClick={onStartEdit}>{headingContent}</h1>;
    case 3:
      return <h3 className={className} onClick={onStartEdit}>{headingContent}</h3>;
    case 4:
      return <h4 className={className} onClick={onStartEdit}>{headingContent}</h4>;
    case 2:
    default:
      return <h2 className={className} onClick={onStartEdit}>{headingContent}</h2>;
  }
}

// Feature Block
function FeatureBlock({ block, isEditing, onStartEdit, onEndEdit, onSave }: EditableBlockProps) {
  const content = block.content as {
    featureName?: string;
    name?: string;
    category?: string;
    mechanicalOverview?: string;
    description?: string;
    playerExperience?: string;
    mechanics?: string[];
  };

  const [featureName, setFeatureName] = useState(content.featureName || content.name || '');
  const [category, setCategory] = useState(content.category || '');
  const [mechanicalOverview, setMechanicalOverview] = useState(content.mechanicalOverview || content.description || '');
  const [playerExperience, setPlayerExperience] = useState(content.playerExperience || '');
  const [mechanics, setMechanics] = useState<string[]>(content.mechanics || []);

  useEffect(() => {
    setFeatureName(content.featureName || content.name || '');
    setCategory(content.category || '');
    setMechanicalOverview(content.mechanicalOverview || content.description || '');
    setPlayerExperience(content.playerExperience || '');
    setMechanics(content.mechanics || []);
  }, [content]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(block.id, { featureName, category, mechanicalOverview, playerExperience, mechanics });
    }
    onEndEdit();
  };

  const addMechanic = () => setMechanics([...mechanics, '']);
  const updateMechanic = (index: number, value: string) => {
    const updated = [...mechanics];
    updated[index] = value;
    setMechanics(updated);
  };
  const removeMechanic = (index: number) => setMechanics(mechanics.filter((_, i) => i !== index));

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Feature Name</label>
            <input type="text" className={inputClass} value={featureName} onChange={(e) => setFeatureName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <input type="text" className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Bonus, Base Game" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Mechanical Overview</label>
          <textarea className={cn(inputClass, 'resize-none')} value={mechanicalOverview} onChange={(e) => setMechanicalOverview(e.target.value)} rows={3} />
        </div>
        <div>
          <label className={labelClass}>Player Experience</label>
          <textarea className={cn(inputClass, 'resize-none')} value={playerExperience} onChange={(e) => setPlayerExperience(e.target.value)} rows={2} />
        </div>
        <div>
          <label className={labelClass}>Mechanics</label>
          <div className="space-y-2">
            {mechanics.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" className={cn(inputClass, 'flex-1')} value={m} onChange={(e) => updateMechanic(i, e.target.value)} />
                <button onClick={() => removeMechanic(i)} className="p-2 text-red-400 hover:bg-red-500/10 rounded"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={addMechanic} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80">
              <Plus className="w-4 h-4" /> Add Mechanic
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onEndEdit} className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', editableWrapperClass)} onClick={onStartEdit}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {featureName || <span className="text-muted-foreground italic">Feature Name</span>}
        </h3>
        {category && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">{category}</span>
        )}
      </div>
      {mechanicalOverview && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Mechanical Overview</h4>
          <p className="text-sm text-foreground">{mechanicalOverview}</p>
        </div>
      )}
      {playerExperience && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Player Experience</h4>
          <p className="text-sm text-foreground">{playerExperience}</p>
        </div>
      )}
      {mechanics && mechanics.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Mechanics</h4>
          <ul className="list-disc list-inside text-sm text-foreground">
            {mechanics.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// Math Model Block
function MathModelBlock({ block, isEditing, onStartEdit, onEndEdit, onSave }: EditableBlockProps) {
  const content = block.content as {
    modelName?: string;
    formula?: string;
    description?: string;
    rtp?: number;
    volatility?: string;
    hitFrequency?: number;
    maxWinMultiplier?: number;
    variables?: Array<{ name: string; value: string }>;
  };

  const [modelName, setModelName] = useState(content.modelName || '');
  const [rtp, setRtp] = useState(content.rtp?.toString() || '');
  const [volatility, setVolatility] = useState(content.volatility || '');
  const [hitFrequency, setHitFrequency] = useState(content.hitFrequency?.toString() || '');
  const [maxWinMultiplier, setMaxWinMultiplier] = useState(content.maxWinMultiplier?.toString() || '');
  const [formula, setFormula] = useState(content.formula || '');
  const [description, setDescription] = useState(content.description || '');

  useEffect(() => {
    setModelName(content.modelName || '');
    setRtp(content.rtp?.toString() || '');
    setVolatility(content.volatility || '');
    setHitFrequency(content.hitFrequency?.toString() || '');
    setMaxWinMultiplier(content.maxWinMultiplier?.toString() || '');
    setFormula(content.formula || '');
    setDescription(content.description || '');
  }, [content]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(block.id, {
        modelName,
        rtp: rtp ? parseFloat(rtp) : undefined,
        volatility,
        hitFrequency: hitFrequency ? parseFloat(hitFrequency) : undefined,
        maxWinMultiplier: maxWinMultiplier ? parseFloat(maxWinMultiplier) : undefined,
        formula,
        description,
      });
    }
    onEndEdit();
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Model Name</label>
          <input type="text" className={inputClass} value={modelName} onChange={(e) => setModelName(e.target.value)} autoFocus />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className={labelClass}>RTP (%)</label>
            <input type="number" step="0.01" className={inputClass} value={rtp} onChange={(e) => setRtp(e.target.value)} placeholder="96.50" />
          </div>
          <div>
            <label className={labelClass}>Volatility</label>
            <select className={inputClass} value={volatility} onChange={(e) => setVolatility(e.target.value)}>
              <option value="">Select...</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="medium-high">Medium-High</option>
              <option value="high">High</option>
              <option value="very-high">Very High</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Hit Frequency</label>
            <input type="number" step="0.1" className={inputClass} value={hitFrequency} onChange={(e) => setHitFrequency(e.target.value)} placeholder="3.5" />
          </div>
          <div>
            <label className={labelClass}>Max Win (x)</label>
            <input type="number" className={inputClass} value={maxWinMultiplier} onChange={(e) => setMaxWinMultiplier(e.target.value)} placeholder="10000" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Formula</label>
          <input type="text" className={inputClass} value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="e.g., (Base RTP + Bonus RTP) * Multiplier" />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea className={cn(inputClass, 'resize-none')} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onEndEdit} className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', editableWrapperClass)} onClick={onStartEdit}>
      <h3 className="text-lg font-semibold text-foreground">
        {content.modelName || <span className="text-muted-foreground italic">Math Model</span>}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">RTP</div>
          <div className="text-xl font-bold text-primary">{content.rtp ? `${content.rtp}%` : '-'}</div>
        </div>
        <div className="bg-background rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Volatility</div>
          <div className="text-xl font-bold text-foreground capitalize">{content.volatility || '-'}</div>
        </div>
        <div className="bg-background rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Hit Frequency</div>
          <div className="text-xl font-bold text-foreground">{content.hitFrequency ? `1:${content.hitFrequency}` : '-'}</div>
        </div>
        <div className="bg-background rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Max Win</div>
          <div className="text-xl font-bold text-foreground">{content.maxWinMultiplier ? `${content.maxWinMultiplier}x` : '-'}</div>
        </div>
      </div>
      {content.formula && (
        <div className="bg-background rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Formula</div>
          <code className="text-sm text-primary">{content.formula}</code>
        </div>
      )}
      {content.description && <p className="text-sm text-muted-foreground">{content.description}</p>}
    </div>
  );
}

// Metric Table Block
function MetricTableBlock({ block, isEditing, onStartEdit, onEndEdit, onSave }: EditableBlockProps) {
  const content = block.content as {
    title?: string;
    headers?: string[];
    rows?: string[][];
  };

  const [title, setTitle] = useState(content.title || '');
  const [headers, setHeaders] = useState<string[]>(content.headers || ['Column 1', 'Column 2']);
  const [rows, setRows] = useState<string[][]>(content.rows || [['', '']]);

  useEffect(() => {
    setTitle(content.title || '');
    setHeaders(content.headers || ['Column 1', 'Column 2']);
    setRows(content.rows || [['', '']]);
  }, [content]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(block.id, { title, headers, rows });
    }
    onEndEdit();
  };

  const addColumn = () => {
    setHeaders([...headers, `Column ${headers.length + 1}`]);
    setRows(rows.map((row) => [...row, '']));
  };

  const removeColumn = (colIndex: number) => {
    if (headers.length <= 1) return;
    setHeaders(headers.filter((_, i) => i !== colIndex));
    setRows(rows.map((row) => row.filter((_, i) => i !== colIndex)));
  };

  const addRow = () => setRows([...rows, Array(headers.length).fill('')]);
  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== rowIndex));
  };

  const updateHeader = (index: number, value: string) => {
    const updated = [...headers];
    updated[index] = value;
    setHeaders(updated);
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const updated = rows.map((row, ri) =>
      ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? value : cell)) : row
    );
    setRows(updated);
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Table Title</label>
          <input type="text" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border">
            <thead>
              <tr className="bg-muted">
                {headers.map((header, i) => (
                  <th key={i} className="p-2 border border-border">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        className="flex-1 bg-transparent border-none focus:outline-none text-center font-medium"
                        value={header}
                        onChange={(e) => updateHeader(i, e.target.value)}
                      />
                      {headers.length > 1 && (
                        <button onClick={() => removeColumn(i)} className="text-red-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-2 border border-border w-8">
                  <button onClick={addColumn} className="text-primary hover:text-primary/80">
                    <Plus className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="p-1 border border-border">
                      <input
                        type="text"
                        className="w-full bg-transparent border-none focus:outline-none px-2 py-1"
                        value={cell}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="p-1 border border-border">
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(ri)} className="text-red-400 hover:text-red-500 p-1">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addRow} className="mt-2 flex items-center gap-1 text-sm text-primary hover:text-primary/80">
            <Plus className="w-4 h-4" /> Add Row
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onEndEdit} className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', editableWrapperClass)} onClick={onStartEdit}>
      {content.title && <h3 className="text-lg font-semibold text-foreground">{content.title}</h3>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {(content.headers || []).map((header, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(content.rows || []).map((row, i) => (
              <tr key={i} className="border-b border-border/50">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-foreground">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(!content.headers || content.headers.length === 0) && (
        <p className="text-muted-foreground italic text-sm">Click to add table data...</p>
      )}
    </div>
  );
}

// Callout Block
function CalloutBlock({ block, isEditing, onStartEdit, onEndEdit, onSave }: EditableBlockProps) {
  const content = block.content as {
    type?: 'info' | 'warning' | 'success' | 'error';
    title?: string;
    text?: string;
  };

  const [type, setType] = useState<'info' | 'warning' | 'success' | 'error'>(content.type || 'info');
  const [title, setTitle] = useState(content.title || '');
  const [text, setText] = useState(content.text || '');

  useEffect(() => {
    setType(content.type || 'info');
    setTitle(content.title || '');
    setText(content.text || '');
  }, [content]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(block.id, { type, title, text });
    }
    onEndEdit();
  };

  const typeStyles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
  };

  const typeIcons = {
    info: Info,
    warning: AlertTriangle,
    success: CheckCircle,
    error: XCircle,
  };

  const Icon = typeIcons[type];

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type</label>
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Title (optional)</label>
            <input type="text" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Content</label>
          <textarea className={cn(inputClass, 'resize-none')} value={text} onChange={(e) => setText(e.target.value)} rows={3} autoFocus />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onEndEdit} className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border p-4', typeStyles[type], editableWrapperClass)} onClick={onStartEdit}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          {title && <h4 className="font-medium mb-1">{title}</h4>}
          <p className="text-sm opacity-90">{text || <span className="opacity-50 italic">Click to add callout content...</span>}</p>
        </div>
      </div>
    </div>
  );
}

// Image Block
function ImageBlock({ block, isEditing, onStartEdit, onEndEdit, onSave }: EditableBlockProps) {
  const content = block.content as { src?: string; alt?: string; caption?: string };

  const [src, setSrc] = useState(content.src || '');
  const [alt, setAlt] = useState(content.alt || '');
  const [caption, setCaption] = useState(content.caption || '');

  useEffect(() => {
    setSrc(content.src || '');
    setAlt(content.alt || '');
    setCaption(content.caption || '');
  }, [content]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(block.id, { src, alt, caption });
    }
    onEndEdit();
  };

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <label className={labelClass}>Image URL</label>
          <input type="url" className={inputClass} value={src} onChange={(e) => setSrc(e.target.value)} placeholder="https://..." autoFocus />
        </div>
        <div>
          <label className={labelClass}>Alt Text</label>
          <input type="text" className={inputClass} value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image..." />
        </div>
        <div>
          <label className={labelClass}>Caption (optional)</label>
          <input type="text" className={inputClass} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        {src && (
          <div className="rounded-lg overflow-hidden border border-border">
            <img src={src} alt={alt} className="max-h-64 w-full object-contain bg-muted" />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onEndEdit} className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">Save</button>
        </div>
      </div>
    );
  }

  if (!src) {
    return (
      <div className={cn('flex items-center justify-center h-32 bg-muted rounded-lg border border-dashed border-border', editableWrapperClass)} onClick={onStartEdit}>
        <span className="text-muted-foreground italic">Click to add image...</span>
      </div>
    );
  }

  return (
    <figure className={cn('space-y-2', editableWrapperClass)} onClick={onStartEdit}>
      <div className="rounded-lg overflow-hidden border border-border">
        <img src={src} alt={alt} className="w-full object-contain" />
      </div>
      {caption && <figcaption className="text-sm text-muted-foreground text-center">{caption}</figcaption>}
    </figure>
  );
}

// Archetype Profile Block
function ArchetypeProfileBlock({ block, isEditing, onStartEdit, onEndEdit, onSave }: EditableBlockProps) {
  const content = block.content as {
    name?: string;
    traits?: string[];
    preferences?: string[];
    description?: string;
  };

  const [name, setName] = useState(content.name || '');
  const [traits, setTraits] = useState<string[]>(content.traits || []);
  const [preferences, setPreferences] = useState<string[]>(content.preferences || []);
  const [description, setDescription] = useState(content.description || '');

  useEffect(() => {
    setName(content.name || '');
    setTraits(content.traits || []);
    setPreferences(content.preferences || []);
    setDescription(content.description || '');
  }, [content]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(block.id, { name, traits, preferences, description });
    }
    onEndEdit();
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Archetype Name</label>
          <input type="text" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea className={cn(inputClass, 'resize-none')} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div>
          <label className={labelClass}>Traits</label>
          <div className="space-y-2">
            {traits.map((t, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" className={cn(inputClass, 'flex-1')} value={t} onChange={(e) => { const u = [...traits]; u[i] = e.target.value; setTraits(u); }} />
                <button onClick={() => setTraits(traits.filter((_, idx) => idx !== i))} className="p-2 text-red-400 hover:bg-red-500/10 rounded"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={() => setTraits([...traits, ''])} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80">
              <Plus className="w-4 h-4" /> Add Trait
            </button>
          </div>
        </div>
        <div>
          <label className={labelClass}>Preferences</label>
          <div className="space-y-2">
            {preferences.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" className={cn(inputClass, 'flex-1')} value={p} onChange={(e) => { const u = [...preferences]; u[i] = e.target.value; setPreferences(u); }} />
                <button onClick={() => setPreferences(preferences.filter((_, idx) => idx !== i))} className="p-2 text-red-400 hover:bg-red-500/10 rounded"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={() => setPreferences([...preferences, ''])} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80">
              <Plus className="w-4 h-4" /> Add Preference
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onEndEdit} className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', editableWrapperClass)} onClick={onStartEdit}>
      <h3 className="text-lg font-semibold text-foreground">{name || <span className="text-muted-foreground italic">Archetype Name</span>}</h3>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {traits.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Traits</h4>
          <div className="flex flex-wrap gap-2">
            {traits.map((t, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">{t}</span>
            ))}
          </div>
        </div>
      )}
      {preferences.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-1">Preferences</h4>
          <div className="flex flex-wrap gap-2">
            {preferences.map((p, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400">{p}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Chart Block
function ChartBlock({ block, isEditing, onStartEdit, onEndEdit, onSave }: EditableBlockProps) {
  const content = block.content as {
    chartType?: string;
    title?: string;
    data?: Array<{ label: string; value: number }>;
  };

  const [chartType, setChartType] = useState(content.chartType || 'bar');
  const [title, setTitle] = useState(content.title || '');
  const [data, setData] = useState<Array<{ label: string; value: number }>>(content.data || []);

  useEffect(() => {
    setChartType(content.chartType || 'bar');
    setTitle(content.title || '');
    setData(content.data || []);
  }, [content]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(block.id, { chartType, title, data });
    }
    onEndEdit();
  };

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Chart Title</label>
            <input type="text" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <label className={labelClass}>Chart Type</label>
            <select className={inputClass} value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <option value="bar">Bar Chart</option>
              <option value="horizontal-bar">Horizontal Bar</option>
              <option value="pie">Pie Chart</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Data Points</label>
          <div className="space-y-2">
            {data.map((d, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" className={cn(inputClass, 'flex-1')} placeholder="Label" value={d.label} onChange={(e) => { const u = [...data]; u[i] = { ...u[i], label: e.target.value }; setData(u); }} />
                <input type="number" className={cn(inputClass, 'w-24')} placeholder="Value" value={d.value} onChange={(e) => { const u = [...data]; u[i] = { ...u[i], value: parseFloat(e.target.value) || 0 }; setData(u); }} />
                <button onClick={() => setData(data.filter((_, idx) => idx !== i))} className="p-2 text-red-400 hover:bg-red-500/10 rounded"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button onClick={() => setData([...data, { label: '', value: 0 }])} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80">
              <Plus className="w-4 h-4" /> Add Data Point
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onEndEdit} className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', editableWrapperClass)} onClick={onStartEdit}>
      {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
      {data.length > 0 ? (
        <div className="space-y-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-24 truncate">{d.label}</span>
              <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(d.value / maxValue) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-foreground w-16 text-right">{d.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground italic text-sm">Click to add chart data...</p>
      )}
    </div>
  );
}

// Competitor Analysis Block
function CompetitorAnalysisBlock({ block, isEditing, onStartEdit, onEndEdit, onSave }: EditableBlockProps) {
  const content = block.content as {
    competitor?: string;
    strengths?: string[];
    weaknesses?: string[];
    notes?: string;
  };

  const [competitor, setCompetitor] = useState(content.competitor || '');
  const [strengths, setStrengths] = useState<string[]>(content.strengths || []);
  const [weaknesses, setWeaknesses] = useState<string[]>(content.weaknesses || []);
  const [notes, setNotes] = useState(content.notes || '');

  useEffect(() => {
    setCompetitor(content.competitor || '');
    setStrengths(content.strengths || []);
    setWeaknesses(content.weaknesses || []);
    setNotes(content.notes || '');
  }, [content]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(block.id, { competitor, strengths, weaknesses, notes });
    }
    onEndEdit();
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Competitor Name</label>
          <input type="text" className={inputClass} value={competitor} onChange={(e) => setCompetitor(e.target.value)} autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Strengths</label>
            <div className="space-y-2">
              {strengths.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" className={cn(inputClass, 'flex-1')} value={s} onChange={(e) => { const u = [...strengths]; u[i] = e.target.value; setStrengths(u); }} />
                  <button onClick={() => setStrengths(strengths.filter((_, idx) => idx !== i))} className="p-2 text-red-400 hover:bg-red-500/10 rounded"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={() => setStrengths([...strengths, ''])} className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300">
                <Plus className="w-4 h-4" /> Add Strength
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Weaknesses</label>
            <div className="space-y-2">
              {weaknesses.map((w, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" className={cn(inputClass, 'flex-1')} value={w} onChange={(e) => { const u = [...weaknesses]; u[i] = e.target.value; setWeaknesses(u); }} />
                  <button onClick={() => setWeaknesses(weaknesses.filter((_, idx) => idx !== i))} className="p-2 text-red-400 hover:bg-red-500/10 rounded"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={() => setWeaknesses([...weaknesses, ''])} className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300">
                <Plus className="w-4 h-4" /> Add Weakness
              </button>
            </div>
          </div>
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea className={cn(inputClass, 'resize-none')} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onEndEdit} className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', editableWrapperClass)} onClick={onStartEdit}>
      <h3 className="text-lg font-semibold text-foreground">{competitor || <span className="text-muted-foreground italic">Competitor Name</span>}</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-green-400 mb-2">Strengths</h4>
          {strengths.length > 0 ? (
            <ul className="space-y-1">
              {strengths.map((s, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">No strengths added</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium text-red-400 mb-2">Weaknesses</h4>
          {weaknesses.length > 0 ? (
            <ul className="space-y-1">
              {weaknesses.map((w, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">No weaknesses added</p>
          )}
        </div>
      </div>
      {notes && <p className="text-sm text-muted-foreground border-t border-border pt-3">{notes}</p>}
    </div>
  );
}

// A/B Test Result Block
function ABTestResultBlock({ block, isEditing, onStartEdit, onEndEdit, onSave }: EditableBlockProps) {
  const content = block.content as {
    testName?: string;
    hypothesis?: string;
    variants?: Array<{ name: string; conversion: number; sampleSize: number }>;
    results?: { winner?: string; confidence?: number; summary?: string };
  };

  const [testName, setTestName] = useState(content.testName || '');
  const [hypothesis, setHypothesis] = useState(content.hypothesis || '');
  const [variants, setVariants] = useState<Array<{ name: string; conversion: number; sampleSize: number }>>(
    content.variants || [{ name: 'Control', conversion: 0, sampleSize: 0 }, { name: 'Variant A', conversion: 0, sampleSize: 0 }]
  );
  const [winner, setWinner] = useState(content.results?.winner || '');
  const [confidence, setConfidence] = useState(content.results?.confidence?.toString() || '');
  const [summary, setSummary] = useState(content.results?.summary || '');

  useEffect(() => {
    setTestName(content.testName || '');
    setHypothesis(content.hypothesis || '');
    setVariants(content.variants || [{ name: 'Control', conversion: 0, sampleSize: 0 }, { name: 'Variant A', conversion: 0, sampleSize: 0 }]);
    setWinner(content.results?.winner || '');
    setConfidence(content.results?.confidence?.toString() || '');
    setSummary(content.results?.summary || '');
  }, [content]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(block.id, {
        testName,
        hypothesis,
        variants,
        results: {
          winner,
          confidence: confidence ? parseFloat(confidence) : undefined,
          summary,
        },
      });
    }
    onEndEdit();
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Test Name</label>
          <input type="text" className={inputClass} value={testName} onChange={(e) => setTestName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className={labelClass}>Hypothesis</label>
          <textarea className={cn(inputClass, 'resize-none')} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} rows={2} />
        </div>
        <div>
          <label className={labelClass}>Variants</label>
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="text" className={cn(inputClass, 'flex-1')} placeholder="Variant name" value={v.name} onChange={(e) => { const u = [...variants]; u[i] = { ...u[i], name: e.target.value }; setVariants(u); }} />
                <input type="number" step="0.01" className={cn(inputClass, 'w-24')} placeholder="Conv %" value={v.conversion} onChange={(e) => { const u = [...variants]; u[i] = { ...u[i], conversion: parseFloat(e.target.value) || 0 }; setVariants(u); }} />
                <input type="number" className={cn(inputClass, 'w-28')} placeholder="Sample" value={v.sampleSize} onChange={(e) => { const u = [...variants]; u[i] = { ...u[i], sampleSize: parseInt(e.target.value) || 0 }; setVariants(u); }} />
                {variants.length > 2 && (
                  <button onClick={() => setVariants(variants.filter((_, idx) => idx !== i))} className="p-2 text-red-400 hover:bg-red-500/10 rounded"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
            <button onClick={() => setVariants([...variants, { name: `Variant ${String.fromCharCode(65 + variants.length - 1)}`, conversion: 0, sampleSize: 0 }])} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80">
              <Plus className="w-4 h-4" /> Add Variant
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Winner</label>
            <select className={inputClass} value={winner} onChange={(e) => setWinner(e.target.value)}>
              <option value="">Select...</option>
              {variants.map((v, i) => (
                <option key={i} value={v.name}>{v.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Confidence (%)</label>
            <input type="number" step="0.1" className={inputClass} value={confidence} onChange={(e) => setConfidence(e.target.value)} placeholder="95" />
          </div>
        </div>
        <div>
          <label className={labelClass}>Summary</label>
          <textarea className={cn(inputClass, 'resize-none')} value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onEndEdit} className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', editableWrapperClass)} onClick={onStartEdit}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{testName || <span className="text-muted-foreground italic">A/B Test Name</span>}</h3>
        {winner && (
          <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Winner: {winner}</span>
        )}
      </div>
      {hypothesis && <p className="text-sm text-muted-foreground italic">&quot;{hypothesis}&quot;</p>}
      {variants.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {variants.map((v, i) => (
            <div key={i} className={cn('bg-background rounded-lg p-3 border', v.name === winner ? 'border-green-500' : 'border-border')}>
              <div className="text-xs text-muted-foreground mb-1">{v.name}</div>
              <div className="text-xl font-bold text-foreground">{v.conversion}%</div>
              <div className="text-xs text-muted-foreground">n={v.sampleSize.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
      {confidence && (
        <div className="text-sm text-muted-foreground">
          Statistical confidence: <span className="text-foreground font-medium">{confidence}%</span>
        </div>
      )}
      {summary && <p className="text-sm text-foreground border-t border-border pt-3">{summary}</p>}
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
