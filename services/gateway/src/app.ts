/**
 * Gateway Service - Express 应用配置
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { requestLogger } from './utils/logger';
import { notFoundHandler, errorHandler } from './middleware/error-handler';

// 路由
import chatRoutes from './routes/chat';
import deviceRoutes from './routes/devices';
import fileRoutes from './routes/files';
import projectRoutes from './routes/projects';
import syncRoutes from './routes/sync';
import toolsRoutes from './routes/tools';

export const createApp = () => {
  const app = express();
  
  // 安全中间件
  app.use(helmet({
    contentSecurityPolicy: false // 开发环境禁用 CSP
  }));
  
  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true
  }));
  
  // 日志
  app.use(morgan('dev'));
  app.use(requestLogger);
  
  // 解析请求体
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // 健康检查
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });
  
  // API 路由
  app.use('/api/v1/chat', chatRoutes);
  app.use('/api/v1/devices', deviceRoutes);
  app.use('/api/v1/files', fileRoutes);
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/sync', syncRoutes);
  app.use('/api/v1/tools', toolsRoutes);
  
  // 404 处理
  app.use(notFoundHandler);
  
  // 错误处理
  app.use(errorHandler);
  
  return app;
};
