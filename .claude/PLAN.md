# Insights Engine: Template-Based Parallel Document Editing

## Current Implementation Status

### Already Built
- **Frontend**: React + TypeScript + Zustand + Tailwind
  - `ChatPanel`, `ChatMessage` with streaming support
  - `DocumentEditor`, `DocumentSection`, `BlockContainer`, `BlockRenderer` (8+ block types)
  - `PipelineStatusBar`, `PipelineProgress` with visual states
  - `SessionSidebar` with CRUD operations
  - `SplitPanel` with draggable resize
  - 4 Zustand stores: `appStore`, `chatStore`, `documentStore`, `pipelineStore`
  - `useWebSocket`, `useStreamingAnalysis` hooks

- **Backend**: Express + WebSocket + Drizzle ORM + PostgreSQL
  - REST routes: `/api/chat`, `/api/documents`, `/api/sessions`
  - `PipelineOrchestrator` with keyword-based pipeline selection
  - `BlockLockManager` (partial - schema exists, manager incomplete)
  - `OpenAIService` with streaming
  - Database schema with `blockLocks` table

- **Types**: Full TypeScript coverage
  - Document types with 10 section types, 10+ block types
  - Pipeline types with 6 pipelines
  - BlockLock interface

### What's Missing (This Plan)
1. Template directive parsing system
2. Pipeline edit intent/queue system
3. Real MCP integration (currently simulated)
4. Streaming block edits during pipeline execution
5. Directive validation system

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      EXISTING FRONTEND                               │
├─────────────────────────────────────────────────────────────────────┤
│  ChatPanel ──► useStreamingAnalysis ──► DocumentEditor              │
│      │                │                      │                       │
│  chatStore      pipelineStore          documentStore                │
│                       │                      │                       │
│               [NEW: editIntentStore]    BlockContainer              │
│                       │                      │                       │
│               [NEW: useLockSubscription]  [ENHANCE: streaming]      │
└─────────────────────────────────────────────────────────────────────┘
                              │ WebSocket (existing)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXISTING BACKEND                                │
├─────────────────────────────────────────────────────────────────────┤
│  Express Server + WebSocketHandler                                   │
│      │                                                               │
│  PipelineOrchestrator (existing)                                    │
│      │                                                               │
│      ├── [NEW: EditIntentManager]                                   │
│      ├── [ENHANCE: BlockLockManager]                                │
│      └── [NEW: MCPBridge]                                           │
│                                                                      │
│  [NEW: TemplateParser]                                              │
│  [NEW: DirectiveValidator]                                          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│              EXISTING MCP SERVER (sandbox/insight-engine-mcp)        │
├─────────────────────────────────────────────────────────────────────┤
│  InsightsEngineMCPServer                                            │
│      └── Pipelines: slot_graph, bigwinboard, tableau,               │
│                     knowledge_base, confluence, aboutslots          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Template Parser & Schema Update

### Goal
Parse markdown templates with directives into structured documents.

### Directive Syntax (HTML Comments)
```markdown
<!-- SECTION_ID: game_mechanics -->
<!-- CHUNK: feature_001 | POSITION: 5 | ENTITIES: 2-3 -->
<!-- ENTITY_TYPES: FeatureType, PsychologicalMechanism -->
<!-- RELATIONSHIPS: TRIGGERS -> PsychologicalMechanism -->
<!-- PIPELINE: knowledge_base -->
```

### New Files
| File | Purpose |
|------|---------|
| `server/types/template.ts` | Directive type definitions |
| `server/services/TemplateParser.ts` | Parse markdown → structured document |
| `src/types/directive.ts` | Frontend directive types (mirror backend) |

### Schema Update (server/db/schema.ts)
Add `directives` JSONB column to `documentBlocks` and `documentSections`:

```typescript
// In documentSections table
directives: jsonb('directives').default({}).notNull(),

// In documentBlocks table
directives: jsonb('directives').default({}).notNull(),
```

### Directives Structure
```typescript
interface BlockDirectives {
  chunk?: { id: string; position?: number; entityRange?: { min: number; max: number } };
  entityTypes?: { types: string[] };
  relationships?: { patterns: Array<{ type: string; targetType: string }> };
  pipeline?: { preferred: string; fallback?: string[] };
  constraints?: { minWords?: number; maxWords?: number };
  raw?: string[];
}
```

