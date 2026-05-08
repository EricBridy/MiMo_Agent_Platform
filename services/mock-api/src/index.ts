#!/usr/bin/env node
/**
 * Mock MiMo API Service
 * 模拟 MiMo API 服务器，用于开发测试
 */

import { MockMiMoServer } from './server';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const PORT = process.env.MOCK_API_PORT ? parseInt(process.env.MOCK_API_PORT) : 3002;

async function main() {
  console.log('🚀 Starting Mock MiMo API Server...');
  
  const server = new MockMiMoServer(PORT);
  
  try {
    await server.start();
    console.log(`✅ Mock MiMo API Server is running on http://localhost:${PORT}`);
    console.log('');
    console.log('📝 Available endpoints:');
    console.log(`   POST /chat/completions  - Chat completions (supports streaming)`);
    console.log(`   POST /completions       - Code completions`);
    console.log(`   POST /embeddings        - Text embeddings`);
    console.log('');
    console.log('💡 Tips:');
    console.log('   - Set "stream": true in request body for streaming response');
    console.log('   - Configure your app to use this endpoint as MiMo API URL');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
