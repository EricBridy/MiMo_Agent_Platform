/**
 * Gateway Service - WebSocket 处理器
 */

import { Socket, Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { wsRateLimit } from '../middleware/rate-limit';

// 存储连接的设备
const connectedDevices = new Map<string, Socket>();
const connectedSessions = new Map<string, Set<string>>();

export const setupWebSocketHandlers = (io: SocketIOServer) => {
  io.on('connection', (socket: Socket) => {
    const clientIp = socket.handshake.address;
    
    // 限流检查
    if (!wsRateLimit(clientIp)) {
      logger.warn('WebSocket connection rate limited', { ip: clientIp });
      socket.emit('error', { message: 'Connection rate limited' });
      socket.disconnect();
      return;
    }
    
    logger.info('Client connected', { 
      socketId: socket.id, 
      ip: clientIp,
      userAgent: socket.handshake.headers['user-agent']
    });
    
    // 心跳响应
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
    
    // 加入房间
    socket.on('join', (data: { deviceId?: string; sessionId?: string }) => {
      if (data.deviceId) {
        socket.join(`device:${data.deviceId}`);
        connectedDevices.set(data.deviceId, socket);
        logger.info('Device joined room', { socketId: socket.id, deviceId: data.deviceId });
        socket.emit('joined', { room: `device:${data.deviceId}` });
      }
      
      if (data.sessionId) {
        socket.join(`session:${data.sessionId}`);
        if (!connectedSessions.has(data.sessionId)) {
          connectedSessions.set(data.sessionId, new Set());
        }
        connectedSessions.get(data.sessionId)?.add(socket.id);
        logger.info('Session joined room', { socketId: socket.id, sessionId: data.sessionId });
        socket.emit('joined', { room: `session:${data.sessionId}` });
      }
    });
    
    // 离开房间
    socket.on('leave', (data: { deviceId?: string; sessionId?: string }) => {
      if (data.deviceId) {
        socket.leave(`device:${data.deviceId}`);
        connectedDevices.delete(data.deviceId);
        socket.emit('left', { room: `device:${data.deviceId}` });
      }
      
      if (data.sessionId) {
        socket.leave(`session:${data.sessionId}`);
        connectedSessions.get(data.sessionId)?.delete(socket.id);
        socket.emit('left', { room: `session:${data.sessionId}` });
      }
    });
    
    // 发送消息
    socket.on('message', async (data: { sessionId: string; content: string }) => {
      try {
        logger.info('Message received', { sessionId: data.sessionId, socketId: socket.id });
        
        // 广播到会话房间
        io.to(`session:${data.sessionId}`).emit('message', {
          id: Date.now().toString(),
          sessionId: data.sessionId,
          role: 'user',
          content: data.content,
          timestamp: new Date()
        });
        
        // TODO: 转发到 MiMo API 获取响应
        
      } catch (error) {
        logger.error('Message handling error', { error: (error as Error).message });
        socket.emit('error', { message: 'Failed to process message' });
      }
    });
    
    // 执行工具
    socket.on('tool', async (data: { sessionId: string; toolName: string; params: any }) => {
      try {
        logger.info('Tool execution requested', { 
          sessionId: data.sessionId, 
          toolName: data.toolName 
        });
        
        // 转发到设备执行
        io.to(`session:${data.sessionId}`).emit('tool:request', {
          toolCallId: Date.now().toString(),
          toolName: data.toolName,
          params: data.params
        });
        
      } catch (error) {
        logger.error('Tool execution error', { error: (error as Error).message });
        socket.emit('error', { message: 'Failed to execute tool' });
      }
    });
    
    // 工具执行结果
    socket.on('tool:result', (data: { toolCallId: string; result: any; error?: string }) => {
      // 广播结果到会话
      socket.to(Array.from(socket.rooms)).emit('tool:result', data);
    });
    
    // 断开连接
    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected', { socketId: socket.id, reason });
      
      // 清理连接记录
      for (const [deviceId, deviceSocket] of connectedDevices.entries()) {
        if (deviceSocket.id === socket.id) {
          connectedDevices.delete(deviceId);
          break;
        }
      }
      
      for (const [sessionId, sockets] of connectedSessions.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            connectedSessions.delete(sessionId);
          }
        }
      }
    });
    
    // 错误处理
    socket.on('error', (error) => {
      logger.error('Socket error', { socketId: socket.id, error });
    });
  });
};

export { connectedDevices, connectedSessions };
