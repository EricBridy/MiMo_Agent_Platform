import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

export interface CreateSessionData {
  deviceId: string;
  userId?: string;
  projectPath?: string;
  context?: string;
}

export interface CreateMessageData {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export class SessionService {
  // 创建会话
  static async createSession(data: CreateSessionData) {
    try {
      const session = await prisma.session.create({
        data: {
          deviceId: data.deviceId,
          userId: data.userId || 'local',
          projectPath: data.projectPath,
          context: data.context,
        },
      });
      logger.info(`Session created: ${session.id}`);
      return session;
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  // 获取会话列表
  static async getSessions(deviceId?: string) {
    try {
      const where = deviceId ? { deviceId } : {};
      const sessions = await prisma.session.findMany({
        where,
        orderBy: { lastActivity: 'desc' },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      });
      return sessions;
    } catch (error) {
      logger.error('Failed to get sessions:', error);
      throw error;
    }
  }

  // 获取单个会话
  static async getSession(id: string) {
    try {
      const session = await prisma.session.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' },
          },
        },
      });
      return session;
    } catch (error) {
      logger.error('Failed to get session:', error);
      throw error;
    }
  }

  // 更新会话
  static async updateSession(id: string, data: Partial<CreateSessionData>) {
    try {
      const session = await prisma.session.update({
        where: { id },
        data: {
          ...data,
          lastActivity: new Date(),
        },
      });
      logger.info(`Session updated: ${id}`);
      return session;
    } catch (error) {
      logger.error('Failed to update session:', error);
      throw error;
    }
  }

  // 删除会话
  static async deleteSession(id: string) {
    try {
      await prisma.session.delete({
        where: { id },
      });
      logger.info(`Session deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete session:', error);
      throw error;
    }
  }

  // 添加消息
  static async addMessage(data: CreateMessageData) {
    try {
      const message = await prisma.message.create({
        data: {
          sessionId: data.sessionId,
          role: data.role,
          content: data.content,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
      });

      // 更新会话最后活动时间
      await prisma.session.update({
        where: { id: data.sessionId },
        data: { lastActivity: new Date() },
      });

      return message;
    } catch (error) {
      logger.error('Failed to add message:', error);
      throw error;
    }
  }

  // 获取会话消息
  static async getMessages(sessionId: string) {
    try {
      const messages = await prisma.message.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
      });
      return messages;
    } catch (error) {
      logger.error('Failed to get messages:', error);
      throw error;
    }
  }

  // 清理旧会话
  static async cleanupOldSessions(days: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await prisma.session.deleteMany({
        where: {
          lastActivity: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(`Cleaned up ${result.count} old sessions`);
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup old sessions:', error);
      throw error;
    }
  }
}

export default SessionService;
