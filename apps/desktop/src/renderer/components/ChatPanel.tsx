/**
 * ChatPanel - 专业级 AI 对话界面
 * 参考 Cursor Composer、GitHub Copilot Chat 设计
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore, Message } from '../store';
import { io, Socket } from 'socket.io-client';
import './ChatPanel.css';

// SVG Icons
const Icons = {
  send: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9"/>
    </svg>
  ),
  stop: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2"/>
    </svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  copy: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  regenerate: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  code: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  sparkles: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  ),
  folder: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  more: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1"/>
      <circle cx="19" cy="12" r="1"/>
      <circle cx="5" cy="12" r="1"/>
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  robot: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2"/>
      <circle cx="12" cy="5" r="2"/>
      <path d="M12 7v4"/>
      <line x1="8" y1="16" x2="8" y2="16"/>
      <line x1="16" y1="16" x2="16" y2="16"/>
    </svg>
  )
};

// Quick suggestions
const suggestions = [
  { icon: Icons.code, text: '解释这段代码', prompt: '解释这段代码的作用和实现原理' },
  { icon: Icons.code, text: '优化代码性能', prompt: '帮我优化这段代码的性能' },
  { icon: Icons.code, text: '添加错误处理', prompt: '为这段代码添加错误处理' },
  { icon: Icons.code, text: '生成单元测试', prompt: '为这段代码生成单元测试' },
];

const ChatPanel: React.FC = () => {
  const { 
    messages, 
    addMessage, 
    clearMessages, 
    currentSessionId,
    setCurrentSessionId,
    currentProjectPath,
    apiUrl,
    setShowSettings
  } = useStore();
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      scrollToBottom();
    }
  }, [messages, isLoading, scrollToBottom]);

  // Initialize WebSocket
  useEffect(() => {
    const newSocket = io(apiUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to agent server');
      newSocket.emit('join', { sessionId: currentSessionId || 'default' });
    });
    
    newSocket.on('message', (response) => {
      if (response.success && response.message) {
        addMessage(response.message);
      } else if (response.error) {
        addMessage({
          id: Date.now().toString(),
          role: 'system',
          content: `Error: ${response.error}`,
          timestamp: new Date()
        });
      }
      setIsLoading(false);
    });
    
    newSocket.on('error', (error) => {
      addMessage({
        id: Date.now().toString(),
        role: 'system',
        content: `Connection error: ${error.message}`,
        timestamp: new Date()
      });
      setIsLoading(false);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, [apiUrl, currentSessionId, addMessage]);

  // Send message
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
    }
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Stop generation
  const handleStop = () => {
    setIsLoading(false);
    // TODO: Implement actual stop functionality
  };

  // Copy message
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // Format message content with code blocks
  const formatMessage = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3).trim();
        const firstLine = code.split('\n')[0];
        const language = firstLine && !firstLine.includes(' ') ? firstLine : '';
        const codeContent = language ? code.slice(language.length).trim() : code;
        
        return (
          <div key={index} className="code-block">
            <div className="code-header">
              <span className="code-lang">{language || 'text'}</span>
              <button className="code-copy" onClick={() => handleCopy(codeContent)}>
                {Icons.copy}
                <span>Copy</span>
              </button>
            </div>
            <pre><code>{codeContent}</code></pre>
          </div>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="header-left">
          <div className="header-title">
            {Icons.sparkles}
            <span>MiMo Assistant</span>
          </div>
          {currentProjectPath && (
            <div className="project-badge">
              {Icons.folder}
              <span className="truncate">{currentProjectPath.split('/').pop() || currentProjectPath.split('\\').pop()}</span>
            </div>
          )}
        </div>
        <div className="header-actions">
          {messages.length > 0 && (
            <button className="header-btn" onClick={clearMessages} title="Clear conversation">
              {Icons.trash}
            </button>
          )}
          <button className="header-btn" onClick={() => setShowSettings(true)} title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="chat-messages" 
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon">
              <svg viewBox="0 0 64 64" fill="none">
                <rect width="64" height="64" rx="16" fill="url(#welcome-gradient)"/>
                <path d="M20 26L28 18L44 34L28 50L20 42L32 30L20 26Z" fill="white"/>
                <defs>
                  <linearGradient id="welcome-gradient" x1="0" y1="0" x2="64" y2="64">
                    <stop stopColor="#6366f1"/>
                    <stop offset="1" stopColor="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="welcome-title">MiMo Assistant</h1>
            <p className="welcome-subtitle">Your AI-powered coding companion</p>
            
            <div className="suggestions-grid">
              {suggestions.map((suggestion, index) => (
                <button 
                  key={index} 
                  className="suggestion-card"
                  onClick={() => setInput(suggestion.prompt)}
                >
                  <span className="suggestion-icon">{suggestion.icon}</span>
                  <span className="suggestion-text">{suggestion.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, index) => (
              <div 
                key={msg.id} 
                className={`message ${msg.role} ${index === messages.length - 1 ? 'latest' : ''}`}
              >
                <div className="message-avatar">
                  {msg.role === 'user' ? Icons.user : Icons.robot}
                </div>
                <div className="message-body">
                  <div className="message-header">
                    <span className="message-author">
                      {msg.role === 'user' ? 'You' : 'MiMo'}
                    </span>
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <div className="message-content">
                    {formatMessage(msg.content)}
                  </div>
                  {msg.role === 'assistant' && (
                    <div className="message-actions">
                      <button className="msg-action-btn" onClick={() => handleCopy(msg.content)}>
                        {Icons.copy}
                        <span>Copy</span>
                      </button>
                      <button className="msg-action-btn">
                        {Icons.regenerate}
                        <span>Regenerate</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="message assistant loading">
                <div className="message-avatar">{Icons.robot}</div>
                <div className="message-body">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button className="scroll-bottom-btn" onClick={() => scrollToBottom()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      )}

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask MiMo anything..."
            rows={1}
          />
          <button 
            className={`send-btn ${isLoading ? 'stop' : ''}`}
            onClick={isLoading ? handleStop : handleSend}
            disabled={!isLoading && !input.trim()}
          >
            {isLoading ? Icons.stop : Icons.send}
          </button>
        </div>
        <div className="input-footer">
          <span className="input-hint">
            Press <kbd>Enter</kbd> to send, <kbd>Shift</kbd> + <kbd>Enter</kbd> for new line
          </span>
          <span className="model-badge">GPT-4</span>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
