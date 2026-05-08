/**
 * Mock MiMo API Server (JavaScript version)
 * 可以直接用 node 运行，无需编译
 */

const express = require('express');
const cors = require('cors');
const http = require('http');

const PORT = process.env.MOCK_API_PORT || 3002;

// 模拟响应生成
function generateMockResponse(userMessage, model) {
  const lowerMessage = userMessage.toLowerCase();
  
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
    return 'I can help you with:\n1. Writing and explaining code\n2. Debugging errors\n3. Code reviews and optimization\n4. Answering programming questions\n\nWhat would you like help with?';
  }

  return `Thank you for your message: "${userMessage}"\n\nThis is a mock response from the MiMo API simulator. In production, this would be handled by the real MiMo large language model.`;
}

// 估算 token
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// 分割为块（用于流式输出）
function splitToChunks(text, chunkSize = 5) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

// 创建 Express 应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, _res, next) => {
  console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 健康检查
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'mock-mimo-api',
    version: '1.0.0'
  });
});

// 聊天补全接口
app.post('/chat/completions', async (req, res) => {
  const { messages, stream, model } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'messages array is required'
    });
  }

  const lastMessage = messages[messages.length - 1];
  const userMessage = lastMessage?.content || '';

  // 模拟延迟
  const delay = 200 + Math.random() * 600;
  await new Promise(resolve => setTimeout(resolve, delay));

  if (stream) {
    // SSE 流式响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const mockResponse = generateMockResponse(userMessage, model);
    const chunks = splitToChunks(mockResponse);

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
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } else {
    // 非流式响应
    const mockResponse = generateMockResponse(userMessage, model);
    
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
        prompt_tokens: estimateTokens(JSON.stringify(messages)),
        completion_tokens: estimateTokens(mockResponse),
        total_tokens: estimateTokens(JSON.stringify(messages)) + estimateTokens(mockResponse)
      }
    });
  }
});

// 代码补全接口
app.post('/completions', async (req, res) => {
  const { prompt, suffix } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'prompt is required'
    });
  }

  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 600));

  let mockCompletion = ' // Mock code completion';
  
  if (prompt.includes('function')) {
    mockCompletion = ' {\n  // TODO: Implement this function\n  return null;\n}';
  } else if (prompt.includes('import')) {
    mockCompletion = '\nimport React from \'react\';\nimport { useState, useEffect } from \'react\';';
  } else if (prompt.includes('class')) {
    mockCompletion = ' {\n  constructor() {\n    // TODO: Initialize\n  }\n\n  method() {\n    // TODO: Implement method\n  }\n}';
  }

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
      prompt_tokens: estimateTokens(prompt),
      completion_tokens: estimateTokens(mockCompletion),
      total_tokens: estimateTokens(prompt) + estimateTokens(mockCompletion)
    }
  });
});

// 嵌入向量接口
app.post('/embeddings', async (req, res) => {
  const { input } = req.body;

  if (!input) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'input is required'
    });
  }

  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 600));

  const texts = Array.isArray(input) ? input : [input];
  const embeddings = texts.map(() => {
    // 生成随机向量
    const embedding = [];
    for (let i = 0; i < 1536; i++) {
      embedding.push((Math.random() - 0.5) * 2);
    }
    
    // 归一化
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / norm);
  });

  res.json({
    object: 'list',
    data: embeddings.map((embedding, index) => ({
      object: 'embedding',
      embedding,
      index
    })),
    model: 'mimo-embedding',
    usage: {
      prompt_tokens: texts.reduce((sum, text) => sum + estimateTokens(text), 0),
      total_tokens: texts.reduce((sum, text) => sum + estimateTokens(text), 0)
    }
  });
});

// 404 处理
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'This endpoint does not exist in Mock API'
  });
});

// 错误处理
app.use((err, _req, res, _next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 启动服务器
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Mock MiMo API Server is running on http://localhost:${PORT}`);
  console.log('');
  console.log('📝 Available endpoints:');
  console.log(`   POST /chat/completions  - Chat completions (supports streaming)`);
  console.log(`   POST /completions       - Code completions`);
  console.log(`   POST /embeddings        - Text embeddings`);
  console.log('');
  console.log('💡 Tips:');
  console.log('   - Set "stream": true in request body for streaming response');
  console.log(`   - Configure your app to use http://localhost:${PORT} as MiMo API URL`);
  console.log('');
});
