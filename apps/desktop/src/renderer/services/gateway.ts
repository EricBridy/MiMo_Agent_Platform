/**
 * Gateway API 服务
 * 与后端 Gateway 服务通信
 */

import { useStore } from '../store';

const getApiConfig = () => {
  const state = useStore.getState();
  return {
    baseUrl: state.apiUrl,
    apiKey: state.apiKey
  };
};

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const { baseUrl, apiKey } = getApiConfig();
  
  const response = await fetch(`${baseUrl}${url}`, {
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
  // 创建会话
  create: (data: { deviceId: string; projectPath?: string; context?: string }) =>
    fetchWithAuth('/api/v1/chat/sessions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  // 获取会话列表
  list: (deviceId?: string) =>
    fetchWithAuth(`/api/v1/chat/sessions${deviceId ? `?deviceId=${deviceId}` : ''}`),
  
  // 获取会话详情
  get: (id: string) =>
    fetchWithAuth(`/api/v1/chat/sessions/${id}`),
  
  // 更新会话
  update: (id: string, data: { projectPath?: string; context?: string }) =>
    fetchWithAuth(`/api/v1/chat/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  
  // 删除会话
  delete: (id: string) =>
    fetchWithAuth(`/api/v1/chat/sessions/${id}`, {
      method: 'DELETE'
    }),
  
  // 获取会话消息
  getMessages: (id: string) =>
    fetchWithAuth(`/api/v1/chat/sessions/${id}/messages`)
};

// 聊天 API
export const chatApi = {
  // 发送消息
  send: (data: { sessionId: string; message: string }) =>
    fetchWithAuth('/api/v1/chat/chat', {
      method: 'POST',
      body: JSON.stringify(data)
    })
};

// 设备 API
export const deviceApi = {
  // 注册设备
  register: (data: {
    id: string;
    name: string;
    platform: string;
    type: 'desktop' | 'mobile';
    capabilities?: any;
  }) =>
    fetchWithAuth('/api/v1/devices/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  // 获取设备列表
  list: (params?: { type?: string; status?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>);
    return fetchWithAuth(`/api/v1/devices?${query}`);
  },
  
  // 获取设备详情
  get: (id: string) =>
    fetchWithAuth(`/api/v1/devices/${id}`),
  
  // 更新设备状态
  updateStatus: (id: string, status: string) =>
    fetchWithAuth(`/api/v1/devices/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }),
  
  // 发送心跳
  heartbeat: (id: string) =>
    fetchWithAuth(`/api/v1/devices/${id}/heartbeat`, {
      method: 'POST'
    }),
  
  // 删除设备
  delete: (id: string) =>
    fetchWithAuth(`/api/v1/devices/${id}`, {
      method: 'DELETE'
    })
};

// 项目 API
export const projectApi = {
  // 创建项目
  create: (data: { name: string; path: string }) =>
    fetchWithAuth('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  // 获取项目列表
  list: () =>
    fetchWithAuth('/api/v1/projects'),
  
  // 获取项目详情
  get: (id: string) =>
    fetchWithAuth(`/api/v1/projects/${id}`),
  
  // 更新项目
  update: (id: string, data: { name?: string; path?: string }) =>
    fetchWithAuth(`/api/v1/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  
  // 删除项目
  delete: (id: string) =>
    fetchWithAuth(`/api/v1/projects/${id}`, {
      method: 'DELETE'
    })
};

// 健康检查
export const healthApi = {
  check: () => fetchWithAuth('/health')
};
