/**
 * 设备桥接 - 移动端和桌面端之间的通信
 * 支持mDNS发现、WebSocket通信、推送唤醒
 */

import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';
import { 
  Device, 
  Platform, 
  DeviceType, 
  WakeRequest, 
  WakeResponse,
  generateId
} from '@mimo/shared';

export interface DeviceBridgeConfig {
  deviceId: string;
  deviceName: string;
  platform: Platform;
  type: DeviceType;
  serverUrl?: string;
}

export interface DeviceBridgeEvents {
  'device:discovered': Device;
  'device:connected': Device;
  'device:disconnected': Device;
  'wake:request': WakeRequest;
  'wake:completed': WakeResponse;
  'sync:state': any;
  'error': Error;
}

export class DeviceBridge extends EventEmitter {
  private config: DeviceBridgeConfig;
  private socket: Socket | null = null;
  private connectedDevices: Map<string, Device> = new Map();
  private serverUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isManualDisconnect = false;
  
  constructor(config: DeviceBridgeConfig) {
    super();
    this.config = config;
    this.serverUrl = config.serverUrl || 'http://localhost:3001';
  }
  
  /**
   * 连接到服务器
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          timeout: 10000
        });
        
        this.setupSocketHandlers();
        
        this.socket.on('connect', () => {
          console.log('Connected to server');
          this.reconnectAttempts = 0;
          this.isManualDisconnect = false;
          
          // 注册设备
          this.registerDevice();
          resolve();
        });
        
        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Failed to connect after multiple attempts'));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * 断开连接
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.socket?.disconnect();
    this.socket = null;
  }
  
  /**
   * 注册设备到服务器
   */
  private registerDevice(): void {
    if (!this.socket?.connected) return;
    
    this.socket.emit('device:register', {
      id: this.config.deviceId,
      name: this.config.deviceName,
      platform: this.config.platform,
      type: this.config.type,
      capabilities: this.getCapabilities()
    });
  }
  
  /**
   * 获取设备能力
   */
  private getCapabilities(): Device['capabilities'] {
    return {
      canExecuteCommands: true,
      canAccessFilesystem: true,
      canRunGUI: this.config.type === 'desktop',
      maxConcurrentSessions: this.config.type === 'desktop' ? 5 : 1
    };
  }
  
  /**
   * 设置Socket事件处理
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return;
    
    // 设备发现
    this.socket.on('device:discovered', (device: Device) => {
      console.log('Device discovered:', device);
      this.connectedDevices.set(device.id, device);
      this.emit('device:discovered', device);
    });
    
    // 设备连接
    this.socket.on('device:connected', (device: Device) => {
      console.log('Device connected:', device);
      this.connectedDevices.set(device.id, device);
      this.emit('device:connected', device);
    });
    
    // 设备断开
    this.socket.on('device:disconnected', (device: Device) => {
      console.log('Device disconnected:', device);
      this.connectedDevices.delete(device.id);
      this.emit('device:disconnected', device);
    });
    
    // 唤醒请求
    this.socket.on('wake:request', (request: WakeRequest) => {
      console.log('Wake request received:', request);
      this.emit('wake:request', request);
    });
    
    // 唤醒响应
    this.socket.on('wake:response', (response: WakeResponse) => {
      console.log('Wake response received:', response);
      this.emit('wake:completed', response);
    });
    
    // 状态同步
    this.socket.on('sync:state', (state: any) => {
      this.emit('sync:state', state);
    });
    
    // 错误处理
    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      this.emit('error', new Error(error.message || 'Socket error'));
    });
    
    // 断开连接
    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      if (!this.isManualDisconnect) {
        this.emit('error', new Error('Disconnected from server'));
      }
    });
  }
  
  /**
   * 开始设备发现
   */
  startDiscovery(): void {
    // 在实际实现中，这里会启动mDNS/Bonjour发现
    // 目前通过WebSocket从服务器获取设备列表
    this.fetchDevices();
    
    // 定期刷新设备列表
    setInterval(() => {
      this.fetchDevices();
    }, 30000);
  }
  
