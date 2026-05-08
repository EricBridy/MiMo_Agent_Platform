/**
 * Mock MiMo API Server
 * 模拟 MiMo API 的 Express 服务器
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';

export class MockMiMoServer {
  private app: Express;
  private port: number;

  constructor(port: number) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * 配置中间件
   */
  private setupMiddleware(): void {
    // CORS 支持
    this.app.use(cors());
    
    // JSON 解析
    this.app.use(express.json());
    
    // 请求日志
    this.app.use((req, _res, next) => {
      console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * 配置路由
   */
  private setupRoutes(): void {
    // 健康检查
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'ok',
        service: 'mock-mimo-api',
        version: '1.0.0'
      });
    });

    // 聊天补全接口
    this.app.post('/chat/completions', this.handleChatCompletions.bind(this));

    // 代码补全接口
    this.app.post('/completions', this.handleCompletions.bind(this));

    // 嵌入向量接口
    this.app.post('/embeddings', this.handleEmbeddings.bind(this));

    // 404 处理
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'This endpoint does not exist in Mock API'
      });
    });

    // 错误处理
    this.app.use((err: Error, _req: Request, res: Response, _next: Function) => {
      console.error('❌ Server error:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
      });
    });
  }

  /**
   * 处理聊天补全请求
   */
  private async handleChatCompletions(req: Request, res: Response): Promise<void> {
    const { messages, stream, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'messages array is required'
      });
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const userMessage = lastMessage?.content || '';

    // 模拟延迟
    const delay = this.getMockDelay();
    await this.sleep(delay);

    if (stream) {
      // SSE 流式响应
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const mockResponse = this.generateMockResponse(userMessage, model);
      const chunks = this.splitToChunks(mockResponse);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const data = {
          id: `mock-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: model || 'mimo-pro',
          choices: [{
            index: 0,
            delta: {
              content: chunk
            },
            finish_reason: i === chunks.length - 1 ? 'stop' : null
          }]
        };

        res.write(`data: ${JSON.stringify(data)}\n\n`);
        await this.sleep(30); // 模拟流式输出延迟
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // 非流式响应
      const mockResponse = this.generateMockResponse(userMessage, model);
      
      res.json({
        id: `mock-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model || 'mimo-pro',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: mockResponse
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: this.estimateTokens(JSON.stringify(messages)),
          completion_tokens: this.estimateTokens(mockResponse),
          total_tokens: this.estimateTokens(JSON.stringify(messages)) + this.estimateTokens(mockResponse)
        }
      });
    }
  }

  /**
   * 处理代码补全请求
   */
  private async handleCompletions(req: Request, res: Response): Promise<void> {
    const { prompt, suffix } = req.body;

    if (!prompt) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'prompt is required'
      });
      return;
    }

    // 模拟延迟
    await this.sleep(this.getMockDelay());

    // 生成模拟代码补全
    const mockCompletion = this.generateMockCompletion(prompt, suffix);

    res.json({
      id: `mock-${Date.now()}`,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: 'mimo-code',
      choices: [{
        text: mockCompletion,
        index: 0,
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: this.estimateTokens(prompt),
        completion_tokens: this.estimateTokens(mockCompletion),
        total_tokens: this.estimateTokens(prompt) + this.estimateTokens(mockCompletion)
      }
    });
  }

  /**
   * 处理嵌入向量请求
   */
  private async handleEmbeddings(req: Request, res: Response): Promise<void> {
    const { input } = req.body;

    if (!input) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'input is required'
      });
      return;
    }

    // 模拟延迟
    await this.sleep(this.getMockDelay());

    // 生成模拟嵌入向量
    const texts = Array.isArray(input) ? input : [input];
    const embeddings = texts.map(() => this.generateMockEmbedding());

    res.json({
      object: 'list',
      data: embeddings.map((embedding, index) => ({
        object: 'embedding',
        embedding,
        index
      })),
      model: 'mimo-embedding',
      usage: {
        prompt_tokens: texts.reduce((sum, text) => sum + this.estimateTokens(text), 0),
        total_tokens: texts.reduce((sum, text) => sum + this.estimateTokens(text), 0)
      }
    });
  }

  /**
   * 生成模拟响应
   */
  private generateMockResponse(userMessage: string, _model?: string): string {
    const lowerMessage = userMessage.toLowerCase();

    // 根据用户输入生成不同的模拟响应
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'Hello! I\'m MiMo, your AI programming assistant. How can I help you today?';
    }

    if (lowerMessage.includes('code') || lowerMessage.includes('代码')) {
      return `Here's a code example for you:

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`

This is a simple TypeScript function that takes a name parameter and returns a greeting message.`;
    }

    if (lowerMessage.includes('error') || lowerMessage.includes('错误')) {
      return 'I see you\'re experiencing an error. Let me help you debug this issue. Could you please share the error message or stack trace?';
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('帮助')) {
      return 'I can help you with:\n\n1. Writing and explaining code\n2. Debugging errors\n3. Code reviews and optimization\n4. Answering programming questions\n\nWhat would you like help with?';
    }

    // 默认响应
    return `Thank you for your message: "${userMessage}"

This is a mock response from the MiMo API simulator. In production, this would be handled by the real MiMo large language model.

To configure the actual API, please provide:
- API Endpoint URL
- API Key
- Model selection

Is there anything specific you'd like me to help you with?`;
  }

  /**
   * 生成模拟代码补全
   */
  private generateMockCompletion(_prompt: string, _suffix?: string): string {
    // 简单的代码补全模拟
    if (_prompt.includes('function')) {
      return ` {\n  // TODO: Implement this function\n  return null;\n}`;
    }

    if (_prompt.includes('import')) {
      return '\nimport React from \'react\';\nimport { useState, useEffect } from \'react\';';
    }

    if (_prompt.includes('class')) {
      return ` {\n  constructor() {\n    // TODO: Initialize\n  }\n\n  method() {\n    // TODO: Implement method\n  }\n}`;
    }

    return ' // Mock code completion';
  }

  /**
   * 生成模拟嵌入向量
   */
  private generateMockEmbedding(dimensions: number = 1536): number[] {
    // 生成随机向量（模拟）
    const embedding: number[] = [];
    for (let i = 0; i < dimensions; i++) {
      embedding.push((Math.random() - 0.5) * 2);
    }
    
    // 归一化
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  }

  /**
   * 将文本分割成块（用于流式输出）
   */
  private splitToChunks(text: string, chunkSize: number = 5): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 估算 token 数量（粗略估计）
   */
  private estimateTokens(text: string): number {
    // 简单估算：1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * 获取模拟延迟时间
   */
  private getMockDelay(): number {
    // 随机延迟 200-800ms，模拟真实 API
    return 200 + Math.random() * 600;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        resolve();
      });
    });
  }
}
