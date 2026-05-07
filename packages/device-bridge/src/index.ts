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
}

/**
 * 创建设备桥接实例
 */
export function createDeviceBridge(config: DeviceBridgeConfig): DeviceBridge {
  return new DeviceBridge(config);
}
