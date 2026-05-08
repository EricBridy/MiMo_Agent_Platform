/**
 * Gateway API 服务 - 移动端
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const getApiConfig = async () => {
  const baseUrl = await AsyncStorage.getItem('serverUrl') || 'http://localhost:3001';
  const apiKey = await AsyncStorage.getItem('apiKey') || '';
  return { baseUrl, apiKey };
};

const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const { baseUrl, apiKey } = await getApiConfig();
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
};

// 会话 API
export const sessionApi = {
  create: (data: { deviceId: string; projectPath?: string }) =>
    fetchWithAuth('/api/v1/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  list: (deviceId?: string) =>
    fetchWithAuth(`/api/v1/chat/sessions${deviceId ? `?deviceId=${deviceId}` : ''}`),
  
  get: (id: string) =>
    fetchWithAuth(`/api/v1/chat/sessions/${id}`),
  
  delete: (id: string) =>
    fetchWithAuth(`/api/v1/chat/sessions/${id}`, { method: 'DELETE' })
};

// 聊天 API
export const chatApi = {
  send: (data: { sessionId: string; message: string }) =>
    fetchWithAuth('/api/v1/chat/chat', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

// 设备 API
export const deviceApi = {
  register: (data: {
    id: string;
    name: string;
    platform: string;
    type: 'desktop' | 'mobile';
  }) =>
    fetchWithAuth('/api/v1/devices/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  list: () =>
    fetchWithAuth('/api/v1/devices'),
  
  heartbeat: (id: string) =>
    fetchWithAuth(`/api/v1/devices/${id}/heartbeat`, { method: 'POST' })
};

// 项目 API
export const projectApi = {
  list: () =>
    fetchWithAuth('/api/v1/projects'),
  
  get: (id: string) =>
    fetchWithAuth(`/api/v1/projects/${id}`)
};

// 健康检查
export const healthApi = {
  check: () => fetchWithAuth('/health')
};
