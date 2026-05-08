/**
 * Gateway Service - 聊天路由
 */

import { Router } from 'express';
import { asyncHandler, ApiError } from '../middleware/error-handler';
import { apiKeyAuth } from '../middleware/auth';
import { standardRateLimit } from '../middleware/rate-limit';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const sessions = new Map<string, any>();
const messages = new Map<string, any[]>();

// 创建会话
router.post('/sessions', apiKeyAuth, standardRateLimit, asyncHandler(async (req, res) => {
  const { deviceId, projectPath } = req.body;
  
  if (!deviceId) {
    throw new ApiError(400, 'deviceId is required');
  }
  
  const sessionId = uuidv4();
  const session = {
    id: sessionId,
    deviceId,
    projectPath,
    startedAt: new Date(),
    lastActivity: new Date(),
    status: 'active'
  };
  
  sessions.set(sessionId, session);
  messages.set(sessionId, []);
  
  logger.info('Session created', { sessionId, deviceId });
  
  res.status(201).json({
    success: true,
    data: session
  });
}));

// 获取会话列表
router.get('/sessions', apiKeyAuth, asyncHandler(async (req, res) => {
  const { deviceId } = req.query;
  let sessionList = Array.from(sessions.values());
  
  if (deviceId) {
    sessionList = sessionList.filter(s => s.deviceId === deviceId);
  }
  
  res.json({
    success: true,
    data: sessionList
  });
}));

// 发送消息
router.post('/chat', apiKeyAuth, standardRateLimit, asyncHandler(async (req, res) => {
  const { sessionId, message } = req.body;
  
  if (!sessionId || !message) {
    throw new ApiError(400, 'sessionId and message are required');
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    throw new ApiError(404, 'Session not found');
  }
  
  session.lastActivity = new Date();
  
  const userMessage = {
    id: uuidv4(),
    sessionId,
    role: 'user',
    content: message,
    timestamp: new Date()
  };
  
  const sessionMessages = messages.get(sessionId) || [];
  sessionMessages.push(userMessage);
  
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
    
    const assistantMessage = {
      id: uuidv4(),
      sessionId,
      role: 'assistant',
      content: data.choices[0].message.content,
      timestamp: new Date()
    };
    
    sessionMessages.push(assistantMessage);
    messages.set(sessionId, sessionMessages);
    
    res.json({
      success: true,
      data: { message: assistantMessage }
    });
    
  } catch (error) {
    logger.error('Failed to call MiMo API', { error });
    throw new ApiError(502, 'Failed to get response from AI service');
  }
}));

export default router;
