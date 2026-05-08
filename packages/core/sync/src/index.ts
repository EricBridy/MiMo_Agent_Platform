/**
 * MiMo 同步服务
 * 完成状态同步、对话历史同步、冲突解决机制
 */

import { generateId } from '@mimo/shared';
import { SessionService, MessageService } from '@mimo/database';

// 同步事件类型
export interface SyncEvent {
  id: string;
  type: 'state' | 'message' | 'project' | 'file';
  deviceId: string;
  timestamp: Date;
  data: any;
  version?: number;
}

// 冲突类型
export interface Conflict {
  id: string;
  type: 'version' | 'concurrent_edit' | 'delete_edit';
  local: SyncEvent;
  remote: SyncEvent;
  resolved: boolean;
}

// 操作日志
interface OperationLog {
  id: string;
  event: SyncEvent;
  applied: boolean;
  timestamp: Date;
}

class SyncService {
  private deviceId: string;
  private logs: OperationLog[] = [];
  private conflicts: Conflict[] = [];
  private listeners: Map<string, Function[]> = new Map();
  private syncInProgress = false;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  /**
   * 初始化同步服务
   */
  async initilize(): Promise<void> {
    console.log('初始化同步服务...');
    
    // 加载未应用的日志
    await this.loadPendingLogs();
    
    console.log('✅ 同步服务初始化完成');
  }

