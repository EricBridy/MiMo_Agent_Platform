/**
 * MiMo Agent - 状态管理 (Zustand)
 */

import { create } from 'zustand';

export type ViewType = 'chat' | 'editor' | 'devices';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  toolCalls?: any[];
}

export interface Device {
  id: string;
  name: string;
  platform: string;
  type: string;
  status: string;
  lastSeen?: Date;
}

export interface AppState {
  // 视图状态
  currentView: ViewType;
  setView: (view: ViewType) => void;
  
  // 设备信息
  deviceInfo: Device | null;
  loadDeviceInfo: () => Promise<void>;
  
  // 聊天消息
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  
  // 连接设备
  connectedDevices: Device[];
  addDevice: (device: Device) => void;
  removeDevice: (deviceId: string) => void;
  setConnectedDevices: (devices: Device[]) => void;
  
  // 会话
  currentSessionId: string | null;
  setCurrentSessionId: (sessionId: string | null) => void;
  
  // 项目
  currentProjectPath: string | null;
  setCurrentProjectPath: (path: string | null) => void;
  
  // 设置
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  
  // API配置
  apiUrl: string;
  apiKey: string;
  setApiConfig: (url: string, key: string) => void;
  
  // 加载状态
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // 错误状态
  error: string | null;
  setError: (error: string | null) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // 视图状态
  currentView: 'chat',
  setView: (view) => set({ currentView: view }),
  
  // 设备信息
  deviceInfo: null,
  loadDeviceInfo: async () => {
    try {
      if (window.mimoAPI) {
        const info = await window.mimoAPI.device.info();
        set({ deviceInfo: info });
      }
    } catch (error) {
      console.error('Failed to load device info:', error);
    }
  },
  
  // 聊天消息
  messages: [],
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  clearMessages: () => set({ messages: [] }),
  
  // 连接设备
  connectedDevices: [],
  addDevice: (device) => set((state) => ({
    connectedDevices: [...state.connectedDevices.filter(d => d.id !== device.id), device]
  })),
  removeDevice: (deviceId) => set((state) => ({
    connectedDevices: state.connectedDevices.filter(d => d.id !== deviceId)
  })),
  setConnectedDevices: (devices) => set({ connectedDevices: devices }),
  
  // 会话
  currentSessionId: null,
  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
  
  // 项目
  currentProjectPath: null,
  setCurrentProjectPath: (path) => set({ currentProjectPath: path }),
  
  // 设置
  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),
  
  // API配置
  apiUrl: process.env.MIMO_API_URL || 'http://localhost:3001',
  apiKey: process.env.MIMO_API_KEY || '',
  setApiConfig: (url, key) => set({ apiUrl: url, apiKey: key }),
  
  // 加载状态
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  // 错误状态
  error: null,
  setError: (error) => set({ error })
}));
