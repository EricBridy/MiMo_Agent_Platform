/**
 * MiMo Agent - 主应用组件
 * 参考 Cursor、VS Code 等专业 AI 编辑器设计
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from './store';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import EditorPanel from './components/EditorPanel';
import TerminalPanel from './components/TerminalPanel';
import DevicePanel from './components/DevicePanel';
import SettingsModal from './components/SettingsModal';
import './styles/App.css';

function App() {
  const { 
    currentView, 
    setView,
    loadDeviceInfo,
    showSettings,
    setShowSettings,
    isLoading
  } = useStore();
  
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  useEffect(() => {
    // 加载设备信息
    loadDeviceInfo();
    
    // 监听IPC事件
    if (window.mimoAPI) {
      window.mimoAPI.on('open:settings', () => setShowSettings(true));
      window.mimoAPI.on('agent:new-chat', () => setView('chat'));
    }
    
    // 键盘快捷键
    const handleKeydown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + ` 切换终端
      if (e.key === '`' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setTerminalVisible(v => !v);
      }
      // Ctrl/Cmd + B 切换侧边栏
      if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSidebarCollapsed(v => !v);
      }
    };
    
    window.addEventListener('keydown', handleKeydown);
    
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);
  
  const handleViewChange = useCallback((view: 'chat' | 'editor' | 'devices') => {
    setView(view);
  }, [setView]);
  
  return (
    <div className="app">
      <Sidebar 
        currentView={currentView} 
        onViewChange={handleViewChange}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        <div className="content-area">
          {currentView === 'chat' && (
            <div className="view-container chat-view">
              <ChatPanel />
              {terminalVisible && (
                <TerminalPanel onClose={() => setTerminalVisible(false)} />
              )}
            </div>
          )}
          
          {currentView === 'editor' && (
            <div className="view-container">
              <EditorPanel />
            </div>
          )}
          
          {currentView === 'devices' && (
            <div className="view-container">
              <DevicePanel />
            </div>
          )}
        </div>
      </main>
      
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
      
      {isLoading && (
        <div className="global-loading-overlay">
          <div className="loading-spinner" />
          <span>Loading...</span>
        </div>
      )}
    </div>
  );
}

export default App;
