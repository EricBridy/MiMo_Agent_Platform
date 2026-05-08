/**
 * Socket.IO 服务 - 移动端
 */

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  async connect(): Promise<boolean> {
    const serverUrl = await AsyncStorage.getItem('serverUrl') || 'http://localhost:3001';
    
    return new Promise((resolve) => {
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.emit('connection', { connected: true });
        resolve(true);
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.emit('connection', { connected: false });
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
        this.emit('error', error);
      });

      this.socket.on('message', (data) => {
        this.emit('message', data);
      });

      this.socket.on('device:discovered', (data) => {
        this.emit('device:discovered', data);
      });

      this.socket.on('device:connected', (data) => {
        this.emit('device:connected', data);
      });

      this.socket.on('device:disconnected', (data) => {
        this.emit('device:disconnected', data);
      });

      // 连接超时
      setTimeout(() => {
        if (!this.socket?.connected) {
          resolve(false);
        }
      }, 5000);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  sendMessage(sessionId: string, content: string) {
    this.socket?.emit('message', { sessionId, content });
  }

  joinSession(sessionId: string) {
    this.socket?.emit('join', { sessionId });
  }

  leaveSession(sessionId: string) {
    this.socket?.emit('leave', { sessionId });
  }

  wakeDevice(deviceId: string, purpose: string = 'Quick coding task') {
    this.socket?.emit('wake:request', {
      deviceId,
      sourceDevice: 'mobile',
      purpose,
      priority: 'normal'
    });
  }

  // 事件监听
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    callbacks?.forEach(callback => callback(data));
  }
}

export const socketService = new SocketService();
