import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

export interface RegisterDeviceData {
  deviceId: string;
  name: string;
  platform: string;
  type: 'desktop' | 'mobile';
  capabilities?: Record<string, any>;
}

export class DeviceService {
  // 注册设备
  static async registerDevice(data: RegisterDeviceData) {
    try {
      const device = await prisma.device.upsert({
        where: { deviceId: data.deviceId },
        update: {
          name: data.name,
          platform: data.platform,
          type: data.type,
          status: 'connected',
          lastSeen: new Date(),
          capabilities: data.capabilities ? JSON.stringify(data.capabilities) : null,
        },
        create: {
          deviceId: data.deviceId,
          name: data.name,
          platform: data.platform,
          type: data.type,
          status: 'connected',
          capabilities: data.capabilities ? JSON.stringify(data.capabilities) : null,
        },
      });
      logger.info(`Device registered: ${data.deviceId}`);
      return device;
    } catch (error) {
      logger.error('Failed to register device:', error);
      throw error;
    }
  }

  // 获取设备列表
  static async getDevices() {
    try {
      const devices = await prisma.device.findMany({
        orderBy: { lastSeen: 'desc' },
      });
      return devices.map(device => ({
        ...device,
        capabilities: device.capabilities ? JSON.parse(device.capabilities) : null,
      }));
    } catch (error) {
      logger.error('Failed to get devices:', error);
      throw error;
    }
  }

  // 获取单个设备
  static async getDevice(deviceId: string) {
    try {
      const device = await prisma.device.findUnique({
        where: { deviceId },
      });
      if (device && device.capabilities) {
        return {
          ...device,
          capabilities: JSON.parse(device.capabilities),
        };
      }
      return device;
    } catch (error) {
      logger.error('Failed to get device:', error);
      throw error;
    }
  }

  // 更新设备状态
  static async updateDeviceStatus(deviceId: string, status: string) {
    try {
      const device = await prisma.device.update({
        where: { deviceId },
        data: {
          status,
          lastSeen: new Date(),
        },
      });
      logger.info(`Device status updated: ${deviceId} -> ${status}`);
      return device;
    } catch (error) {
      logger.error('Failed to update device status:', error);
      throw error;
    }
  }

  // 更新设备心跳
  static async heartbeat(deviceId: string) {
    try {
      const device = await prisma.device.update({
        where: { deviceId },
        data: {
          lastSeen: new Date(),
          status: 'connected',
        },
      });
      return device;
    } catch (error) {
      logger.error('Failed to update heartbeat:', error);
      throw error;
    }
  }

  // 删除设备
  static async deleteDevice(deviceId: string) {
    try {
      await prisma.device.delete({
        where: { deviceId },
      });
      logger.info(`Device deleted: ${deviceId}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete device:', error);
      throw error;
    }
  }

  // 清理离线设备
  static async cleanupOfflineDevices(timeoutMinutes: number = 10) {
    try {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - timeoutMinutes);

      const result = await prisma.device.updateMany({
        where: {
          lastSeen: {
            lt: cutoffTime,
          },
          status: 'connected',
        },
        data: {
          status: 'disconnected',
        },
      });

      if (result.count > 0) {
        logger.info(`Marked ${result.count} devices as disconnected`);
      }
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup offline devices:', error);
      throw error;
    }
  }
}

export default DeviceService;
