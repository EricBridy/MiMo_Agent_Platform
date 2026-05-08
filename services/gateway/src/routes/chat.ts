/**
 * Gateway Service - 聊天路由 (使用数据库持久化)
 */

import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/error-handler';
import { apiKeyAuth } from '../middleware/auth';
import { standardRateLimit } from '../middleware/rate-limit';
import { logger } from '../utils/logger';
import SessionService from '../services/session.service';

const router = Router();

// 创建会话
router.post('/sessions', apiKeyAuth, standardRateLimit, asyncHandler(async (req, res) => {
  const { deviceId, projectPath, context } = req.body;
  
  if (!deviceId) {
    throw new ApiError(400, 'deviceId is required');
  }
  
  const session = await SessionService.createSession({
    deviceId,
    projectPath,
    context,
  });
  
  logger.info('Session created', { sessionId: session.id, deviceId });
  
  res.status(201).json({
    success: true,
    data: session
  });
}));

// 获取会话列表
router.get('/sessions', apiKeyAuth, asyncHandler(async (req, res) => {
  const { deviceId } = req.query;
  
  const sessions = await SessionService.getSessions(deviceId as string);
  
  res.json({
    success: true,
    data: sessions
  });
}));

// 获取单个会话
router.get('/sessions/:id', apiKeyAuth, asyncHandler(async (req, res) => {
  const session = await SessionService.getSession(req.params.id);
  
  if (!session) {
    throw new ApiError(404, 'Session not found');
  }
  
  res.json({
    success: true,
    data: session
  });
}));

// 更新会话
router.patch('/sessions/:id', apiKeyAuth, asyncHandler(async (req, res) => {
  const { projectPath, context } = req.body;
  
  const session = await SessionService.updateSession(req.params.id, {
    projectPath,
    context,
  });
  
  res.json({
    success: true,
    data: session
  });
}));

// 删除会话
router.delete('/sessions/:id', apiKeyAuth, asyncHandler(async (req, res) => {
  await SessionService.deleteSession(req.params.id);
  
  logger.info('Session deleted', { sessionId: req.params.id });
  
  res.json({
    success: true,
    message: 'Session deleted'
  });
}));

// 发送消息
router.post('/chat', apiKeyAuth, standardRateLimit, asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
  
  if (!sessionId || !message) {
    throw new ApiError(400, 'sessionId and message are required');
  }
  
  // 检查会话是否存在
  const session = await SessionService.getSession(sessionId);
  if (!session) {
    throw new ApiError(404, 'Session not found');
  }
  
  // 保存用户消息
  const userMessage = await SessionService.addMessage({
    sessionId,
    role: 'user',
    content: message,
  });
  
  // 调用 MiMo API
  const mimoApiUrl = process.env.MIMO_API_URL || 'http://localhost:3002';
  
  try {
    const response = await fetch(`${mimoApiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }]
      })
    });
    
    const data = await response.json();
    
    // 保存 AI 响应
    const assistantMessage = await SessionService.addMessage({
      sessionId,
      role: 'assistant',
      content: data.choices[0].message.content,
      metadata: { model: data.model || 'mimo-mock' },
    });
    
    res.json({
      success: true,
      data: { 
        userMessage,
        assistantMessage 
      }
    });
    
  } catch (error) {
    logger.error('Failed to call MiMo API', { error });
    throw new ApiError(502, 'Failed to get response from AI service');
  }
}));

// 获取会话消息
router.get('/sessions/:id/messages', apiKeyAuth, asyncHandler(async (req, res) => {
  const messages = await SessionService.getMessages(req.params.id);
  
  res.json({
    success: true,
    data: messages
  });
}));

export default router;