### New API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/from-template` | Create document from template markdown |
| GET | `/api/templates` | List available templates from sandbox/templates |

---

## Phase 2: Edit Intent Queue System

### Goal
Enable pipelines to declare which blocks they want to edit and queue access.

### Pipeline-to-Section Affinity
```typescript
const PIPELINE_SECTION_AFFINITY = {
  knowledge_base: ['design_vision', 'game_mechanics', 'player_experience'],
  tableau: ['success_metrics', 'progression_systems'],
  bigwinboard: ['game_mechanics', 'math_framework'],
  aboutslots: ['math_framework', 'compliance'],
  slot_graph: ['game_mechanics', 'design_vision'],
  confluence: ['data_sources', 'compliance'],
  consolidator: ['executive_summary']
};
```

### New Services
| File | Purpose |
|------|---------|
| `server/services/EditIntentManager.ts` | Queue edit requests by priority |
| `server/services/MCPBridge.ts` | Connect Express to MCP server |

### Enhance Existing
| File | Changes |
|------|---------|
| `server/services/BlockLockManager.ts` | Add queue processing, timeout watchdog |
| `server/services/PipelineOrchestrator.ts` | Use MCPBridge instead of simulation |

### Edit Flow
```
1. User query → PipelineOrchestrator
2. MCPBridge calls MCP analyze_query
3. MCP returns pipeline results + edit intents
4. EditIntentManager queues by priority
5. BlockLockManager grants locks
6. Pipeline content streams to blocks
7. Lock released → next in queue
```

### Priority Rules
1. consolidator: 10 (highest)
2. Data pipelines: 5
3. Affinity match bonus: +2
4. Earlier request wins ties

---

## Phase 3: WebSocket Message Extensions

### Goal
Stream block edits in real-time during pipeline execution.

### New Message Types (add to existing WebSocket)

**Server → Client**
```typescript
| { type: 'edit_intent_declared'; payload: { blockId: string; pipelineName: string } }
| { type: 'lock_queued'; payload: { blockId: string; pipelineName: string; position: number } }
| { type: 'block_streaming_start'; payload: { blockId: string; pipelineName: string } }
| { type: 'block_content_chunk'; payload: { blockId: string; chunk: string; accumulated: string } }
| { type: 'block_streaming_end'; payload: { blockId: string; finalContent: object } }
| { type: 'lock_timeout_warning'; payload: { blockId: string; expiresIn: number } }
```

**Client → Server** (add to existing)
```typescript
| { type: 'accept_edit'; payload: { blockId: string } }
| { type: 'reject_edit'; payload: { blockId: string; reason: string } }
```

### Update Files
| File | Changes |
|------|---------|
| `server/websocket/WebSocketHandler.ts` | Add new message handlers |
| `src/hooks/useStreamingAnalysis.ts` | Handle new block streaming events |

---

## Phase 4: Frontend Streaming Block UI

### Goal
Show pipeline content streaming into blocks in real-time.

### New Store
```typescript
// src/store/editIntentStore.ts
interface EditIntentState {
  activeEdits: Map<string, {
    blockId: string;
    pipelineName: string;
    streamingContent: string;
    isComplete: boolean;
    startedAt: number;
  }>;
  queuedIntents: Array<{ blockId: string; pipelineName: string; position: number }>;

  // Actions
  startBlockEdit: (blockId: string, pipelineName: string) => void;
  appendStreamingContent: (blockId: string, chunk: string) => void;
  completeBlockEdit: (blockId: string) => void;
  setQueuedIntents: (intents: QueuedIntent[]) => void;
}
```

### Enhance BlockContainer
Add to existing `src/components/document/BlockContainer.tsx`:
- Streaming content overlay when pipeline is writing
- Queue position indicator ("tableau queued #2")
- Pipeline-specific colors (knowledge_base=purple, tableau=blue, etc.)

### New Component
| Component | Purpose |
|-----------|---------|
| `src/components/document/StreamingBlockOverlay.tsx` | Shows streaming text with typing animation |

### Visual States (enhance existing)
```
[Normal]     → No changes (existing)
[Locked]     → Yellow ring + lock icon (existing)
[Streaming]  → Blue ring + typing animation + live content
[Queued]     → Amber ring + clock + "pipeline queued (#N)"
```

