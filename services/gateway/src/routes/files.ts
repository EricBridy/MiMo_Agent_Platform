/**
 * Gateway Service - 文件路由
 */

import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/error-handler';
import { apiKeyAuth } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// 文件操作代理到设备
// 实际实现应该通过 WebSocket 转发到具体设备执行

// 读取文件
router.get('/*', apiKeyAuth, asyncHandler(async (req, res) => {
  const filePath = req.params[0];
  const { deviceId } = req.query;
  
  if (!deviceId) {
    throw new ApiError(400, 'deviceId is required');
  }
  
  if (!filePath) {
    throw new ApiError(400, 'file path is required');
  }
  
  // TODO: 通过 WebSocket 转发到设备执行
  logger.info('File read requested', { deviceId, filePath });
  
  res.json({
    success: true,
    message: 'File operation forwarded to device',
    data: { deviceId, filePath, operation: 'read' }
  });
}));

// 写入文件
router.post('/*', apiKeyAuth, asyncHandler(async (req, res) => {
  const filePath = req.params[0];
  const { deviceId, content } = req.body;
  
  if (!deviceId) {
    throw new ApiError(400, 'deviceId is required');
  }
  
  if (!filePath) {
    throw new ApiError(400, 'file path is required');
  }
  
  logger.info('File write requested', { deviceId, filePath });
  
  res.json({
    success: true,
    message: 'File operation forwarded to device',
    data: { deviceId, filePath, operation: 'write' }
  });
}));

// 删除文件
router.delete('/*', apiKeyAuth, asyncHandler(async (req, res) => {
  const filePath = req.params[0];
  const { deviceId } = req.query;
  
  if (!deviceId) {
    throw new ApiError(400, 'deviceId is required');
  }
  
  if (!filePath) {
    throw new ApiError(400, 'file path is required');
  }
  
  logger.info('File delete requested', { deviceId, filePath });
  
  res.json({
    success: true,
    message: 'File operation forwarded to device',
    data: { deviceId, filePath, operation: 'delete' }
  });
}));

export default router;
