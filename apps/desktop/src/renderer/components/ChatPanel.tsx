/**
 * 聊天面板组件
 */

import React, { useState, useRef, useEffect } from 'react';
import { useStore, Message } from '../store';
import { io, Socket } from 'socket.io-client';
import './ChatPanel.css';

const ChatPanel: React.FC = () => {
  const { 
    messages, 
    addMessage, 
    clearMessages, 
    currentSessionId,
    setCurrentSessionId,
    currentProjectPath,
    apiUrl
  } = useStore();
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // 初始化WebSocket连接
  useEffect(() => {
    const newSocket = io(apiUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to agent server');
      
      // 加入默认会话
      newSocket.emit('join', { sessionId: currentSessionId || 'default' });
    });
    
    newSocket.on('message', (response) => {
      if (response.success && response.message) {
        addMessage(response.message);
      } else if (response.error) {
        addMessage({
          id: Date.now().toString(),
          role: 'system',
          content: `错误: ${response.error}`,
          timestamp: new Date()
        });
      }
      setIsLoading(false);
    });
    
    newSocket.on('error', (error) => {
      addMessage({
        id: Date.now().toString(),
        role: 'system',
        content: `连接错误: ${error.message}`,
        timestamp: new Date()
      });
      setIsLoading(false);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, [apiUrl]);
  
  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };
    
    addMessage(userMessage);
    setInput('');
    setIsLoading(true);
    
    if (socket) {
      socket.emit('message', {
        sessionId: currentSessionId || 'default',
        content: input.trim()
      });
    } else {
      // 备用：HTTP请求
      try {
        const response = await fetch(`${apiUrl}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId || 'default',
            message: input.trim()
          })
        });
        
        const data = await response.json();
        
        if (data.success && data.message) {
          addMessage(data.message);
        } else {
          addMessage({
            id: (Date.now() + 1).toString(),
            role: 'system',
            content: `错误: ${data.error}`,
            timestamp: new Date()
          });
        }
      } catch (error) {
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'system',
          content: `请求失败: ${(error as Error).message}`,
          timestamp: new Date()
        });
      }
      
      setIsLoading(false);
    }
  };
  
  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // 清空对话
  const handleClear = () => {
    clearMessages();
  };
  
  // 项目信息
  const projectInfo = currentProjectPath ? (
    <div className="project-info">
      <span className="project-icon">📁</span>
      <span className="project-path">{currentProjectPath}</span>
    </div>
  ) : (
    <div className="project-info empty">
      <span className="project-icon">📁</span>
      <span className="project-path">未打开项目</span>
    </div>
  );
  
  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="header-left">
          <h2 className="chat-title">🤖 AI 助手</h2>
          {projectInfo}
        </div>
        <button className="clear-btn" onClick={handleClear} title="清空对话">
          🗑️
        </button>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>开始对话</h3>
            <p>输入消息与MiMo AI助手交流</p>
            <div className="suggestions">
              <button onClick={() => setInput('帮我创建一个React组件')}>
                创建React组件
              </button>
              <button onClick={() => setInput('解释这段代码的作用')}>
                解释代码
              </button>
              <button onClick={() => setInput('帮我找出一个bug')}>
                调试代码
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : msg.role === 'assistant' ? '🤖' : '⚙️'}
              </div>
              <div className="message-content">
                <div className="message-text">
                  {msg.content}
                </div>
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message assistant loading">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="loading-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input">
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter发送, Shift+Enter换行)"
            rows={1}
          />
          <button 
            className="send-btn" 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </div>
        <div className="input-hints">
          <span>按 Enter 发送</span>
          <span>•</span>
          <span>Shift + Enter 换行</span>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
