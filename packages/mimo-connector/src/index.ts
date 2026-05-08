/**
 * MiMo大模型连接器
 * 与MiMo API交互的封装
 */

import { EventEmitter } from 'events';
import { generateId, delay, retry } from '@mimo/shared';

export interface MiMoConfig {
  apiKey: string;
  apiUrl: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  maxRetries?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  context?: Record<string, unknown>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  model: string;
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason?: 'stop' | 'length';
}

export interface StreamChunk {
  id: string;
  delta: string;
  done: boolean;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface MiMoEvents {
  'chunk': { chunk: StreamChunk };
  'complete': { response: ChatResponse };
  'error': { error: Error };
}

export class MiMoConnector extends EventEmitter {
  private config: MiMoConfig;
  
  constructor(config: MiMoConfig) {
    super();
    this.config = {
      model: 'mimo-pro',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 30000,
      maxRetries: 3,
      ...config
    };
  }
  
  /**
   * 发送聊天请求
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const url = `${this.config.apiUrl}/chat/completions`;
    
    const body = {
      model: request.model || this.config.model,
      messages: request.messages,
      temperature: request.temperature ?? this.config.temperature,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      context: request.context
    };
    
    try {
      const response = await this.makeRequest(url, body);
      return this.parseResponse(response);
    } catch (error) {
      this.emit('error', { error: error as Error });
      throw error;
    }
  }
  
  /**
   * 流式聊天
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk, void, unknown> {
    const url = `${this.config.apiUrl}/chat/completions`;
    
    const body = {
      model: request.model || this.config.model,
      messages: request.messages,
      temperature: request.temperature ?? this.config.temperature,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      stream: true,
      context: request.context
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout!)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // 处理SSE事件
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const chunk = this.parseStreamChunk(parsed);
              
              if (chunk) {
                this.emit('chunk', { chunk });
                yield chunk;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      this.emit('error', { error: error as Error });
      throw error;
    }
  }
  
  /**
   * 代码补全
   */
  async complete(prompt: string, suffix?: string): Promise<string> {
    const url = `${this.config.apiUrl}/completions`;
    
    const body = {
      model: this.config.model,
      prompt,
      suffix,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens
    };
    
    try {
      const response = await this.makeRequest(url, body);
      return this.parseCompletionResponse(response);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 嵌入向量
   */
  async embed(texts: string[]): Promise<number[][]> {
    const url = `${this.config.apiUrl}/embeddings`;
    
    const body = {
      model: 'mimo-embedding',
      input: texts
    };
    
    try {
      const response = await this.makeRequest(url, body);
      return this.parseEmbeddingResponse(response);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 发送HTTP请求
   */
  private async makeRequest(
    url: string,
    body: Record<string, unknown>
  ): Promise<unknown> {
    const makeSingleRequest = async (): Promise<Response> => {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout!)
      });
    };
    
    const response = await retry(makeSingleRequest, {
      maxAttempts: this.config.maxRetries,
      delay: 1000,
      backoff: true,
      onRetry: (attempt, error) => {
        console.log(`Retry attempt ${attempt} for ${url}: ${error.message}`);
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiMo API Error: HTTP ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }
  
  /**
   * 解析响应
   */
  private parseResponse(data: any): ChatResponse {
    return {
      id: data.id || generateId('mimo'),
      model: data.model || this.config.model!,
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage ? {
        prompt_tokens: data.usage.prompt_tokens || 0,
        completion_tokens: data.usage.completion_tokens || 0,
        total_tokens: data.usage.total_tokens || 0
      } : undefined,
      finish_reason: data.choices?.[0]?.finish_reason
    };
  }
  
  /**
   * 解析流式响应
   */
  private parseStreamChunk(data: any): StreamChunk | null {
    if (data.choices?.[0]?.delta?.content) {
      return {
        id: data.id || generateId('mimo'),
        delta: data.choices[0].delta.content,
        done: data.choices[0].finish_reason === 'stop',
        usage: data.usage
      };
    }
    return null;
  }
  
  /**
   * 解析补全响应
   */
  private parseCompletionResponse(data: any): string {
    return data.choices?.[0]?.text || '';
  }
  
  /**
   * 解析嵌入响应
   */
  private parseEmbeddingResponse(data: any): number[][] {
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((item: any) => item.embedding);
    }
    return [];
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: Partial<MiMoConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): MiMoConfig {
    return { ...this.config };
  }
}

/**
 * 创建MiMo连接器实例
 */
export function createMiMoConnector(config: MiMoConfig): MiMoConnector {
  return new MiMoConnector(config);
}
