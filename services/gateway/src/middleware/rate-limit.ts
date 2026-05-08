/**
 * Gateway Service - 限流中间件
 */

import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';

// 通用限流配置
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // 默认 15 分钟
    max: options.max || 100, // 默认每个窗口最多 100 请求
    message: {
      success: false,
      error: options.message || 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        limit: options.max
      });
      res.status(429).json(options.message);
    }
  });
};

// 严格限流（用于敏感操作）
export const strictRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 20, // 20 请求
  message: 'Too many requests for this operation'
});

// 普通限流
export const standardRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// 宽松限流（用于只读操作）
export const relaxedRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300
});

// WebSocket 连接限流（基于 IP）
const wsConnectionMap = new Map<string, { count: number; resetTime: number }>();

export const wsRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 分钟
  const maxConnections = 10; // 每分钟最多 10 个连接
  
  const record = wsConnectionMap.get(ip);
  
  if (!record || now > record.resetTime) {
    wsConnectionMap.set(ip, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }
  
  if (record.count >= maxConnections) {
    logger.warn('WebSocket rate limit exceeded', { ip, count: record.count });
    return false;
  }
  
  record.count++;
  return true;
};
