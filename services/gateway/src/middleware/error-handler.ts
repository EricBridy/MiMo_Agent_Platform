/**
 * Gateway Service - 错误处理中间件
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// 自定义错误类
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 404 处理
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
};

// 全局错误处理
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Request error', {
    error: err.message,
    path: req.path,
    method: req.method
  });

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
};

// 异步错误包装器
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
