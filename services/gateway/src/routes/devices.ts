/**
 * Gateway Service - 设备路由 (使用数据库持久化)
 */

import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/error-handler';
import { apiKeyAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import DeviceService from '../services/device.service';

const router = Router();

// 注册设备
router.post('/register', apiKeyAuth, asyncHandler(async (req, res) => {
  const { id, name, platform, type, capabilities, ipAddress, port } = req.body;
  
  if (!id || !name || !platform || !type) {
    throw new ApiError(400, 'id, name, platform, type are required');
  }
  
  const device = await DeviceService.registerDevice({
    deviceId: id,
    name,
    platform,
    type,
    capabilities: capabilities || {
      canExecuteCommands: true,
      canAccessFilesystem: true,
      canRunGUI: true,
      maxConcurrentSessions: 5
    },
  });
  
  logger.info('Device registered', { deviceId: id, name, platform });
  
  res.status(201).json({
    success: true,
    data: device
  });
}));

// 获取设备列表
router.get('/', apiKeyAuth, asyncHandler(async (req, res) => {
  const { type, status } = req.query;
  
  let devices = await DeviceService.getDevices();
  
  // 过滤
  if (type) {
    devices = devices.filter(d => d.type === type);
  }
  
  if (status) {
    devices = devices.filter(d => d.status === status);
  }
  
  res.json({
    success: true,
    data: devices,
    count: devices.length
  });
}));

// 获取单个设备
router.get('/:id', apiKeyAuth, asyncHandler(async (req, res) => {
  const device = await DeviceService.getDevice(req.params.id);
  
  if (!device) {
    throw new ApiError(404, 'Device not found');
  }
  
  res.json({
    success: true,
    data: device
  });
}));

// 更新设备状态
router.put('/:id/status', apiKeyAuth, asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!['online', 'offline', 'busy'].includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }
  
  const device = await DeviceService.updateDeviceStatus(req.params.id, status);
  
  logger.info('Device status updated', { deviceId: req.params.id, status });
  
  res.json({
    success: true,
    data: device
  });
}));

// 设备心跳
router.post('/:id/heartbeat', apiKeyAuth, asyncHandler(async (req, res) => {
  const device = await DeviceService.heartbeat(req.params.id);
  
  res.json({
    success: true,
    data: { lastSeen: device.lastSeen }
  });
}));

// 删除设备
router.delete('/:id', apiKeyAuth, asyncHandler(async (req, res) => {
  await DeviceService.deleteDevice(req.params.id);
  
  logger.info('Device deleted', { deviceId: req.params.id });
  
  res.json({
    success: true,
    message: 'Device deleted'
  });
}));

export default router;
