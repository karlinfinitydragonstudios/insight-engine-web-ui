import { useState, useEffect, useRef, useCallback } from 'react';
import { Info, AlertTriangle, CheckCircle, XCircle, Plus, X, Upload, Link, Image, Film, Play, Pause, Volume2, VolumeX, Maximize, BarChart3, Database, PenLine, ChevronLeft, ChevronRight, ChevronDown, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { Block } from '../../types';
import { cn } from '../../lib/utils';
import { ChartRenderer } from '../charts/ChartRenderer';
import type { ChartBlockContent, ChartDataMode, ManualChartType, SlotChartType, ManualChartDataPoint, ChartJsData } from '../../types/slotChart';
import { SLOT_CHART_TYPES } from '../../types/slotChart';
import { useSlotGraphData } from '../../hooks/useSlotGraphData';

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
    case 'media':
      return (
        <MediaBlock
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

// Media Block (Images and Videos)
type MediaType = 'image' | 'video' | 'youtube' | 'vimeo';

interface MediaContent {
  src?: string;
  alt?: string;
  caption?: string;
  mediaType?: MediaType;
  thumbnailUrl?: string;
}

function getMediaType(url: string): MediaType {
  if (!url) return 'image';

  // Check for YouTube
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }

  // Check for Vimeo
  if (url.includes('vimeo.com')) {
    return 'vimeo';
  }

  // Check for video file extensions
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  const lowerUrl = url.toLowerCase();
  if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
    return 'video';
  }

  return 'image';
}

