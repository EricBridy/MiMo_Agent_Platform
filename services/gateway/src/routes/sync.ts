/**
 * Sync Routes - 跨设备协同 API
 */

import { Router } from 'express';
import SyncService from '../services/sync.service';
import { logger } from '../utils/logger';

const router = Router();

// 配对设备
router.post('/pair', async (req, res, next) => {
  try {
    const { deviceId, pairedDeviceId } = req.body;
    if (!deviceId || !pairedDeviceId) {
      return res.status(400).json({ success: false, error: 'deviceId and pairedDeviceId required' });
    }
    const pair = await SyncService.pairDevices(deviceId, pairedDeviceId);
    res.json({ success: true, data: pair });
  } catch (error) {
    next(error);
  }
});

// 取消配对
router.post('/unpair', async (req, res, next) => {
  try {
    const { deviceId } = req.body;
    await SyncService.unpairDevices(deviceId);
    res.json({ success: true, message: 'Devices unpaired' });
  } catch (error) {
    next(error);
  }
});

// 获取配对状态
router.get('/pair/:deviceId', async (req, res, next) => {
  try {
    const pairedDeviceId = SyncService.getPairedDevice(req.params.deviceId);
    res.json({ success: true, data: { deviceId: req.params.deviceId, pairedDeviceId, isPaired: !!pairedDeviceId } });
  } catch (error) {
    next(error);
  }
});

// 同步状态到配对设备
router.post('/state', async (req, res, next) => {
  try {
    const { deviceId, sessionId, state } = req.body;
    await SyncService.syncStateToPeer(deviceId, sessionId, state);
    res.json({ success: true, message: 'State synced' });
  } catch (error) {
    next(error);
  }
});

// 共享会话
router.post('/share-session', async (req, res, next) => {
  try {
    const { deviceId, sessionId, targetDeviceId } = req.body;
    await SyncService.shareSession(deviceId, sessionId, targetDeviceId);
    res.json({ success: true, message: 'Session shared' });
  } catch (error) {
    next(error);
  }
});

export default router;
