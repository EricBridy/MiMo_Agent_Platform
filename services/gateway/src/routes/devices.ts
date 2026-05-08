/**
 * Gateway Service - 设备路由
 */

import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/error-handler';
import { apiKeyAuth } from '../middleware/auth';
import { logger } from '../utils/logger';
import { Device } from '../types';

const router = Router();

// 内存存储设备（实际应该用数据库）
const devices = new Map<string, Device>();

// 注册设备
router.post('/register', apiKeyAuth, asyncHandler(async (req, res) => {
  const { id, name, platform, type, capabilities, ipAddress, port } = req.body;
  
  if (!id || !name || !platform || !type) {
    throw new ApiError(400, 'id, name, platform, type are required');
  }
  
  const device: Device = {
    id,
    name,
    platform,
    type,
    status: 'online',
    lastSeen: new Date(),
    capabilities: capabilities || {
      canExecuteCommands: true,
      canAccessFilesystem: true,
      canRunGUI: true,
      maxConcurrentSessions: 5
    },
    ipAddress,
    port
  };
  
  devices.set(id, device);
  
  logger.info('Device registered', { deviceId: id, name, platform });
  
  res.status(201).json({
    success: true,
    data: device
  });
}));

// 获取设备列表
router.get('/', apiKeyAuth, asyncHandler(async (req, res) => {
  const { type, status } = req.query;
  
  let deviceList = Array.from(devices.values());
  
  if (type) {
    deviceList = deviceList.filter(d => d.type === type);
  }
  
  if (status) {
    deviceList = deviceList.filter(d => d.status === status);
  }
  
  // 更新离线设备状态
  const now = new Date();
  deviceList = deviceList.map(d => {
    const lastSeen = new Date(d.lastSeen);
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / 1000 / 60;
    if (diffMinutes > 5 && d.status === 'online') {
      d.status = 'offline';
    }
    return d;
  });
  
  res.json({
    success: true,
    data: deviceList,
    count: deviceList.length
  });
}));

// 获取单个设备
router.get('/:id', apiKeyAuth, asyncHandler(async (req, res) => {
  const device = devices.get(req.params.id);
  
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
  const device = devices.get(req.params.id);
  
  if (!device) {
    throw new ApiError(404, 'Device not found');
  }
  
  if (!['online', 'offline', 'busy'].includes(status)) {
    throw new ApiError(400, 'Invalid status');
  }
  
  device.status = status;
  device.lastSeen = new Date();
  
  logger.info('Device status updated', { deviceId: req.params.id, status });
  
  res.json({
    success: true,
    data: device
  });
}));

// 设备心跳
router.post('/:id/heartbeat', apiKeyAuth, asyncHandler(async (req, res) => {
  const device = devices.get(req.params.id);
  
  if (!device) {
    throw new ApiError(404, 'Device not found');
  }
  
  device.lastSeen = new Date();
  if (device.status === 'offline') {
    device.status = 'online';
  }
  
  res.json({
    success: true,
    data: { lastSeen: device.lastSeen }
  });
}));

// 删除设备
router.delete('/:id', apiKeyAuth, asyncHandler(async (req, res) => {
  const device = devices.get(req.params.id);
  
  if (!device) {
    throw new ApiError(404, 'Device not found');
  }
  
  devices.delete(req.params.id);
  
  logger.info('Device deleted', { deviceId: req.params.id });
  
  res.json({
    success: true,
    message: 'Device deleted'
  });
}));

export default router;
