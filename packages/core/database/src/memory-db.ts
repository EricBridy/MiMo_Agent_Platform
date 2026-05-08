/**
 * 内存数据库服务（临时方案）
 * 在 npm/Prisma 问题解决前使用内存存储
 */

import { generateId } from '@mimo/shared';

// 内存存储
const sessions = new Map<string, any>();
const messages = new Map<string, any>();
const projects = new Map<string, any>();
const devices = new Map<string, any>();

/**
 * 会话操作
 */
export const SessionService = {
  async create(data: any) {
    const id = generateId('session');
    const session = {
      id,
      ...data,
      startedAt: new Date(),
      lastActivity: new Date(),
      messages: []
    };
    sessions.set(id, session);
    return session;
  },

  async findById(id: string) {
    return sessions.get(id) || null;
  },

  async findByDeviceId(deviceId: string) {
    return Array.from(sessions.values()).filter(s => s.deviceId === deviceId);
  },

  async update(id: string, data: any) {
    const session = sessions.get(id);
    if (!session) throw new Error('Session not found');
    const updated = { ...session, ...data, lastActivity: new Date() };
    sessions.set(id, updated);
    return updated;
  },

  async delete(id: string) {
    sessions.delete(id);
    return { id };
  },

  async updateActivity(id: string) {
    const session = sessions.get(id);
    if (session) {
      session.lastActivity = new Date();
      sessions.set(id, session);
    }
    return session;
  }
};

/**
 * 消息操作
 */
export const MessageService = {
  async create(data: any) {
    const id = generateId('msg');
    const message = {
      id,
      ...data,
      timestamp: new Date()
    };
    messages.set(id, message);
    
    // 关联到会话
    const session = sessions.get(data.sessionId);
    if (session) {
      if (!session.messages) session.messages = [];
      session.messages.push(message);
    }
    
    return message;
  },

  async findBySessionId(sessionId: string) {
    return Array.from(messages.values())
      .filter(m => m.sessionId === sessionId)
      .sort((a, b) => a.timestamp - b.timestamp);
  },

  async delete(id: string) {
    messages.delete(id);
    return { id };
  },

  async deleteBySessionId(sessionId: string) {
    const toDelete = Array.from(messages.values())
      .filter(m => m.sessionId === sessionId)
      .map(m => m.id);
    
    toDelete.forEach(id => messages.delete(id));
    return { count: toDelete.length };
  }
};

/**
 * 项目操作
 */
export const ProjectService = {
  async upsert(data: any) {
    const existing = Array.from(projects.values()).find(p => p.path === data.path);
    
    if (existing) {
      existing.name = data.name;
      existing.lastOpened = new Date();
      return existing;
    }
    
    const project = {
      id: generateId('project'),
      ...data,
      lastOpened: new Date(),
      files: []
    };
    projects.set(project.id, project);
    return project;
  },

  async findAll() {
    return Array.from(projects.values())
      .sort((a, b) => b.lastOpened - a.lastOpened);
  },

  async findByPath(path: string) {
    return Array.from(projects.values()).find(p => p.path === path) || null;
  },

  async delete(id: string) {
    projects.delete(id);
    return { id };
  }
};

/**
 * 设备操作
 */
export const DeviceService = {
  async upsert(data: any) {
    const existing = Array.from(devices.values()).find(d => d.deviceId === data.deviceId);
    
    if (existing) {
      existing.name = data.name;
      existing.platform = data.platform;
      existing.type = data.type;
      existing.status = 'connected';
      existing.lastSeen = new Date();
      return existing;
    }
    
    const device = {
      id: generateId('device'),
      ...data,
      status: 'connected',
      lastSeen: new Date()
    };
    devices.set(device.id, device);
    return device;
  },

  async findAll() {
    return Array.from(devices.values())
      .sort((a, b) => b.lastSeen - a.lastSeen);
  },

  async findByDeviceId(deviceId: string) {
    return Array.from(devices.values()).find(d => d.deviceId === deviceId) || null;
  },

  async updateStatus(deviceId: string, status: string) {
    const device = Array.from(devices.values()).find(d => d.deviceId === deviceId);
    if (device) {
      device.status = status;
      device.lastSeen = new Date();
    }
    return device;
  },

  async delete(deviceId: string) {
    const device = Array.from(devices.values()).find(d => d.deviceId === deviceId);
    if (device) {
      devices.delete(device.id);
    }
    return { deviceId };
  }
};

export async function initDatabase() {
  console.log('✅ Using in-memory database (temporary)');
}

export async function disconnect() {
  console.log('Database disconnected');
}
