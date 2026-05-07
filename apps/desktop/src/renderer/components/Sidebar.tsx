/**
 * 侧边栏组件
 */

import React from 'react';
import { ViewType, useStore } from '../store';
import './Sidebar.css';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { deviceInfo, connectedDevices, clearMessages } = useStore();
  
  const views: { id: ViewType; icon: string; label: string }[] = [
    { id: 'chat', icon: '💬', label: 'AI对话' },
    { id: 'editor', icon: '📝', label: '代码编辑' },
    { id: 'devices', icon: '📱', label: '设备管理' }
  ];
  
  const handleNewChat = () => {
    clearMessages();
    onViewChange('chat');
  };
  
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🤖</span>
          <span className="logo-text">MiMo Agent</span>
        </div>
      </div>
      
      <div className="sidebar-actions">
        <button className="action-btn primary" onClick={handleNewChat}>
          <span>➕</span>
          <span>新对话</span>
        </button>
      </div>
      
      <nav className="sidebar-nav">
        {views.map(view => (
          <button
            key={view.id}
            className={`nav-item ${currentView === view.id ? 'active' : ''}`}
            onClick={() => onViewChange(view.id)}
          >
            <span className="nav-icon">{view.icon}</span>
            <span className="nav-label">{view.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <div className="device-info">
          <div className="device-status">
            <span className="status-dot online"></span>
            <span className="device-name">{deviceInfo?.name || '未连接'}</span>
          </div>
          <div className="device-meta">
            <span className="platform">{deviceInfo?.platform || 'Unknown'}</span>
            <span className="divider">•</span>
            <span className="device-id">{deviceInfo?.id?.slice(0, 8) || '---'}...</span>
          </div>
        </div>
        
        <div className="connected-devices">
          <span className="label">已连接设备:</span>
          <span className="count">{connectedDevices.length}</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
