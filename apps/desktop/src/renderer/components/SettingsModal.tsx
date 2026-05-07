/**
 * 设置模态框
 */

import React, { useState } from 'react';
import { useStore } from '../store';
import './SettingsModal.css';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { apiUrl, apiKey, setApiConfig, deviceInfo } = useStore();
  const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  
  const handleSave = () => {
    setApiConfig(localApiUrl, localApiKey);
    onClose();
  };
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal">
        <div className="modal-header">
          <h2>⚙️ 设置</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {/* MiMo API设置 */}
          <section className="settings-section">
            <h3>🤖 MiMo API</h3>
            
            <div className="form-group">
              <label>API 地址</label>
              <input
                type="text"
                value={localApiUrl}
                onChange={(e) => setLocalApiUrl(e.target.value)}
                placeholder="https://api.mimo.com/v1"
              />
              <span className="hint">MiMo大模型API的服务地址</span>
            </div>
            
            <div className="form-group">
              <label>API Key</label>
              <input
                type="password"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder="输入您的API Key"
              />
              <span className="hint">您的MiMo API密钥</span>
            </div>
          </section>
          
          {/* 设备信息 */}
          <section className="settings-section">
            <h3>📱 设备信息</h3>
            
            <div className="info-row">
              <span className="label">设备名称</span>
              <span className="value">{deviceInfo?.name || '未知'}</span>
            </div>
            
            <div className="info-row">
              <span className="label">设备ID</span>
              <span className="value mono">{deviceInfo?.id || '未知'}</span>
            </div>
            
            <div className="info-row">
              <span className="label">平台</span>
              <span className="value">{deviceInfo?.platform || '未知'}</span>
            </div>
          </section>
          
          {/* 服务设置 */}
          <section className="settings-section">
            <h3>🖥️ 本地服务</h3>
            
            <div className="info-row">
              <span className="label">服务端口</span>
              <span className="value">3001</span>
            </div>
            
            <div className="info-row">
              <span className="label">状态</span>
              <span className="value status online">运行中</span>
            </div>
          </section>
        </div>
        
        <div className="modal-footer">
          <button className="btn secondary" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
