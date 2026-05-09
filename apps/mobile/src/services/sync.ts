//**
 * Mobile Sync Service - 跨设备协同
 */

import { Socket } from 'socket.io-client';
import { gatewayAPI } from './gateway';

export interface SyncState {
  editorContent?: string;
  cursorPosition?: { line: number; column: number };
  openFiles?: string[];
  activeFile?: string;
}

class SyncService {
  private socket: Socket | null = null;
  private deviceId: string = '';
  private pairedDeviceId: string | null = null;
  private stateChangeCallback: ((state: SyncState) => void) | null = null;
  private sessionSharedCallback: ((data: any) => void) | null = null;

  initialize(socket: Socket, deviceId: string) {
    this.socket = socket;
    this.deviceId = deviceId;
    this.setupListeners();
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('device:paired', (data: { pairedDeviceId: string }) => {
      this.pairedDeviceId = data.pairedDeviceId;
      console.log('Device paired:', data.pairedDeviceId);
    });

    this.socket.on('device:unpaired', () => {
      this.pairedDeviceId = null;
      console.log('Device unpaired');
    });

    this.socket.on('sync:state', (data: { sessionId: string; state: SyncState }) => {
      if (this.stateChangeCallback) {
        this.stateChangeCallback(data.state);
      }
    });

    this.socket.on('session:shared', (data: any) => {
      if (this.sessionSharedCallback) {
        this.sessionSharedCallback(data);
      }
    });

    this.socket.on('message:forward', (data: any) => {
      console.log('Message forwarded from peer:', data);
    });
  }

  async pairDevice(pairedDeviceId: string): Promise<void> {
    await gatewayAPI.post('/sync/pair', {
      deviceId: this.deviceId,
      pairedDeviceId,
    });
  }

  async unpairDevice(): Promise<void> {
    await gatewayAPI.post('/sync/unpair', { deviceId: this.deviceId });
    this.pairedDeviceId = null;
  }

  async getPairStatus(): Promise<{ isPaired: boolean; pairedDeviceId: string | null }> {
    const response = await gatewayAPI.get(`/sync/pair/${this.deviceId}`);
    return response.data;
  }

  async syncState(sessionId: string, state: SyncState): Promise<void> {
    await gatewayAPI.post('/sync/state', {
      deviceId: this.deviceId,
      sessionId,
      state,
    });
  }

  async shareSession(sessionId: string, targetDeviceId: string): Promise<void> {
    await gatewayAPI.post('/sync/share-session', {
      deviceId: this.deviceId,
      sessionId,
      targetDeviceId,
    });
  }

  onStateChange(callback: (state: SyncState) => void) {
    this.stateChangeCallback = callback;
  }

  onSessionShared(callback: (data: any) => void) {
    this.sessionSharedCallback = callback;
  }

  getPairedDeviceId(): string | null {
    return this.pairedDeviceId;
  }
}

export default new SyncService();
