/**
 * Mock MiMo API Server (Pure Node.js version)
 * 无需 npm install，可直接用 node 运行
 */

const http = require('http');
const url = require('url');

const PORT = process.env.MOCK_API_PORT || 3002;

// 模拟响应生成
function generateMockResponse(userMessage, model) {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return 'Hello! I\'m MiMo, your AI programming assistant. How can I help you today?';
  }

  if (lowerMessage.includes('code') || lowerMessage.includes('代码')) {
    return `Here's a code example for you:\n\n\`\`\`typescript\nfunction greet(name: string): string {\n  return \`Hello, ${name}!\`;\n}\n\nconsole.log(greet('World'));\n\`\`\`\n\nThis is a simple TypeScript function.`;
  }

  if (lowerMessage.includes('error') || lowerMessage.includes('错误')) {
    return 'I see you\'re experiencing an error. Let me help you debug this issue. Could you please share the error message or stack trace?';
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('帮助')) {
    return 'I can help you with:\n1. Writing and explaining code\n2. Debugging errors\n3. Code reviews and optimization\n4. Answering programming questions\n\nWhat would you like help with?';
  }

  return `Thank you for your message: "${userMessage}"\n\nThis is a mock response from the MiMo API simulator.`;
}

// 生成模拟代码补全
function generateMockCompletion(prompt) {
  if (prompt.includes('function')) {
    return ' {\n  // TODO: Implement this function\n  return null;\n}';
  }

  if (prompt.includes('import')) {
    return '\nimport React from \'react\';\nimport { useState, useEffect } from \'react\';';
  }

  if (prompt.includes('class')) {
    return ' {\n  constructor() {\n    // TODO: Initialize\n  }\n\n  method() {\n    // TODO: Implement method\n  }\n}';
  }

  return ' // Mock code completion';
}

// 生成模拟嵌入向量
function generateMockEmbedding(dimensions = 1536) {
  const embedding = [];
  for (let i = 0; i < dimensions; i++) {
    embedding.push((Math.random() - 0.5) * 2);
  }
  
  // 归一化
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / norm);
}

// 估算 token
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// 解析请求体
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// 发送 SSE 数据
function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// 创建服务器
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 健康检查
  if (path === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'mock-mimo-api',
      version: '1.0.0'
    }));
    return;
  }

  // 聊天补全
  if (path === '/chat/completions' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { messages, stream, model } = body;

      if (!messages || !Array.isArray(messages)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Invalid request',
          message: 'messages array is required'
        }));
        return;
      }

      const lastMessage = messages[messages.length - 1];
      const userMessage = lastMessage?.content || '';

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 600));

      if (stream) {
        // SSE 流式响应
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        const mockResponse = generateMockResponse(userMessage, model);
        
        // 分批发送
        for (let i = 0; i < mockResponse.length; i += 5) {
          const chunk = mockResponse.slice(i, i + 5);
          sendSSE(res, {
            id: `mock-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: model || 'mimo-pro',
            choices: [{
              index: 0,
              delta: { content: chunk },
              finish_reason: i + 5 >= mockResponse.length ? 'stop' : null
            }]
          });
          await new Promise(resolve => setTimeout(resolve, 30));
        }

        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        // 非流式响应
        const mockResponse = generateMockResponse(userMessage, model);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
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
            prompt_tokens: estimateTokens(JSON.stringify(messages)),
            completion_tokens: estimateTokens(mockResponse),
            total_tokens: estimateTokens(JSON.stringify(messages)) + estimateTokens(mockResponse)
          }
        }));
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }));
    }
    return;
  }

  // 代码补全
  if (path === '/completions' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { prompt } = body;

      if (!prompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Invalid request',
          message: 'prompt is required'
        }));
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 600));

      const mockCompletion = generateMockCompletion(prompt);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
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
          prompt_tokens: estimateTokens(prompt),
          completion_tokens: estimateTokens(mockCompletion),
          total_tokens: estimateTokens(prompt) + estimateTokens(mockCompletion)
        }
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }));
    }
    return;
  }

  // 嵌入向量
  if (path === '/embeddings' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { input } = body;

      if (!input) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Invalid request',
          message: 'input is required'
        }));
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 600));

      const texts = Array.isArray(input) ? input : [input];
      const data = texts.map((_, index) => ({
        object: 'embedding',
        embedding: generateMockEmbedding(),
        index
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        object: 'list',
        data,
        model: 'mimo-embedding',
        usage: {
          prompt_tokens: texts.reduce((sum, text) => sum + estimateTokens(text), 0),
          total_tokens: texts.reduce((sum, text) => sum + estimateTokens(text), 0)
        }
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }));
    }
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Not Found',
    message: `Cannot ${req.method} ${path}`
  }));
});

server.listen(PORT, () => {
  console.log(`🚀 Mock MiMo API Server is running on http://localhost:${PORT}`);
  console.log('');
  console.log('📝 Available endpoints:');
  console.log(`   POST /chat/completions  - Chat completions (supports streaming)`);
  console.log(`   POST /completions       - Code completions`);
  console.log(`   POST /embeddings        - Text embeddings`);
  console.log(`   GET  /health            - Health check`);
  console.log('');
  console.log('💡 Tips:');
  console.log('   - Set "stream": true in request body for streaming response');
  console.log(`   - Configure your app to use http://localhost:${PORT} as MiMo API URL`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});
