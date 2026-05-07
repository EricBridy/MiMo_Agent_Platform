/**
 * MiMo Agent - 主应用组件
 */

import React, { useEffect, useState } from 'react';
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
    setShowSettings
  } = useStore();
  
  const [terminalVisible, setTerminalVisible] = useState(false);
  
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
      if (e.key === '`' && e.ctrlKey) {
        e.preventDefault();
        setTerminalVisible(v => !v);
      }
    };
    
    window.addEventListener('keydown', handleKeydown);
    
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);
  
  return (
    <div className="app">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setView}
      />
      
      <main className="main-content">
        {currentView === 'chat' && (
          <div className="content-wrapper">
            <ChatPanel />
            {terminalVisible && (
              <TerminalPanel onClose={() => setTerminalVisible(false)} />
            )}
          </div>
        )}
        
        {currentView === 'editor' && <EditorPanel />}
        
        {currentView === 'devices' && <DevicePanel />}
      </main>
      
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

export default App;