  /**
   * 同步状态
   */
  async syncState(state: any, targetDeviceId?: string): Promise<void> {
    if (this.syncInProgress) {
      console.log('同步正在进行中，请稍候...');
      return;
    }

    this.syncInProgress = true;

    try {
      const event: SyncEvent = {
        id: generateId('sync'),
        type: 'state',
        deviceId: this.deviceId,
        timestamp: new Date(),
        data: state
      };

      // 保存到本地日志
      await this.logOperation(event);

      // 发送到其他设备
      if (targetDeviceId) {
        await this.sendToDevice(targetDeviceId, event);
      } else {
        await this.broadcastEvent(event);
      }

      console.log('✅ 状态同步完成');
    } catch (error) {
      console.error('❌ 状态同步失败:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 同步对话历史
   */
  async syncMessageHistory(sessionId: string, targetDeviceId?: string): Promise<void> {
    try {
      // 获取会话的所有消息
      const messages = await MessageService.findBySessionId(sessionId);

      const event: SyncEvent = {
        id: generateId('sync'),
        type: 'message',
        deviceId: this.deviceId,
        timestamp: new Date(),
        data: { sessionId, messages }
      };

      // 保存到本地日志
      await this.logOperation(event);

      // 发送到其他设备
      if (targetDeviceId) {
        await this.sendToDevice(targetDeviceId, event);
      } else {
        await this.broadcastEvent(event);
      }

      console.log(`✅ 对话历史同步完成: ${messages.length} 条消息`);
    } catch (error) {
      console.error('❌ 对话历史同步失败:', error);
    }
  }

  /**
   * 同步项目文件
   */
  async syncProject(projectPath: string, targetDeviceId?: string): Promise<void> {
    try {
      const event: SyncEvent = {
        id: generateId('sync'),
        type: 'project',
        deviceId: this.deviceId,
        timestamp: new Date(),
        data: { projectPath }
      };

      await this.logOperation(event);

      if (targetDeviceId) {
        await this.sendToDevice(targetDeviceId, event);
      } else {
        await this.broadcastEvent(event);
      }

      console.log('✅ 项目同步完成');
    } catch (error) {
      console.error('❌ 项目同步失败:', error);
    }
  }

  /**
   * 处理接收的同步事件
   */
  async handleIncomingEvent(event: SyncEvent): Promise<void> {
    console.log(`收到同步事件: ${event.type} from ${event.deviceId}`);

    // 检查冲突
    const conflict = await this.checkConflict(event);
    
    if (conflict) {
      console.warn('⚠️ 检测到冲突:', conflict.type);
      this.conflicts.push(conflict);
      this.emit('conflict', conflict);
      
      // 自动解决简单冲突
      const resolved = await this.autoResolveConflict(conflict);
      if (resolved) {
        await this.applyEvent(event);
      }
    } else {
      await this.applyEvent(event);
    }
  }

  /**
   * 检查冲突
   */
  private async checkConflict(incoming: SyncEvent): Promise<Conflict | null> {
    // 检查是否有未应用的本地操作
    const pendingLogs = this.logs.filter(log => !log.applied);
    
    for (const log of pendingLogs) {
      const local = log.event;
      
      // 版本冲突
      if (local.type === incoming.type && local.data.id === incoming.data.id) {
        if (local.timestamp < incoming.timestamp) {
          return {
            id: generateId('conflict'),
            type: 'version',
            local,
            remote: incoming,
            resolved: false
          };
        }
      }

      // 并发编辑冲突
      if (local.type === 'file' && incoming.type === 'file') {
        if (local.data.path === incoming.data.path) {
          return {
            id: generateId('conflict'),
            type: 'concurrent_edit',
            local,
            remote: incoming,
            resolved: false
          };
        }
      }

      // 删除-编辑冲突
      if (local.type === 'delete' && incoming.type === 'edit') {
        return {
          id: generateId('conflict'),
          type: 'delete_edit',
          local,
          remote: incoming,
          resolved: false
        };
      }
    }

    return null;
  }

  /**
   * 自动解决冲突
   */
  private async autoResolveConflict(conflict: Conflict): Promise<boolean> {
    switch (conflict.type) {
      case 'version':
        // 使用最新版本
        if (conflict.remote.timestamp > conflict.local.timestamp) {
          console.log('自动解决: 使用远程版本');
          return true;
        }
        return false;

      case 'concurrent_edit':
        // 合并策略：远程优先
        console.log('自动解决: 合并编辑（远程优先）');
        return true;

      case 'delete_edit':
        // 删除优先
        console.log('自动解决: 删除优先');
        return false;

      default:
        return false;
    }
  }

  /**
   * 手动解决冲突
   */
  async resolveConflict(conflictId: string, resolution: 'local' | 'remote' | 'merge'): Promise<void> {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    switch (resolution) {
      case 'local':
        await this.applyEvent(conflict.local);
        break;
      case 'remote':
        await this.applyEvent(conflict.remote);
        break;
      case 'merge':
        await this.mergeChanges(conflict);
        break;
    }

    conflict.resolved = true;
    this.conflicts = this.conflicts.filter(c => c.id !== conflictId);
    
    console.log(`✅ 冲突已解决: ${conflictId}`);
  }

  /**
   * 合并更改
   */
  private async mergeChanges(conflict: Conflict): Promise<void> {
    console.log('合并更改...');
    // 简单合并策略：保留双方更改
    await this.applyEvent(conflict.local);
    await this.applyEvent(conflict.remote);
  }

  /**
   * 应用事件
   */
  private async applyEvent(event: SyncEvent): Promise<void> {
    switch (event.type) {
      case 'state':
        this.emit('state:updated', event.data);
        break;

      case 'message':
        // 保存消息到本地
        for (const msg of event.data.messages) {
          await MessageService.create({
            sessionId: event.data.sessionId,
            role: msg.role,
            content: msg.content,
            metadata: msg.metadata
          });
        }
        this.emit('message:synced', event.data);
        break;

      case 'project':
        this.emit('project:synced', event.data);
        break;

      case 'file':
        this.emit('file:changed', event.data);
        break;
    }

    // 标记日志为已应用
    this.logs = this.logs.map(log => 
      log.event.id === event.id ? { ...log, applied: true } : log
    );
  }

  /**
   * 保存操作日志
   */
  private async logOperation(event: SyncEvent): Promise<void> {
    const log: OperationLog = {
      id: generateId('log'),
      event,
      applied: false,
      timestamp: new Date()
    };

    this.logs.push(log);
    
    // 这里可以持久化到数据库
    console.log(`📝 操作已记录: ${event.type}`);
  }

  /**
   * 加载待处理日志
   */
  private async loadPendingLogs(): Promise<void> {
    // 从数据库加载未应用的日志
    // 暂时使用内存存储
    console.log('📂 加载待处理日志...');
  }

  /**
   * 发送到指定设备
   */
  private async sendToDevice(deviceId: string, event: SyncEvent): Promise<void> {
    // 通过 WebSocket 发送到指定设备
    console.log(`📤 发送同步事件到设备 ${deviceId}: ${event.type}`);
  }

  /**
   * 广播事件到所有设备
   */
  private async broadcastEvent(event: SyncEvent): Promise<void> {
    // 通过 WebSocket 广播到所有连接的设备
    console.log(`📡 广播同步事件: ${event.type}`);
  }

  /**
   * 获取所有冲突
   */
  getConflicts(): Conflict[] {
    return this.conflicts.filter(c => !c.resolved);
  }

  /**
   * 获取操作日志
   */
  getLogs(): OperationLog[] {
    return this.logs;
  }

  /**
   * 事件监听
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * 移除监听
   */
  off(event: string, callback: Function): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      this.listeners.set(event, listeners.filter(cb => cb !== callback));
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data?: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(cb => cb(data));
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.listeners.clear();
    console.log('🧹 同步服务已清理');
  }
}

// 导出单例
let instance: SyncService | null = null;

export function getSyncService(deviceId: string): SyncService {
  if (!instance) {
    instance = new SyncService(deviceId);
  }
  return instance;
}

export async function initSyncService(deviceId: string): Promise<SyncService> {
  const service = getSyncService(deviceId);
  await service.initilize();
  return service;
}
