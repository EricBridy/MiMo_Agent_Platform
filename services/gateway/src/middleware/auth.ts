/**
 * Gateway Service - 认证中间件
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// 扩展 Express Request 类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
      apiKey?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// API Key 认证中间件
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key is required'
    });
  }
  
  // 验证 API Key（简化实现，实际应该查询数据库）
  if (apiKey !== process.env.API_KEY && apiKey !== 'dev-api-key') {
    logger.warn('Invalid API key attempt', { ip: req.ip, apiKey: apiKey.slice(0, 10) + '...' });
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }
  
  req.apiKey = apiKey;
  next();
};

// JWT 认证中间件
export const jwtAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization token is required'
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.userId,
      email: decoded.email
    };
    next();
  } catch (error) {
    logger.warn('Invalid JWT token', { ip: req.ip, error: (error as Error).message });
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// 可选认证中间件（不强制要求认证，但如果有则解析）
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;
  
  if (apiKey && (apiKey === process.env.API_KEY || apiKey === 'dev-api-key')) {
    req.apiKey = apiKey;
  }
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        id: decoded.userId,
        email: decoded.email
      };
    } catch (error) {
      // 忽略无效的 JWT
    }
  }
  
  next();
};

// 生成 JWT Token
export const generateToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};