  /**
   * 停止设备发现
   */
  stopDiscovery(): void {
    // 清理发现资源
  }
  
  /**
   * 获取设备列表
   */
  private async fetchDevices(): Promise<void> {
    if (!this.socket?.connected) return;
    
    this.socket.emit('device:list', (devices: Device[]) => {
      devices.forEach(device => {
        if (device.id !== this.config.deviceId) {
          this.connectedDevices.set(device.id, device);
          this.emit('device:discovered', device);
        }
      });
    });
  }
  
  /**
   * 获取已连接的设备
   */
  getConnectedDevices(): Device[] {
    return Array.from(this.connectedDevices.values());
  }
  
  /**
   * 发送消息到指定设备
   */
  sendToDevice(deviceId: string, message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }
      
      this.socket.emit('device:message', {
        targetDeviceId: deviceId,
        message
      }, (ack: any) => {
        if (ack?.success) {
          resolve();
        } else {
          reject(new Error(ack?.error || 'Failed to send message'));
        }
      });
    });
  }
  
  /**
   * 发送唤醒请求
   */
  async sendWakeRequest(targetDeviceId: string, purpose: string): Promise<WakeResponse> {
    const wakeRequest: WakeRequest = {
      deviceId: targetDeviceId,
      sourceDevice: this.config.deviceId,
      purpose,
      priority: 'normal'
    };
    
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }
      
      this.socket.emit('wake:request', wakeRequest, (response: WakeResponse) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Wake request failed'));
        }
      });
    });
  }
  
  /**
   * 响应唤醒请求
   */
  respondToWakeRequest(request: WakeRequest, accept: boolean): void {
    if (!this.socket?.connected) return;
    
    const response: WakeResponse = {
      success: accept,
      sessionId: accept ? generateId('session') : undefined,
      connectionUrl: accept ? `${this.serverUrl}/session/${generateId('session')}` : undefined
    };
    
    this.socket.emit('wake:response', {
      request,
      response
    });
  }
  
  /**
   * 同步状态
   */
  syncState(state: any): void {
    if (!this.socket?.connected) return;
    
    this.socket.emit('sync:state', {
      deviceId: this.config.deviceId,
      state
    });
  }
  
  /**
   * 获取连接状态
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
  
  /**
   * 获取服务器URL
   */
  getServerUrl(): string {
    return this.serverUrl;
  }
  
  /**
   * 更新服务器URL
   */
  setServerUrl(url: string): void {
    this.serverUrl = url;
  }

  /**
   * 启动心跳检测
   */
  startHeartbeat(interval: number = 30000): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot start heartbeat');
      return;
    }

    console.log(`💓� 启动心跳检测（间隔：${interval}ms）...`);
    
    // 定期发送心跳
    const heartbeatInterval = setInterval(() => {
      if (!this.socket?.connected) {
        console.warn('⚠️ 心跳停止：连接已断开');
        clearInterval(heartbeatInterval);
        return;
      }

      this.socket.emit('heartbeat', {
        deviceId: this.config.deviceId,
        timestamp: new Date(),
        status: 'alive'
      });
    }, interval);

    // 监听心跳响应
    this.socket.on('heartbeat:ack', (data: any) => {
      console.log(`💓� 心跳响应: ${data.deviceId} (延迟: ${Date.now() - new Date(data.timestamp).getTime()}ms)`);
    });

    // 监听其他设备的心跳（用于检测设备是否在线）
    this.socket.on('heartbeat:received', (data: any) => {
      const device = this.connectedDevices.get(data.deviceId);
      if (device) {
        device.lastSeen = new Date();
        this.connectedDevices.set(data.deviceId, device);
        this.emit('device:status_updated', device);
      }
    });
  }

  /**
   * 停止心跳检测
   */
  stopHeartbeat(): void {
    this.socket?.off('heartbeat:ack');
    this.socket?.off('heartbeat:received');
    console.log('⏹️ 心跳检测已停止');
  }

  /**
   * 设备能力协商（根据对端能力调整行为）
   */
  negotiateCapabilities(targetDeviceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      const localCapabilities = this.getCapabilities();
      
      console.log(`🤝 开始能力协商 with ${targetDeviceId}...`);
      
      this.socket.emit('capability:negotiate', {
        sourceDeviceId: this.config.deviceId,
        targetDeviceId,
        capabilities: localCapabilities
      }, (response: any) => {
        if (response.success) {
          console.log(`✅ 能力协商完成:`, response.agreedCapabilities);
          resolve(response.agreedCapabilities);
        } else {
          reject(new Error(response.error || 'Capability negotiation failed'));
        }
      });
    });
  }

  /**
   * 处理能力协商请求（内部调用）
   */
  private handleCapabilityNegotiation(): void {
    if (!this.socket) return;

    this.socket.on('capability:negotiate', (request: any, callback: Function) => {
      console.log(`🤝 收到能力协商请求 from ${request.sourceDeviceId}`);
      
      const localCapabilities = this.getCapabilities();
      const remoteCapabilities = request.capabilities;

      // 简单协商策略：取两者的最小值/交集
      const agreed: any = {
        canExecuteCommands: localCapabilities.canExecuteCommands && remoteCapabilities.canExecuteCommands,
        canAccessFilesystem: localCapabilities.canAccessFilesystem && remoteCapabilities.canAccessFilesystem,
        canRunGUI: localCapabilities.canRunGUI || remoteCapabilities.canRunGUI, // 任一设备支持 GUI 即可
        maxConcurrentSessions: Math.min(localCapabilities.maxConcurrentSessions, remoteCapabilities.maxConcurrentSessions)
      };

      callback({
        success: true,
        agreedCapabilities: agreed
      });
    });
  }

  /**
   * 会话迁移（从一个设备迁移到另一个设备）
   */
  async migrateSession(sessionId: string, targetDeviceId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      console.log(`🚚 将会话 ${sessionId} 迁移到设备 ${targetDeviceId}...`);
      
      this.socket.emit('session:migrate', {
        sessionId,
        sourceDeviceId: this.config.deviceId,
        targetDeviceId,
        timestamp: new Date()
      }, (response: any) => {
        if (response.success) {
          console.log(`✅ 会话迁移成功:`, response.newSessionId);
          this.emit('session:migrated', {
            oldSessionId: sessionId,
            newSessionId: response.newSessionId,
            targetDeviceId
          });
          resolve(response);
        } else {
          reject(new Error(response.error || 'Session migration failed'));
        }
      });
    });
  }

  /**
   * 处理会话迁移请求（内部调用）
   */
  private handleSessionMigration(): void {
    if (!this.socket) return;

    this.socket.on('session:migrate', async (request: any, callback: Function) => {
      console.log(`🚚 收到会话迁移请求: ${request.sessionId} from ${request.sourceDeviceId}`);
      
      try {
        // 这里可以加载会话数据并恢复到本地
        // 暂时简单确认迁移
        callback({
          success: true,
          newSessionId: request.sessionId, // 实际应该生成新的 session ID
          message: 'Session migration accepted'
        });
      } catch (error) {
        callback({
          success: false,
          error: (error as Error).message
        });
      }
    });
  }

  /**
   * 获取设备状态（基于心跳）
   */
  getDeviceStatus(deviceId: string): 'online' | 'offline' | 'unknown' {
    const device = this.connectedDevices.get(deviceId);
    if (!device) return 'unknown';
    
    const lastSeen = new Date(device.lastSeen || 0);
    const now = new Date();
    const diffSeconds = (now.getTime() - lastSeen.getTime()) / 1000;
    
    // 如果超过 2 个心跳周期未收到心跳，认为离线
    if (diffSeconds > 60) {
      return 'offline';
    }
    
    return 'online';
  }
}

/**
 * 创建设备桥接实例
 */
export function createDeviceBridge(config: DeviceBridgeConfig): DeviceBridge {
  return new DeviceBridge(config);
}
