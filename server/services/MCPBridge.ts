/**
 * MCP Bridge Service
 *
 * Bridges the Express backend to the Insights Engine MCP server.
 * Handles communication via stdio or HTTP depending on configuration.
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

// MCP request/response types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Document context for analyze_query
export interface DocumentContext {
  documentId: string;
  sections: Array<{
    id: string;
    type: string;
    blockIds: string[];
  }>;
}

// Pipeline result from MCP
export interface PipelineResult {
  pipelineName: string;
  status: 'success' | 'error';
  result?: string;
  error?: string;
  duration?: number;
  turns?: number;
  editIntents?: EditIntentDeclaration[];
}

// Edit intent declared by a pipeline
export interface EditIntentDeclaration {
  sectionId: string;
  sectionType: string;
  blockIds: string[];
  reason: string;
}

// Analysis result from MCP
export interface AnalysisResult {
  query: string;
  sessionId: string;
  pipelinesUsed: string[];
  pipelineResults: PipelineResult[];
  consolidatedReport: string;
  editIntents?: EditIntentDeclaration[];
}

// Events emitted by MCPBridge
export interface MCPBridgeEvents {
  'connected': () => void;
  'disconnected': () => void;
  'error': (error: Error) => void;
  'pipeline:started': (pipelineName: string) => void;
  'pipeline:progress': (pipelineName: string, turn: number, maxTurns: number) => void;
  'pipeline:content': (pipelineName: string, content: string) => void;
  'pipeline:complete': (pipelineName: string, result: PipelineResult) => void;
}

export class MCPBridge extends EventEmitter {
  private mcpProcess: ChildProcess | null = null;
  private mcpPath: string;
  private requestId: number = 0;
  private pendingRequests: Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = new Map();
  private isConnected: boolean = false;
  private responseBuffer: string = '';

  constructor(mcpPath?: string) {
    super();
    this.mcpPath = mcpPath || path.join(
      process.cwd(),
      'sandbox',
      'insight-engine-mcp',
      'mcp',
      'insights_engine'
    );
  }

  /**
   * Start the MCP server process
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Start MCP server via node
        this.mcpProcess = spawn('node', ['index.js'], {
          cwd: this.mcpPath,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            // Pass through relevant env vars
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
            MONGODB_MCP_URL: process.env.MONGODB_MCP_URL,
            NEO4J_URI: process.env.NEO4J_URI,
            NEO4J_USER: process.env.NEO4J_USER,
            NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,
          },
        });

        this.mcpProcess.stdout?.on('data', (data: Buffer) => {
          this.handleStdout(data.toString());
        });

        this.mcpProcess.stderr?.on('data', (data: Buffer) => {
          console.error('[MCP stderr]:', data.toString());
        });

        this.mcpProcess.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

        this.mcpProcess.on('close', (code) => {
          this.isConnected = false;
          this.emit('disconnected');
          console.log(`[MCPBridge] Process exited with code ${code}`);
        });

        // Wait a bit for process to start
        setTimeout(() => {
          this.isConnected = true;
          this.emit('connected');
          resolve();
        }, 1000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle stdout from MCP process
   */
  private handleStdout(data: string): void {
    this.responseBuffer += data;

    // Try to parse complete JSON-RPC messages
    const lines = this.responseBuffer.split('\n');
    this.responseBuffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const response = JSON.parse(line) as MCPResponse;
        this.handleResponse(response);
      } catch {
        // Not valid JSON, might be log output
        console.log('[MCP output]:', line);
      }
    }
  }

  /**
   * Handle MCP response
   */
  private handleResponse(response: MCPResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      console.warn('[MCPBridge] Received response for unknown request:', response.id);
      return;
    }

    this.pendingRequests.delete(response.id);

    if (response.error) {
      pending.reject(new Error(response.error.message));
    } else {
      pending.resolve(response.result);
    }
  }

  /**
   * Send request to MCP server
   */
  private async sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.isConnected || !this.mcpProcess?.stdin) {
      throw new Error('MCP not connected');
    }

    const id = ++this.requestId;
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const requestStr = JSON.stringify(request) + '\n';
      this.mcpProcess!.stdin!.write(requestStr, (error) => {
        if (error) {
          this.pendingRequests.delete(id);
          reject(error);
        }
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP request timeout'));
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Call MCP tool
   */
  async callTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    return this.sendRequest('tools/call', {
      name: toolName,
      arguments: args,
    });
  }

  /**
   * Analyze a query using the MCP pipelines
   */
  async analyzeQuery(
    query: string,
    documentContext?: DocumentContext,
    debug: boolean = false
  ): Promise<AnalysisResult> {
    const result = await this.callTool('analyze_query', {
      query,
      documentContext,
      debug,
    });

    // Parse the result
    if (typeof result === 'object' && result !== null) {
      const content = (result as { content?: Array<{ text?: string }> }).content;
      if (Array.isArray(content) && content[0]?.text) {
        const text = content[0].text;

        // Check if debug mode returned JSON
        if (debug && text.startsWith('# DEBUG MODE')) {
          try {
            const jsonStart = text.indexOf('{');
            const jsonStr = text.substring(jsonStart);
            return JSON.parse(jsonStr) as AnalysisResult;
          } catch {
            // Fall through to text result
          }
        }

        // Non-debug mode returns consolidated report
        return {
          query,
          sessionId: 'unknown',
          pipelinesUsed: [],
          pipelineResults: [],
          consolidatedReport: text,
        };
      }
    }

    throw new Error('Invalid MCP response format');
  }

  /**
   * List available tools
   */
  async listTools(): Promise<unknown> {
    return this.sendRequest('tools/list', {});
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
    }
    this.isConnected = false;
    this.emit('disconnected');
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

/**
 * Mock MCP Bridge for development/testing
 * Simulates MCP responses without requiring actual MCP server
 */
export class MockMCPBridge extends EventEmitter {
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    this.isConnected = true;
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.emit('disconnected');
  }

  get connected(): boolean {
    return this.isConnected;
  }

  async analyzeQuery(
    query: string,
    documentContext?: DocumentContext,
    debug: boolean = false
  ): Promise<AnalysisResult> {
    // Simulate pipeline execution
    await this.simulateDelay(500);

    const pipelinesUsed = this.selectPipelines(query);
    const pipelineResults: PipelineResult[] = [];

    for (const pipelineName of pipelinesUsed) {
      this.emit('pipeline:started', pipelineName);

      // Simulate turns
      const maxTurns = 3 + Math.floor(Math.random() * 3);
      for (let turn = 1; turn <= maxTurns; turn++) {
        await this.simulateDelay(200);
        this.emit('pipeline:progress', pipelineName, turn, maxTurns);
      }

      const result: PipelineResult = {
        pipelineName,
        status: 'success',
        result: `Analysis from ${pipelineName} pipeline for query: "${query}"`,
        duration: 1000 + Math.random() * 2000,
        turns: maxTurns,
        editIntents: documentContext ? this.generateEditIntents(pipelineName, documentContext) : undefined,
      };

      pipelineResults.push(result);
      this.emit('pipeline:complete', pipelineName, result);
    }

    return {
      query,
      sessionId: `mock-${Date.now()}`,
      pipelinesUsed,
      pipelineResults,
      consolidatedReport: this.generateConsolidatedReport(query, pipelineResults),
      editIntents: pipelineResults.flatMap(r => r.editIntents || []),
    };
  }

  private selectPipelines(query: string): string[] {
    const lowerQuery = query.toLowerCase();
    const pipelines: string[] = [];

    if (lowerQuery.includes('design') || lowerQuery.includes('concept')) {
      pipelines.push('knowledge_base');
    }
    if (lowerQuery.includes('metric') || lowerQuery.includes('performance')) {
      pipelines.push('tableau');
    }
    if (lowerQuery.includes('competitor') || lowerQuery.includes('market')) {
      pipelines.push('bigwinboard');
    }
    if (lowerQuery.includes('math') || lowerQuery.includes('rtp')) {
      pipelines.push('aboutslots');
    }
    if (lowerQuery.includes('mechanic') || lowerQuery.includes('feature')) {
      pipelines.push('slot_graph');
    }
    if (lowerQuery.includes('document') || lowerQuery.includes('confluence')) {
      pipelines.push('confluence');
    }

    // Default to knowledge_base if no matches
    if (pipelines.length === 0) {
      pipelines.push('knowledge_base');
    }

    return pipelines;
  }

  private generateEditIntents(
    pipelineName: string,
    documentContext: DocumentContext
  ): EditIntentDeclaration[] {
    const intents: EditIntentDeclaration[] = [];

    // Generate intents based on pipeline affinity
    const affineSections: Record<string, string[]> = {
      knowledge_base: ['design_vision', 'game_mechanics'],
      tableau: ['success_metrics'],
      bigwinboard: ['game_mechanics'],
      aboutslots: ['math_framework'],
      slot_graph: ['game_mechanics'],
      confluence: ['data_sources'],
    };

    const targetSections = affineSections[pipelineName] || [];

    for (const section of documentContext.sections) {
      if (targetSections.includes(section.type)) {
        intents.push({
          sectionId: section.id,
          sectionType: section.type,
          blockIds: section.blockIds.slice(0, 2), // First 2 blocks
          reason: `${pipelineName} has data relevant to ${section.type}`,
        });
      }
    }

    return intents;
  }

  private generateConsolidatedReport(query: string, results: PipelineResult[]): string {
    const pipelineNames = results.map(r => r.pipelineName).join(', ');
    return `## Analysis Report

**Query:** ${query}

**Pipelines Used:** ${pipelineNames}

### Summary

This is a mock consolidated report combining insights from ${results.length} pipeline(s).

${results.map(r => `
#### ${r.pipelineName}
${r.result}
`).join('\n')}

### Recommendations

Based on the analysis, consider reviewing the game mechanics and player experience sections.
`;
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton - use mock by default, real MCP when configured
export const mcpBridge = process.env.USE_REAL_MCP === 'true'
  ? new MCPBridge()
  : new MockMCPBridge();
