/**
 * Sync Service - 跨设备协同服务
 */

import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface DevicePair {
  deviceId: string;
  pairedDeviceId: string;
  pairedAt: Date;
}

class SyncService {
  private io: SocketIOServer | null = null;
  private devicePairs: Map<string, DevicePair> = new Map();

  initialize(io: SocketIOServer) {
    this.io = io;
    logger.info('SyncService initialized');
  }

  async pairDevices(deviceId: string, pairedDeviceId: string): Promise<DevicePair> {
    const pairedAt = new Date();
    const pair: DevicePair = { deviceId, pairedDeviceId, pairedAt };
    this.devicePairs.set(deviceId, pair);
    this.devicePairs.set(pairedDeviceId, { deviceId: pairedDeviceId, pairedDeviceId: deviceId, pairedAt });
    this.broadcastToDevice(deviceId, 'device:paired', { pairedDeviceId });
    this.broadcastToDevice(pairedDeviceId, 'device:paired', { pairedDeviceId: deviceId });
    logger.info('Devices paired', { deviceId, pairedDeviceId });
    return pair;
  }

  async unpairDevices(deviceId: string): Promise<void> {
    const pair = this.devicePairs.get(deviceId);
    if (!pair) return;
    const { pairedDeviceId } = pair;
    this.devicePairs.delete(deviceId);
    this.devicePairs.delete(pairedDeviceId);
    this.broadcastToDevice(deviceId, 'device:unpaired', { pairedDeviceId });
    this.broadcastToDevice(pairedDeviceId, 'device:unpaired', { pairedDeviceId: deviceId });
    logger.info('Devices unpaired', { deviceId, pairedDeviceId });
  }

  getPairedDevice(deviceId: string): string | null {
    return this.devicePairs.get(deviceId)?.pairedDeviceId || null;
  }

  async saveSyncState(deviceId: string, sessionId: string, state: any): Promise<void> {
    // 只保留最近 10 条同步状态记录
    await prisma.$transaction(async (tx) => {
      await tx.syncState.create({
        data: { deviceId, sessionId, state: JSON.stringify(state) },
      });
      // 删除旧记录
      const oldStates = await tx.syncState.findMany({
        where: { deviceId, sessionId },
        orderBy: { timestamp: 'desc' },
        skip: 10,
        select: { id: true },
      });
      if (oldStates.length > 0) {
        await tx.syncState.deleteMany({
          where: { id: { in: oldStates.map(s => s.id) } },
        });
      }
    });
  }

  async getSyncState(deviceId: string, sessionId: string): Promise<any | null> {
    const syncState = await prisma.syncState.findFirst({
      where: { deviceId, sessionId },
      orderBy: { timestamp: 'desc' },
    });
    return syncState ? JSON.parse(syncState.state) : null;
  }

  async syncStateToPeer(deviceId: string, sessionId: string, state: any): Promise<void> {
    const pairedDeviceId = this.getPairedDevice(deviceId);
    if (!pairedDeviceId) return;
    await this.saveSyncState(deviceId, sessionId, state);
    this.broadcastToDevice(pairedDeviceId, 'sync:state', { sessionId, state, sourceDeviceId: deviceId, timestamp: Date.now() });
  }

  async shareSession(deviceId: string, sessionId: string, targetDeviceId: string): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { messages: true },
    });
    if (!session) throw new Error('Session not found');
    this.broadcastToDevice(targetDeviceId, 'session:shared', {
      session: { id: session.id, projectPath: session.projectPath, startedAt: session.startedAt },
      messages: session.messages,
      fromDeviceId: deviceId,
    });
    logger.info('Session shared', { sessionId, from: deviceId, to: targetDeviceId });
  }

  async forwardMessage(deviceId: string, sessionId: string, message: any): Promise<void> {
    const pairedDeviceId = this.getPairedDevice(deviceId);
    if (!pairedDeviceId) return;
    this.broadcastToDevice(pairedDeviceId, 'message:forward', { sessionId, message, fromDeviceId: deviceId });
  }

  private broadcastToDevice(deviceId: string, event: string, data: any): void {
    if (!this.io) return;
    this.io.to(`device:${deviceId}`).emit(event, data);
  }
}

export default new SyncService();
