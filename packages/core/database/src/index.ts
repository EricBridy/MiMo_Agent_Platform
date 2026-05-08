/**
 * MiMo 数据库服务封装
 * 当前使用内存存储（临时方案）
 */

export { initDatabase, disconnect } from './memory-db';
export { SessionService } from './memory-db';
export { MessageService } from './memory-db';
export { ProjectService } from './memory-db';
export { DeviceService } from './memory-db';

/**
 * 会话（Session）操作
 */
export const SessionService = {
  /**
   * 创建会话
   */
  async create(data: {
    deviceId: string;
    userId?: string;
    projectPath?: string;
    context?: any;
  }) {
    return prisma.session.create({
      data: {
        id: generateId('session'),
        deviceId: data.deviceId,
        userId: data.userId || 'local',
        projectPath: data.projectPath,
        context: data.context ? JSON.stringify(data.context) : undefined,
      }
    });
  },

  /**
   * 获取会话
   */
  async findById(id: string) {
    return prisma.session.findUnique({
      where: { id },
      include: { messages: true }
    });
  },

  /**
   * 获取设备的所有会话
   */
  async findByDeviceId(deviceId: string) {
    return prisma.session.findMany({
      where: { deviceId },
      orderBy: { lastActivity: 'desc' },
      include: { messages: true }
    });
  },

  /**
   * 更新会话
   */
  async update(id: string, data: {
    projectPath?: string;
    context?: any;
    lastActivity?: Date;
  }) {
    return prisma.session.update({
      where: { id },
      data: {
        ...data,
        context: data.context ? JSON.stringify(data.context) : undefined,
        lastActivity: data.lastActivity || new Date()
      }
    });
  },

  /**
   * 删除会话
   */
  async delete(id: string) {
    return prisma.session.delete({
      where: { id }
    });
  },

  /**
   * 更新最后活动时间
   */
  async updateActivity(id: string) {
    return prisma.session.update({
      where: { id },
      data: { lastActivity: new Date() }
    });
  }
};

/**
 * 消息（Message）操作
 */
export const MessageService = {
  /**
   * 创建消息
   */
  async create(data: {
    sessionId: string;
    role: string;
    content: string;
    metadata?: any;
  }) {
    return prisma.message.create({
      data: {
        id: generateId('msg'),
        sessionId: data.sessionId,
        role: data.role,
        content: data.content,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined
      }
    });
  },

  /**
   * 获取会话的所有消息
   */
  async findBySessionId(sessionId: string) {
    return prisma.message.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' }
    });
  },

  /**
   * 删除消息
   */
  async delete(id: string) {
    return prisma.message.delete({
      where: { id }
    });
  },

  /**
   * 清空会话的所有消息
   */
  async deleteBySessionId(sessionId: string) {
    return prisma.message.deleteMany({
      where: { sessionId }
    });
  }
};

/**
 * 项目（Project）操作
 */
export const ProjectService = {
  /**
   * 创建或更新项目
   */
  async upsert(data: {
    name: string;
    path: string;
  }) {
    const existing = await prisma.project.findUnique({
      where: { path: data.path }
    });

    if (existing) {
      return prisma.project.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          lastOpened: new Date()
        }
      });
    }

    return prisma.project.create({
      data: {
        id: generateId('project'),
        name: data.name,
        path: data.path
      }
    });
  },

  /**
   * 获取所有项目
   */
  async findAll() {
    return prisma.project.findMany({
      orderBy: { lastOpened: 'desc' }
    });
  },

  /**
   * 根据路径获取项目
   */
  async findByPath(path: string) {
    return prisma.project.findUnique({
      where: { path },
      include: { files: true }
    });
  },

  /**
   * 删除项目
   */
  async delete(id: string) {
    return prisma.project.delete({
      where: { id }
    });
  }
};

/**
 * 设备（Device）操作
 */
export const DeviceService = {
  /**
   * 注册或更新设备
   */
  async upsert(data: {
    deviceId: string;
    name: string;
    platform: string;
    type: string;
    capabilities?: any;
  }) {
    const existing = await prisma.device.findUnique({
      where: { deviceId: data.deviceId }
    });

    if (existing) {
      return prisma.device.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          platform: data.platform,
          type: data.type,
          status: 'connected',
          lastSeen: new Date(),
          capabilities: data.capabilities ? JSON.stringify(data.capabilities) : undefined
        }
      });
    }

    return prisma.device.create({
      data: {
        id: generateId('device'),
        deviceId: data.deviceId,
        name: data.name,
        platform: data.platform,
        type: data.type,
        capabilities: data.capabilities ? JSON.stringify(data.capabilities) : undefined
      }
    });
  },

  /**
   * 获取所有设备
   */
  async findAll() {
    return prisma.device.findMany({
      orderBy: { lastSeen: 'desc' }
    });
  },

  /**
   * 根据 deviceId 获取设备
   */
  async findByDeviceId(deviceId: string) {
    return prisma.device.findUnique({
      where: { deviceId }
    });
  },

  /**
   * 更新设备状态
   */
  async updateStatus(deviceId: string, status: string) {
    const device = await this.findByDeviceId(deviceId);
    if (!device) return null;

    return prisma.device.update({
      where: { id: device.id },
      data: {
        status,
        lastSeen: new Date()
      }
    });
  },

  /**
   * 删除设备
   */
  async delete(deviceId: string) {
    const device = await this.findByDeviceId(deviceId);
    if (!device) return null;

    return prisma.device.delete({
      where: { id: device.id }
    });
  }
};

/**
 * 关闭数据库连接
 */
export async function disconnect() {
  await prisma.$disconnect();
}

/**
 * 初始化数据库
 */
export async function initDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}