---

## Phase 5: MCP Integration

### Goal
Connect to real MCP server instead of simulation.

### New File
```typescript
// server/services/MCPBridge.ts
class MCPBridge {
  async analyzeQuery(query: string, documentContext?: DocumentContext): Promise<MCPResult>;
  async getEditIntents(pipelineResults: PipelineResults): Promise<EditIntent[]>;
}
```

### MCP Enhancement (optional - if needed)
Add to `sandbox/insight-engine-mcp/mcp/insights_engine/server.js`:
- Accept `documentContext` in analyze_query
- Return `editIntents` with section/block targets

---

## Phase 6: Validation System

### Goal
Validate pipeline output against directive constraints.

### New Service
```typescript
// server/services/DirectiveValidator.ts
class DirectiveValidator {
  validate(blockId: string, content: object, directives: BlockDirectives): ValidationResult;
}
```

### Validation Rules
| Rule | Level | Description |
|------|-------|-------------|
| Entity count | Warning | Entities within directive range |
| Entity types | Warning | Entities match expected types |
| Word count | Info | Content within constraints |

### New Component
| Component | Purpose |
|-----------|---------|
| `src/components/document/ValidationBadge.tsx` | Shows warning count on blocks |

---

## Implementation Checklist

### Phase 1: Template Parser ✅ COMPLETE
- [x] Create `server/types/template.ts`
- [x] Create `src/types/directive.ts`
- [x] Update `server/db/schema.ts` with directives columns
- [x] Run database migration (`npx drizzle-kit push`)
- [x] Create `server/services/TemplateParser.ts`
- [x] Add `POST /api/documents/from-template` route
- [x] Add `GET /api/templates/list` route

### Phase 2: Edit Intent Queue ✅ COMPLETE
- [x] Create `server/services/EditIntentManager.ts`
- [x] Create `server/services/MCPBridge.ts` (mock implementation)
- [x] Enhance `server/services/BlockLockManager.ts`
- [ ] Update `server/services/PipelineOrchestrator.ts` (integration pending)

### Phase 3: WebSocket Extensions ✅ COMPLETE
- [x] Add new message types to `server/websocket/WebSocketHandler.ts`
- [x] Update `src/hooks/useStreamingAnalysis.ts`

### Phase 4: Frontend Streaming ✅ COMPLETE
- [x] Create `src/store/editIntentStore.ts`
- [x] Create `src/components/document/StreamingBlockOverlay.tsx`
- [x] Enhance `src/components/document/BlockContainer.tsx`

### Phase 5: MCP Integration 🔄 IN PROGRESS
- [x] Create `server/services/MCPBridge.ts` (mock ready)
- [ ] Test with real MCP server (set `USE_REAL_MCP=true`)

### Phase 6: Validation ✅ COMPLETE
- [x] Create `server/services/DirectiveValidator.ts`
- [x] Create `src/components/document/ValidationBadge.tsx`

---

## File Summary

### New Files
| Location | File |
|----------|------|
| Backend | `server/types/template.ts` |
| Backend | `server/services/TemplateParser.ts` |
| Backend | `server/services/EditIntentManager.ts` |
| Backend | `server/services/MCPBridge.ts` |
| Backend | `server/services/DirectiveValidator.ts` |
| Frontend | `src/types/directive.ts` |
| Frontend | `src/store/editIntentStore.ts` |
| Frontend | `src/components/document/StreamingBlockOverlay.tsx` |
| Frontend | `src/components/document/ValidationBadge.tsx` |

### Modified Files
| Location | File | Changes |
|----------|------|---------|
| Backend | `server/db/schema.ts` | Add directives columns |
| Backend | `server/services/BlockLockManager.ts` | Queue + timeout |
| Backend | `server/services/PipelineOrchestrator.ts` | MCPBridge integration |
| Backend | `server/websocket/WebSocketHandler.ts` | New message types |
| Backend | `server/routes/documents.ts` | Template endpoints |
| Frontend | `src/hooks/useStreamingAnalysis.ts` | Block streaming events |
| Frontend | `src/components/document/BlockContainer.tsx` | Streaming UI |
| Frontend | `src/types/document.ts` | Add directives to Block |
