#!/usr/bin/env node
/**
 * Gateway Service - 入口文件
 */

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { createApp } from './app';
import { setupWebSocketHandlers } from './websocket/handlers';
import SyncService from './services/sync.service';
import { logger } from './utils/logger';

// 加载环境变量
dotenv.config();

const PORT = process.env.GATEWAY_PORT ? parseInt(process.env.GATEWAY_PORT) : 3001;
const HOST = process.env.GATEWAY_HOST || '0.0.0.0';

async function main() {
  logger.info('🚀 Starting Gateway Service...');
  
  // 创建 Express 应用
  const app = createApp();
  
  // 创建 HTTP 服务器
  const httpServer = createServer(app);
  
  // 创建 Socket.IO 服务器
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingInterval: 30000,
    pingTimeout: 10000
  });
  
  // 设置 WebSocket 处理器
  setupWebSocketHandlers(io);
  
  // 初始化同步服务
  SyncService.initialize(io);
  
  // 启动服务器
  httpServer.listen(PORT, HOST, () => {
    logger.info(`✅ Gateway Service is running on http://${HOST}:${PORT}`);
    console.log('');
    console.log('📡 Available endpoints:');
    console.log(`   GET  /health              - Health check`);
    console.log(`   POST /api/v1/chat         - Chat completions`);
    console.log(`   GET  /api/v1/sessions     - List sessions`);
    console.log(`   POST /api/v1/sessions     - Create session`);
    console.log(`   GET  /api/v1/devices      - List devices`);
    console.log(`   POST /api/v1/devices      - Register device`);
    console.log('');
    console.log('🔌 WebSocket events:');
    console.log(`   join    - Join room (device/session)`);
    console.log(`   leave   - Leave room`);
    console.log(`   message - Send message`);
    console.log(`   tool    - Execute tool`);
    console.log(`   ping    - Heartbeat`);
    console.log('');
    console.log('🔄 Sync endpoints:');
    console.log(`   POST /api/v1/sync/pair         - Pair devices`);
    console.log(`   POST /api/v1/sync/unpair       - Unpair devices`);
    console.log(`   GET  /api/v1/sync/pair/:id     - Get pair status`);
    console.log(`   POST /api/v1/sync/state        - Sync state`);
    console.log(`   POST /api/v1/sync/share-session - Share session`);
    console.log('');
    console.log('🛠️  Tools endpoints:');
    console.log(`   GET  /api/v1/tools/list        - List available tools`);
    console.log(`   POST /api/v1/tools/execute     - Execute tool`);
    console.log('');
  });
  
  // 优雅关闭
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
  
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    httpServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

main().catch((error) => {
  logger.error('Failed to start Gateway Service', { error: error.message });
  process.exit(1);
});