function getYouTubeEmbedUrl(url: string): string {
  // Handle various YouTube URL formats
  let videoId = '';

  if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split(/[?&#]/)[0] || '';
  } else if (url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    videoId = urlParams.get('v') || '';
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('youtube.com/embed/')[1]?.split(/[?&#]/)[0] || '';
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

function getVimeoEmbedUrl(url: string): string {
  // Handle Vimeo URL formats
  const vimeoIdMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  const videoId = vimeoIdMatch ? vimeoIdMatch[1] : '';
  return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
}

function MediaBlock({ block, isEditing, onStartEdit, onEndEdit, onSave }: EditableBlockProps) {
  const content = block.content as MediaContent;

  const [src, setSrc] = useState(content.src || '');
  const [alt, setAlt] = useState(content.alt || '');
  const [caption, setCaption] = useState(content.caption || '');
  const [mediaType, setMediaType] = useState<MediaType>(content.mediaType || getMediaType(content.src || ''));
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [inputMode, setInputMode] = useState<'url' | 'upload'>('url');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSrc(content.src || '');
    setAlt(content.alt || '');
    setCaption(content.caption || '');
    setMediaType(content.mediaType || getMediaType(content.src || ''));
  }, [content]);

  // Auto-detect media type when URL changes
  useEffect(() => {
    if (src && inputMode === 'url') {
      setMediaType(getMediaType(src));
    }
  }, [src, inputMode]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(block.id, { src, alt, caption, mediaType });
    }
    onEndEdit();
  };

  const handleFileSelect = useCallback((file: File) => {
    if (!file) return;

    // Determine media type from file
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      alert('Please select an image or video file');
      return;
    }

    // Create a data URL for preview (in production, upload to server)
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSrc(result);
      setMediaType(isVideo ? 'video' : 'image');
      setAlt(file.name.replace(/\.[^/.]+$/, '')); // Use filename without extension as default alt
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const openFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Render media preview based on type
  const renderMediaPreview = (previewMode = false) => {
    if (!src) return null;

    const containerClass = previewMode ? 'max-h-64' : '';

    switch (mediaType) {
      case 'youtube':
        return (
          <div className={cn('relative aspect-video w-full', containerClass)}>
            <iframe
              src={getYouTubeEmbedUrl(src)}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );

      case 'vimeo':
        return (
          <div className={cn('relative aspect-video w-full', containerClass)}>
            <iframe
              src={getVimeoEmbedUrl(src)}
              className="w-full h-full rounded-lg"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        );

      case 'video':
        return (
          <div className={cn('relative group', containerClass)}>
            <video
              ref={videoRef}
              src={src}
              className="w-full rounded-lg bg-muted"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            {!isEditing && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className="p-3 bg-white/90 rounded-full hover:bg-white transition-colors"
                  >
                    {isPlaying ? <Pause className="w-6 h-6 text-gray-900" /> : <Play className="w-6 h-6 text-gray-900" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                    className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-gray-900" /> : <Volume2 className="w-4 h-4 text-gray-900" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openFullscreen(); }}
                    className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  >
                    <Maximize className="w-4 h-4 text-gray-900" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'image':
      default:
        return (
          <img
            src={src}
            alt={alt}
            className={cn('w-full object-contain rounded-lg bg-muted', containerClass)}
          />
        );
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Input Mode Toggle */}
        <div className="flex gap-2 border-b border-border pb-3">
          <button
            onClick={() => setInputMode('url')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              inputMode === 'url'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <Link className="w-4 h-4" />
            URL
          </button>
          <button
            onClick={() => setInputMode('upload')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              inputMode === 'upload'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>

        {inputMode === 'url' ? (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Media URL (Image, Video, YouTube, or Vimeo)</label>
              <input
                type="url"
                className={inputClass}
                value={src}
                onChange={(e) => setSrc(e.target.value)}
                placeholder="https://... or paste YouTube/Vimeo link"
                autoFocus
              />
              {src && (
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {mediaType === 'image' && <Image className="w-3 h-3" />}
                  {mediaType === 'video' && <Film className="w-3 h-3" />}
                  {mediaType === 'youtube' && <Film className="w-3 h-3 text-red-500" />}
                  {mediaType === 'vimeo' && <Film className="w-3 h-3 text-blue-500" />}
                  <span className="capitalize">{mediaType}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-2">
              <Upload className={cn('w-8 h-8', isDragging ? 'text-primary' : 'text-muted-foreground')} />
              <div className="text-sm text-muted-foreground">
                {isDragging ? (
                  <span className="text-primary font-medium">Drop file here</span>
                ) : (
                  <>
                    <span className="font-medium text-foreground">Click to upload</span> or drag and drop
                  </>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Images (PNG, JPG, GIF, WebP) or Videos (MP4, WebM, MOV)
              </div>
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>Alt Text / Description</label>
          <input
            type="text"
            className={inputClass}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Describe the media..."
          />
        </div>

        <div>
          <label className={labelClass}>Caption (optional)</label>
          <input
            type="text"
            className={inputClass}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        {/* Preview */}
        {src && (
          <div className="relative rounded-lg overflow-hidden border border-border">
            {renderMediaPreview(true)}
            <button
              onClick={() => {
                setSrc('');
                setAlt('');
                setMediaType('image');
              }}
              className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-500 text-white rounded-full transition-colors"
              title="Remove media"
            >
              <X className="w-4 h-4" />
            </button>
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
      <div
        className={cn(
          'flex flex-col items-center justify-center h-32 bg-muted rounded-lg border border-dashed border-border gap-2',
          editableWrapperClass
        )}
        onClick={onStartEdit}
      >
        <div className="flex items-center gap-3 text-muted-foreground">
          <Image className="w-5 h-5" />
          <Film className="w-5 h-5" />
        </div>
        <span className="text-muted-foreground italic text-sm">Click to add image or video...</span>
      </div>
    );
  }

  return (
    <figure className={cn('space-y-2', editableWrapperClass)} onClick={onStartEdit}>
      <div className="rounded-lg overflow-hidden border border-border">
        {renderMediaPreview()}
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

// Chart Block - Enhanced with Chart.js and API/Manual modes
function ChartBlock({ block, isEditing, onStartEdit, onEndEdit, onSave }: EditableBlockProps) {
  // Parse content with backward compatibility
  const rawContent = block.content as Record<string, unknown>;
  const isLegacyFormat = rawContent.data && Array.isArray(rawContent.data) && !rawContent.dataMode;

  // Convert legacy format to new format
  const content: ChartBlockContent = isLegacyFormat
    ? {
        dataMode: 'manual',
        title: rawContent.title as string | undefined,
        manual: {
          chartType: (rawContent.chartType as ManualChartType) || 'bar',
          data: rawContent.data as ManualChartDataPoint[],
        },
      }
    : (rawContent as unknown as ChartBlockContent);

  // State - Default to 'api' mode for new chart blocks
  const [dataMode, setDataMode] = useState<ChartDataMode>(content.dataMode || 'api');
  const [title, setTitle] = useState(content.title || '');

  // Manual mode state
  const [manualChartType, setManualChartType] = useState<ManualChartType>(content.manual?.chartType || 'bar');
  const [manualData, setManualData] = useState<ManualChartDataPoint[]>(content.manual?.data || []);

  // API mode state
  const [slotChartType, setSlotChartType] = useState<SlotChartType>(content.slotGraph?.chartType || 'balance');
  const [gameId, setGameId] = useState(content.slotGraph?.gameId || '');
  const [gameName, setGameName] = useState(content.slotGraph?.gameName || '');
  const [apiChartData, setApiChartData] = useState<ChartJsData | null>(content.cachedData?.chartJsData || null);

  // Pagination state for API mode
  const [currentPage, setCurrentPage] = useState(0);

  // Track which datasets are visible for win bucket charts (by label)
  // null means use server defaults, Set means custom visibility
  const [visibleDatasets, setVisibleDatasets] = useState<Set<string> | null>(null);

  // Dropdown state for hidden datasets
  const [showHiddenDropdown, setShowHiddenDropdown] = useState(false);

  // Use the slot graph hook for API data
  const {
    games,
    chartData: fetchedChartData,
    isLoadingGames,
    isLoadingChart,
    chartError,
    metadata,
    fetchChartData,
  } = useSlotGraphData();

  // Chart types that support pagination (per-spin data)
  const paginatedChartTypes: SlotChartType[] = ['win', 'balance', 'win_detail'];
  const supportsPagination = paginatedChartTypes.includes(slotChartType);

  // Generate the current request key for what we WANT to display
  const currentRequestKey = gameId ? `${gameId}-${slotChartType}-${supportsPagination ? currentPage : 0}` : null;

  // Generate a key for what the hook's data represents (from metadata)
  const hookDataKey = metadata ? `${metadata.gameId}-${metadata.chartType}-${metadata.currentPage}` : null;

  // Track what request key the current apiChartData corresponds to
  const [apiDataKey, setApiDataKey] = useState<string | null>(null);

  // Track what we last fetched to avoid duplicate fetches
  const lastFetchedKeyRef = useRef<string | null>(null);

  // Sync fetched chart data to local state when hook data matches what we want
  // AND differs from what we currently have displayed
  useEffect(() => {
    const shouldSync = fetchedChartData && metadata && hookDataKey === currentRequestKey && apiDataKey !== hookDataKey;
    if (shouldSync) {
      setApiChartData(fetchedChartData);
      setApiDataKey(hookDataKey);
    }
  }, [fetchedChartData, metadata, hookDataKey, currentRequestKey, apiDataKey]);

  // Show loading if we're in API mode with a game selected and:
  // The data we have doesn't match what we want
  const isWaitingForData = dataMode === 'api' && gameId && (
    apiDataKey !== currentRequestKey || isLoadingChart
  );

  // Auto-fetch chart data when the request key changes
  useEffect(() => {
    if (dataMode === 'api' && gameId && slotChartType && currentRequestKey) {
      // Only fetch if we haven't already fetched this key
      if (currentRequestKey !== lastFetchedKeyRef.current) {
        lastFetchedKeyRef.current = currentRequestKey;
        const page = supportsPagination ? currentPage : 0;
        fetchChartData(gameId, slotChartType, 500, page);
      }
    }
  }, [dataMode, gameId, slotChartType, currentPage, currentRequestKey, supportsPagination, fetchChartData]);

  // Reset page to 0 when game or chart type changes
  const prevGameIdRef = useRef(gameId);
  const prevChartTypeRef = useRef(slotChartType);

  useEffect(() => {
    if (prevGameIdRef.current !== gameId || prevChartTypeRef.current !== slotChartType) {
      prevGameIdRef.current = gameId;
      prevChartTypeRef.current = slotChartType;
      if (currentPage !== 0) {
        setCurrentPage(0);
      }
    }
  }, [gameId, slotChartType, currentPage]);

  // Sync state from content prop - same flow for initial load and after save
  useEffect(() => {
    const newContent: ChartBlockContent = isLegacyFormat
      ? {
          dataMode: 'manual',
          title: rawContent.title as string | undefined,
          manual: {
            chartType: (rawContent.chartType as ManualChartType) || 'bar',
            data: rawContent.data as ManualChartDataPoint[],
          },
        }
      : (rawContent as unknown as ChartBlockContent);

    setDataMode(newContent.dataMode || 'api');
    setTitle(newContent.title || '');
    setManualChartType(newContent.manual?.chartType || 'bar');
    setManualData(newContent.manual?.data || []);
    setSlotChartType(newContent.slotGraph?.chartType || 'balance');
    setGameId(newContent.slotGraph?.gameId || '');
    setGameName(newContent.slotGraph?.gameName || '');
    // Reset chart data and key - will be fetched fresh by the fetch effect
    setApiChartData(null);
    setApiDataKey(null);
    // Reset the last fetched key so fetch effect triggers
    lastFetchedKeyRef.current = null;
  }, [rawContent, isLegacyFormat]);

  const handleSave = async () => {
    // Only save configuration, NOT the chart data (it will be fetched fresh on load)
    const newContent: ChartBlockContent = {
      dataMode,
      title: title || undefined,
    };

    if (dataMode === 'manual') {
      newContent.manual = {
        chartType: manualChartType,
        data: manualData,
      };
    } else {
      // For API mode, only save the configuration (gameId, chartType, gameName)
      // The actual chart data will be fetched when the block loads
      newContent.slotGraph = {
        chartType: slotChartType,
        gameId,
        gameName,
      };
    }

    if (onSave) {
      await onSave(block.id, newContent as unknown as Record<string, unknown>);
    }
    onEndEdit();
  };

  // Convert manual data to Chart.js format
  const manualChartJsData: ChartJsData = {
    labels: manualData.map((d) => d.label),
    datasets: [
      {
        label: title || 'Data',
        data: manualData.map((d) => d.value),
        backgroundColor: manualData.map((d) => d.color || undefined).filter(Boolean) as string[],
      },
    ],
  };

  // Determine which chart data and type to use
  const displayChartType = dataMode === 'api' ? slotChartType : manualChartType;
  const displayChartData = dataMode === 'api' ? apiChartData : manualChartJsData;
  const hasData = dataMode === 'api' ? !!apiChartData : manualData.length > 0;

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setDataMode('api')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              dataMode === 'api'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Database className="w-4 h-4" />
            Slot Graph API
          </button>
          <button
            onClick={() => setDataMode('manual')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              dataMode === 'manual'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <PenLine className="w-4 h-4" />
            Manual Entry
          </button>
        </div>

        {/* Title Input */}
        <div>
          <label className={labelClass}>Chart Title</label>
          <input
            type="text"
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter chart title..."
          />
        </div>

        {/* API Mode Editor */}
        {dataMode === 'api' && (
          <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="w-4 h-4" />
              <span>Connect to slot graph data API</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Chart Type</label>
                <select
                  className={inputClass}
                  value={slotChartType}
                  onChange={(e) => setSlotChartType(e.target.value as SlotChartType)}
                >
                  {SLOT_CHART_TYPES.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Game</label>
                <select
                  className={inputClass}
                  value={gameId}
                  onChange={(e) => {
                    const selectedGame = games.find(g => g.id === e.target.value);
                    setGameId(e.target.value);
                    setGameName(selectedGame?.name || e.target.value);
                  }}
                  disabled={isLoadingGames}
                >
                  <option value="">
                    {isLoadingGames ? 'Loading games...' : 'Select a game...'}
                  </option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected chart type description */}
            {slotChartType && (
              <p className="text-xs text-muted-foreground">
                {SLOT_CHART_TYPES.find((ct) => ct.id === slotChartType)?.description}
              </p>
            )}

            {/* Loading State */}
            {isLoadingChart && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}

            {/* Error State */}
            {chartError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                {chartError}
              </div>
            )}

            {/* API Chart Preview */}
            {apiChartData && !isLoadingChart && (
              <div className="mt-4">
                <ChartRenderer
                  data={apiChartData}
                  chartType={slotChartType}
                  title={title}
                  height={250}
                  visibleDatasets={visibleDatasets}
                />

                {/* Dataset visibility controls for win bucket charts in edit mode */}
                {(slotChartType === 'win_bucket_rtp' || slotChartType === 'win_bucket_probability') && (
                  <div className="mt-3 space-y-2">
                    {(() => {
                      const allDatasets = apiChartData.datasets;
                      const effectiveVisible = visibleDatasets ?? new Set(
                        allDatasets.filter(d => !d.hidden).map(d => d.label)
                      );
                      const visibleList = allDatasets.filter(d => effectiveVisible.has(d.label));
                      const hiddenList = allDatasets.filter(d => !effectiveVisible.has(d.label));

                      return (
                        <>
                          {/* Visible datasets as clickable pills */}
                          <div className="flex flex-wrap gap-1.5">
                            {visibleList.map((ds) => (
                              <button
                                key={ds.label}
                                type="button"
                                onClick={() => {
                                  if (visibleList.length <= 1) return;
                                  const newSet = new Set(effectiveVisible);
                                  newSet.delete(ds.label);
                                  setVisibleDatasets(newSet);
                                }}
                                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                                title="Click to hide"
                              >
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: typeof ds.borderColor === 'string' ? ds.borderColor : ds.borderColor?.[0] || '#3b82f6' }}
                                />
                                {ds.label}
                                <EyeOff className="w-3 h-3 opacity-50" />
                              </button>
                            ))}
                          </div>

                          {/* Hidden datasets dropdown */}
                          {hiddenList.length > 0 && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowHiddenDropdown(!showHiddenDropdown)}
                                className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                              >
                                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showHiddenDropdown && 'rotate-180')} />
                                {hiddenList.length} hidden dataset{hiddenList.length > 1 ? 's' : ''}
                              </button>

                              {showHiddenDropdown && (
                                <div className="absolute z-10 mt-1 p-1.5 bg-popover border border-border rounded-lg shadow-lg min-w-[150px]">
                                  {hiddenList.map((ds) => (
                                    <button
                                      key={ds.label}
                                      type="button"
                                      onClick={() => {
                                        const newSet = new Set(effectiveVisible);
                                        newSet.add(ds.label);
                                        setVisibleDatasets(newSet);
                                        setShowHiddenDropdown(false);
                                      }}
                                      className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted transition-colors"
                                    >
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: typeof ds.borderColor === 'string' ? ds.borderColor : ds.borderColor?.[0] || '#3b82f6' }}
                                      />
                                      <span className="flex-1">{ds.label}</span>
                                      <Eye className="w-3 h-3 text-muted-foreground" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Pagination controls in edit mode */}
                {supportsPagination && metadata && metadata.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-2 py-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0 || isLoadingChart}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors',
                        currentPage === 0 || isLoadingChart
                          ? 'text-muted-foreground/50 cursor-not-allowed'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev
                    </button>

                    <span className="text-sm text-muted-foreground">
                      Page {currentPage + 1} of {metadata.totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCurrentPage(Math.min(metadata.totalPages - 1, currentPage + 1))}
                      disabled={currentPage >= metadata.totalPages - 1 || isLoadingChart}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1 text-sm rounded transition-colors',
                        currentPage >= metadata.totalPages - 1 || isLoadingChart
                          ? 'text-muted-foreground/50 cursor-not-allowed'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manual Mode Editor */}
        {dataMode === 'manual' && (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Chart Type</label>
              <select
                className={inputClass}
                value={manualChartType}
                onChange={(e) => setManualChartType(e.target.value as ManualChartType)}
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="doughnut">Doughnut Chart</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Data Points</label>
              <div className="space-y-2">
                {manualData.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      className={cn(inputClass, 'flex-1')}
                      placeholder="Label"
                      value={d.label}
                      onChange={(e) => {
                        const u = [...manualData];
                        u[i] = { ...u[i], label: e.target.value };
                        setManualData(u);
                      }}
                    />
                    <input
                      type="number"
                      className={cn(inputClass, 'w-24')}
                      placeholder="Value"
                      value={d.value}
                      onChange={(e) => {
                        const u = [...manualData];
                        u[i] = { ...u[i], value: parseFloat(e.target.value) || 0 };
                        setManualData(u);
                      }}
                    />
                    <input
                      type="color"
                      className="w-10 h-10 rounded cursor-pointer bg-transparent"
                      value={d.color || '#3b82f6'}
                      onChange={(e) => {
                        const u = [...manualData];
                        u[i] = { ...u[i], color: e.target.value };
                        setManualData(u);
                      }}
                      title="Color"
                    />
                    <button
                      onClick={() => setManualData(manualData.filter((_, idx) => idx !== i))}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setManualData([...manualData, { label: '', value: 0 }])}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                >
                  <Plus className="w-4 h-4" /> Add Data Point
                </button>
              </div>
            </div>

            {/* Manual Chart Preview */}
            {manualData.length > 0 && (
              <div className="mt-4 p-4 border border-border rounded-lg">
                <ChartRenderer
                  data={manualChartJsData}
                  chartType={manualChartType}
                  title={title}
                  height={250}
                />
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onEndEdit}
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

  // View mode
  return (
    <div className={cn('space-y-3', editableWrapperClass)} onClick={onStartEdit}>
      {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}

      {/* Mode Badge */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
            dataMode === 'api' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
          )}
        >
          {dataMode === 'api' ? (
            <>
              <Database className="w-3 h-3" />
              {SLOT_CHART_TYPES.find((ct) => ct.id === slotChartType)?.label || 'API'}
            </>
          ) : (
            <>
              <BarChart3 className="w-3 h-3" />
              {manualChartType.charAt(0).toUpperCase() + manualChartType.slice(1)} Chart
            </>
          )}
        </span>
        {dataMode === 'api' && gameName && (
          <span className="text-xs text-muted-foreground">• {gameName}</span>
        )}
      </div>

      {/* Loading overlay for API mode */}
      {isWaitingForData && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-10 h-10 mb-3 animate-spin text-primary" />
          <p className="text-sm">Loading chart data...</p>
        </div>
      )}

      {/* Chart display (hide when waiting for data) */}
      {!isWaitingForData && hasData && displayChartData ? (
        <>
          <ChartRenderer
            data={displayChartData}
            chartType={displayChartType}
            height={300}
            visibleDatasets={visibleDatasets}
          />

          {/* Dataset visibility controls for win bucket charts */}
          {dataMode === 'api' && (slotChartType === 'win_bucket_rtp' || slotChartType === 'win_bucket_probability') && displayChartData && (
            <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
              {/* Visible datasets */}
              {(() => {
                const allDatasets = displayChartData.datasets;
                const effectiveVisible = visibleDatasets ?? new Set(
                  allDatasets.filter(d => !d.hidden).map(d => d.label)
                );
                const visibleList = allDatasets.filter(d => effectiveVisible.has(d.label));
                const hiddenList = allDatasets.filter(d => !effectiveVisible.has(d.label));

                return (
                  <>
                    {/* Visible datasets as clickable pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {visibleList.map((ds, idx) => (
                        <button
                          key={ds.label}
                          onClick={() => {
                            // Don't allow hiding last visible dataset
                            if (visibleList.length <= 1) return;
                            const newSet = new Set(effectiveVisible);
                            newSet.delete(ds.label);
                            setVisibleDatasets(newSet);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                          title="Click to hide"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: typeof ds.borderColor === 'string' ? ds.borderColor : ds.borderColor?.[0] || '#3b82f6' }}
                          />
                          {ds.label}
                          <EyeOff className="w-3 h-3 opacity-50" />
                        </button>
                      ))}
                    </div>

                    {/* Hidden datasets dropdown */}
                    {hiddenList.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setShowHiddenDropdown(!showHiddenDropdown)}
                          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                        >
                          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showHiddenDropdown && 'rotate-180')} />
                          {hiddenList.length} hidden dataset{hiddenList.length > 1 ? 's' : ''}
                        </button>

                        {showHiddenDropdown && (
                          <div className="absolute z-10 mt-1 p-1.5 bg-popover border border-border rounded-lg shadow-lg min-w-[150px]">
                            {hiddenList.map((ds) => (
                              <button
                                key={ds.label}
                                onClick={() => {
                                  const newSet = new Set(effectiveVisible);
                                  newSet.add(ds.label);
                                  setVisibleDatasets(newSet);
                                  setShowHiddenDropdown(false);
                                }}
                                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted transition-colors"
                              >
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: typeof ds.borderColor === 'string' ? ds.borderColor : ds.borderColor?.[0] || '#3b82f6' }}
                                />
                                <span className="flex-1">{ds.label}</span>
                                <Eye className="w-3 h-3 text-muted-foreground" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Controls bar for API mode */}
          {dataMode === 'api' && (
            <div
              className="flex items-center justify-between mt-2 py-2 border-t border-border/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Spacer for left side */}
              <div />

              {/* Pagination controls */}
              {supportsPagination && metadata && metadata.totalPages > 1 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0 || isLoadingChart}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
                      currentPage === 0 || isLoadingChart
                        ? 'text-muted-foreground/50 cursor-not-allowed'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>

                  <span className="text-xs text-muted-foreground">
                    {currentPage + 1} / {metadata.totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(Math.min(metadata.totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= metadata.totalPages - 1 || isLoadingChart}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors',
                      currentPage >= metadata.totalPages - 1 || isLoadingChart
                        ? 'text-muted-foreground/50 cursor-not-allowed'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Spacer when no pagination */}
              {!(supportsPagination && metadata && metadata.totalPages > 1) && <div />}
            </div>
          )}
        </>
      ) : !isWaitingForData ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm italic">Click to configure chart...</p>
        </div>
      ) : null}
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
