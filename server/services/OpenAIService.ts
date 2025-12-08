import OpenAI from 'openai';

// Lazy initialization to allow dotenv to load first
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: Error) => void;
}

export class OpenAIService {
  private model: string;

  constructor(model: string = 'gpt-4o') {
    this.model = model;
  }

  private get openai(): OpenAI {
    return getOpenAIClient();
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    return response.choices[0]?.message?.content || '';
  }

  async streamChat(messages: ChatMessage[], callbacks: StreamCallbacks): Promise<void> {
    try {
      const stream = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || '';
        if (token) {
          fullContent += token;
          callbacks.onToken(token);
        }
      }

      callbacks.onComplete(fullContent);
    } catch (error) {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Using OpenAI Responses API (for web search, file search, etc.)
  async responsesChat(
    messages: ChatMessage[],
    callbacks: StreamCallbacks,
    tools?: Array<{ type: 'web_search' | 'file_search' }>
  ): Promise<void> {
    try {
      // Convert to responses API format
      const input = messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      const response = await (this.openai as any).responses.create({
        model: this.model,
        input,
        tools: tools || [],
        stream: true,
      });

      let fullContent = '';

      for await (const event of response) {
        if (event.type === 'response.output_text.delta') {
          const token = event.delta || '';
          if (token) {
            fullContent += token;
            callbacks.onToken(token);
          }
        }
      }

      callbacks.onComplete(fullContent);
    } catch (error) {
      // Fall back to regular chat if responses API fails
      console.warn('Responses API failed, falling back to chat:', error);
      await this.streamChat(messages, callbacks);
    }
  }
}

export const openaiService = new OpenAIService();
