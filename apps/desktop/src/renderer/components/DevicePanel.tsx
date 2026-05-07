/**
 * 设备管理面板
 */

import React, { useEffect, useState } from 'react';
import { useStore, Device } from '../store';
import './DevicePanel.css';

const DevicePanel: React.FC = () => {
  const { 
    deviceInfo, 
    connectedDevices, 
    setConnectedDevices,
    addDevice,
    removeDevice
  } = useStore();
  
  const [isDiscovering, setIsDiscovering] = useState(false);
  
  useEffect(() => {
    // 监听设备发现事件
    if (window.mimoAPI) {
      window.mimoAPI.on('device:discovered', (device: Device) => {
        addDevice(device);
      });
      
      window.mimoAPI.on('device:connected', (device: Device) => {
        addDevice(device);
      });
      
      window.mimoAPI.on('device:disconnected', (device: Device) => {
        removeDevice(device.id);
      });
      
      // 获取已连接设备列表
      window.mimoAPI.device.list().then(devices => {
        setConnectedDevices(devices);
      });
    }
  }, []);
  
  const handleRefresh = async () => {
    setIsDiscovering(true);
    try {
      if (window.mimoAPI) {
        const devices = await window.mimoAPI.device.list();
        setConnectedDevices(devices);
      }
    } finally {
      setTimeout(() => setIsDiscovering(false), 1000);
    }
  };
  
  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'win32':
        return '🪟';
      case 'darwin':
        return '🍎';
      case 'linux':
        return '🐧';
      case 'android':
        return '📱';
      case 'ios':
        return '📱';
      default:
        return '💻';
    }
  };
  
  const getDeviceTypeIcon = (type: string) => {
    switch (type) {
      case 'desktop':
        return '🖥️';
      case 'mobile':
        return '📱';
      case 'web':
        return '🌐';
      case 'cli':
        return '⌨️';
      default:
        return '💻';
    }
  };
  
  return (
    <div className="device-panel">
      <div className="panel-header">
        <h2>📱 设备管理</h2>
        <button 
          className={`refresh-btn ${isDiscovering ? 'spinning' : ''}`}
          onClick={handleRefresh}
        >
          🔄
        </button>
      </div>
      
      <div className="device-sections">
        {/* 当前设备 */}
        <section className="device-section current">
          <h3>当前设备</h3>
          <div className="device-card">
            <div className="device-header">
              <span className="device-icon">
                {deviceInfo ? getPlatformIcon(deviceInfo.platform) : '💻'}
              </span>
              <div className="device-info">
                <span className="device-name">
                  {deviceInfo?.name || '未知设备'}
                </span>
                <span className="device-type">
                  {getDeviceTypeIcon('desktop')} 桌面端
                </span>
              </div>
              <span className="status-badge online">在线</span>
            </div>
            <div className="device-details">
              <div className="detail-row">
                <span className="label">平台</span>
                <span className="value">{deviceInfo?.platform || '未知'}</span>
              </div>
              <div className="detail-row">
                <span className="label">设备ID</span>
                <span className="value mono">
                  {deviceInfo?.id?.slice(0, 16) || '---'}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">服务端口</span>
                <span className="value">3001</span>
              </div>
            </div>
          </div>
        </section>
        
        {/* 已连接设备 */}
        <section className="device-section connected">
          <h3>已连接设备 ({connectedDevices.length})</h3>
          
          {connectedDevices.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📡</span>
              <p>暂无已连接的移动设备</p>
              <p className="hint">
                打开移动端App并连接到此桌面端
              </p>
            </div>
          ) : (
            <div className="device-list">
              {connectedDevices.map((device) => (
                <div key={device.id} className="device-card">
                  <div className="device-header">
                    <span className="device-icon">
                      {getPlatformIcon(device.platform)}
                    </span>
                    <div className="device-info">
                      <span className="device-name">{device.name}</span>
                      <span className="device-type">
                        {getDeviceTypeIcon(device.type)} {device.type}
                      </span>
                    </div>
                    <span className={`status-badge ${device.status}`}>
                      {device.status === 'connected' ? '已连接' : '离线'}
                    </span>
                  </div>
                  <div className="device-actions">
                    <button className="action-btn">
                      📤 发送消息
                    </button>
                    <button className="action-btn danger">
                      🔌 断开
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        
        {/* 连接说明 */}
        <section className="device-section help">
          <h3>📖 如何连接</h3>
          <div className="help-content">
            <div className="step">
              <span className="step-num">1</span>
              <div className="step-content">
                <h4>下载移动端App</h4>
                <p>在Android或iOS设备上安装MiMo Agent</p>
              </div>
            </div>
            <div className="step">
              <span className="step-num">2</span>
              <div className="step-content">
                <h4>确保同一网络</h4>
                <p>移动端和桌面端需要在同一局域网中</p>
              </div>
            </div>
            <div className="step">
              <span className="step-num">3</span>
              <div className="step-content">
                <h4>扫码或手动连接</h4>
                <p>在移动端扫描桌面端显示的二维码，或输入设备地址</p>
              </div>
            </div>
            <div className="step">
              <span className="step-num">4</span>
              <div className="step-content">
                <h4>开始使用</h4>
                <p>连接成功后即可从移动端唤醒桌面端进行工作</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DevicePanel;
