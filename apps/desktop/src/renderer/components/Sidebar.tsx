/**
 * Sidebar - 专业级侧边导航
 * 参考 Cursor、VS Code 设计风格
 */

import React, { useState } from 'react';
import { ViewType, useStore } from '../store';
import './Sidebar.css';

// SVG Icons
const Icons = {
  logo: (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="url(#logo-gradient)"/>
      <path d="M8 12L12 8L20 16L12 24L8 20L14 14L8 12Z" fill="white"/>
      <path d="M16 8H24V24H16V8Z" fill="white" fillOpacity="0.6"/>
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#6366f1"/>
          <stop offset="1" stopColor="#8b5cf6"/>
        </linearGradient>
      </defs>
    </svg>
  ),
  chat: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  editor: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  devices: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
      <rect x="9" y="9" width="6" height="6"/>
      <line x1="9" y1="1" x2="9" y2="4"/>
      <line x1="15" y1="1" x2="15" y2="4"/>
      <line x1="9" y1="20" x2="9" y2="23"/>
      <line x1="15" y1="20" x2="15" y2="23"/>
      <line x1="20" y1="9" x2="23" y2="9"/>
      <line x1="20" y1="14" x2="23" y2="14"/>
      <line x1="1" y1="9" x2="4" y2="9"/>
      <line x1="1" y1="14" x2="4" y2="14"/>
    </svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  chevronDown: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  desktop: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  mobile: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  )
};

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

interface NavItem {
  id: ViewType;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { deviceInfo, connectedDevices, clearMessages, sessions, currentSessionId, setCurrentSessionId, setShowSettings } = useStore();
  const [showSessions, setShowSessions] = useState(true);

  const navItems: NavItem[] = [
    { id: 'chat', icon: Icons.chat, label: 'AI 对话', shortcut: '⌘1' },
    { id: 'editor', icon: Icons.editor, label: '代码编辑', shortcut: '⌘2' },
    { id: 'devices', icon: Icons.devices, label: '设备管理', shortcut: '⌘3' },
  ];

  const handleNewChat = () => {
    clearMessages();
    onViewChange('chat');
  };

  const handleSessionClick = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    onViewChange('chat');
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const msgDate = new Date(date);
    const diff = now.getTime() - msgDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return msgDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][msgDate.getDay()];
    } else {
      return msgDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">{Icons.logo}</div>
          <span className="logo-text">MiMo</span>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="sidebar-actions">
        <button className="new-chat-btn" onClick={handleNewChat}>
          {Icons.plus}
          <span>新对话</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.shortcut && <span className="nav-shortcut">{item.shortcut}</span>}
          </button>
        ))}
      </nav>

      {/* Sessions History */}
      <div className="sessions-section">
        <button 
          className="sessions-header"
          onClick={() => setShowSessions(!showSessions)}
        >
          <span className={`chevron ${showSessions ? 'expanded' : ''}`}>{Icons.chevronDown}</span>
          <span className="sessions-title">历史对话</span>
        </button>
        
        {showSessions && (
          <div className="sessions-list">
            {sessions.length === 0 ? (
              <div className="sessions-empty">暂无历史对话</div>
            ) : (
              sessions.map(session => (
                <button
                  key={session.id}
                  className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
                  onClick={() => handleSessionClick(session.id)}
                >
                  <span className="session-icon">{Icons.chat}</span>
                  <div className="session-info">
                    <span className="session-title truncate">{session.title}</span>
                    <span className="session-time">{formatTime(session.lastMessageAt)}</span>
                  </div>
                  <span className="session-messages">{session.messageCount}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Device Info */}
        <div className="device-status-card">
          <div className="device-header">
            <div className="device-icon-wrapper">
              {Icons.desktop}
            </div>
            <div className="device-info">
              <span className="device-name truncate">{deviceInfo?.name || '本机'}</span>
              <span className="device-platform">{deviceInfo?.platform || 'Desktop'}</span>
            </div>
            <span className="status-indicator online" title="在线">
              <span className="pulse"></span>
            </span>
          </div>
          
          {connectedDevices.length > 0 && (
            <div className="connected-devices-preview">
              <div className="devices-avatars">
                {connectedDevices.slice(0, 3).map((device, i) => (
                  <div key={device.id} className="device-avatar" style={{ zIndex: 3 - i }}>
                    {device.type === 'mobile' ? Icons.mobile : Icons.desktop}
                  </div>
                ))}
                {connectedDevices.length > 3 && (
                  <div className="device-avatar more">+{connectedDevices.length - 3}</div>
                )}
              </div>
              <span className="devices-count">{connectedDevices.length} 设备已连接</span>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button className="settings-btn" onClick={() => setShowSettings(true)}>
          {Icons.settings}
          <span>设置</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
