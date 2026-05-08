/**
 * DevicePanel - 现代化设备管理界面
 * 参考 Cursor、VS Code 设备管理设计
 */

import React, { useEffect, useState } from 'react';
import { useStore, Device } from '../store';
import './DevicePanel.css';

// SVG Icons
const Icons = {
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  desktop: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  mobile: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  ),
  web: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  terminal: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5"/>
      <line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  ),
  wifi: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  send: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9"/>
    </svg>
  ),
  disconnect: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
      <line x1="12" y1="2" x2="12" y2="12"/>
    </svg>
  ),
  qrcode: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  windows: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
    </svg>
  ),
  apple: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  ),
  linux: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489.117.779.437 1.535.964 2.161.527.626 1.227 1.088 2.032 1.337.805.249 1.693.278 2.549.083.856-.195 1.67-.59 2.353-1.146.683-.556 1.23-1.27 1.582-2.073.352-.803.508-1.69.455-2.566-.053-.876-.314-1.727-.762-2.484-.448-.757-1.08-1.401-1.836-1.87-.756-.469-1.62-.758-2.514-.838-.894-.08-1.8.05-2.634.378-.834.328-1.582.852-2.166 1.52-.584.668-.995 1.478-1.19 2.356-.195.878-.168 1.796.078 2.66.246.864.696 1.654 1.306 2.29.61.636 1.37 1.105 2.206 1.36.836.255 1.73.29 2.582.1.852-.19 1.654-.582 2.334-1.138.68-.556 1.224-1.27 1.572-2.073.348-.803.5-1.69.444-2.566-.056-.876-.32-1.727-.77-2.484-.45-.757-1.084-1.401-1.842-1.87-.758-.469-1.624-.758-2.52-.838-.896-.08-1.804.05-2.64.378-.836.328-1.586.852-2.172 1.52-.586.668-.998 1.478-1.194 2.356-.196.878-.17 1.796.076 2.66.246.864.698 1.654 1.31 2.29.612.636 1.374 1.105 2.212 1.36.838.255 1.734.29 2.588.1.854-.19 1.658-.582 2.34-1.138.682-.556 1.228-1.27 1.578-2.073.35-.803.504-1.69.45-2.566-.054-.876-.318-1.727-.768-2.484-.45-.757-1.086-1.401-1.846-1.87-.76-.469-1.628-.758-2.526-.838-.898-.08-1.808.05-2.646.378-.838.328-1.59.852-2.178 1.52-.588.668-1 1.478-1.196 2.356-.196.878-.172 1.796.074 2.66.246.864.7 1.654 1.314 2.29.614.636 1.378 1.105 2.218 1.36.84.255 1.738.29 2.594.1.856-.19 1.662-.582 2.346-1.138.684-.556 1.232-1.27 1.584-2.073z"/>
    </svg>
  ),
  android: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0225 3.503C15.5902 8.4797 13.8533 8.1998 12 8.1998c-1.8533 0-3.5902.28-5.1367.7732L4.8408 5.4699a.416.416 0 00-.5676-.1521.4156.4156 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589.3432 18.6617h23.3136c0-4.0028-2.3457-7.475-5.7755-9.3403"/>
    </svg>
  ),
  ios: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.65 1.2c-.9-.9-2.2-1.2-3.4-.9-1.2.3-2.2 1.1-2.8 2.2-.6 1.1-.6 2.4-.1 3.5.5 1.1 1.5 1.9 2.7 2.2 1.2.3 2.5 0 3.4-.9.9-.9 1.2-2.2.9-3.4-.3-1.2-1.1-2.2-2.2-2.8-.5-.3-1.1-.5-1.7-.5s-1.2.2-1.7.5c-1.1.6-1.9 1.6-2.2 2.8-.3 1.2 0 2.5.9 3.4.9.9 2.2 1.2 3.4.9 1.2-.3 2.2-1.1 2.8-2.2.6-1.1.6-2.4.1-3.5-.5-1.1-1.5-1.9-2.7-2.2-.6-.1-1.2-.1-1.8 0z"/>
    </svg>
  )
};

const DevicePanel: React.FC = () => {
  const { 
    deviceInfo, 
    connectedDevices, 
    setConnectedDevices,
    addDevice,
    removeDevice
  } = useStore();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
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
      
      window.mimoAPI.device.list().then(devices => {
        setConnectedDevices(devices);
      });
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (window.mimoAPI) {
        const devices = await window.mimoAPI.device.list();
        setConnectedDevices(devices);
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'win32': return Icons.windows;
      case 'darwin': return Icons.apple;
      case 'linux': return Icons.linux;
      case 'android': return Icons.android;
      case 'ios': return Icons.ios;
      default: return Icons.desktop;
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return Icons.mobile;
      case 'web': return Icons.web;
      case 'cli': return Icons.terminal;
      default: return Icons.desktop;
    }
  };

  const connectionSteps = [
    {
      icon: Icons.mobile,
      title: '下载移动端 App',
      description: '在 iOS 或 Android 设备上安装 MiMo Agent 应用'
    },
    {
      icon: Icons.wifi,
      title: '连接同一网络',
      description: '确保移动设备和电脑连接到同一个 Wi-Fi 网络'
    },
    {
      icon: Icons.qrcode,
      title: '扫描二维码',
      description: '在移动端点击"连接桌面端"并扫描下方的二维码'
    },
    {
      icon: Icons.check,
      title: '开始协作',
      description: '连接成功后即可在不同设备间同步工作'
    }
  ];

  return (
    <div className="device-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-content">
          <h1 className="panel-title">
            <span className="title-icon">{Icons.devices}</span>
            设备管理
          </h1>
          <p className="panel-subtitle">管理您的设备和跨设备协作</p>
        </div>
        <button 
          className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
          onClick={handleRefresh}
          title="刷新设备列表"
        >
          {Icons.refresh}
        </button>
      </div>

      {/* Content */}
      <div className="panel-content">
        {/* Current Device Card */}
        <section className="section">
          <h2 className="section-title">当前设备</h2>
          <div className="current-device-card">
            <div className="device-main">
              <div className="device-icon-large">
                {getPlatformIcon(deviceInfo?.platform || 'desktop')}
              </div>
              <div className="device-details">
                <div className="device-name-row">
                  <h3 className="device-name">{deviceInfo?.name || '本机'}</h3>
                  <span className="status-badge online">
                    <span className="status-dot"></span>
                    在线
                  </span>
                </div>
                <p className="device-type">桌面端 • {deviceInfo?.platform || 'Unknown'}</p>
              </div>
            </div>
            <div className="device-meta-grid">
              <div className="meta-item">
                <span className="meta-label">设备 ID</span>
                <code className="meta-value">{deviceInfo?.id?.slice(0, 16) || '---'}</code>
              </div>
              <div className="meta-item">
                <span className="meta-label">服务端口</span>
                <span className="meta-value">3001</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">连接状态</span>
                <span className="meta-value success">已就绪</span>
              </div>
            </div>
          </div>
        </section>

        {/* Connected Devices */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">已连接设备</h2>
            <span className="device-count">{connectedDevices.length}</span>
          </div>
          
          {connectedDevices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">{Icons.devices}</div>
              <h3>暂无连接设备</h3>
              <p>按照下方步骤连接您的移动设备</p>
            </div>
          ) : (
            <div className="devices-grid">
              {connectedDevices.map((device) => (
                <div key={device.id} className="device-card">
                  <div className="device-card-header">
                    <div className="device-icon-wrapper">
                      {getPlatformIcon(device.platform)}
                    </div>
                    <div className="device-card-info">
                      <h4 className="device-card-name">{device.name}</h4>
                      <span className="device-card-type">{device.type}</span>
                    </div>
                    <span className={`status-badge ${device.status}`}>
                      <span className="status-dot"></span>
                      {device.status === 'connected' ? '已连接' : '离线'}
                    </span>
                  </div>
                  <div className="device-card-actions">
                    <button className="action-btn primary">
                      {Icons.send}
                      <span>发送</span>
                    </button>
                    <button className="action-btn danger">
                      {Icons.disconnect}
                      <span>断开</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Connection Guide */}
        <section className="section">
          <h2 className="section-title">连接指南</h2>
          <div className="guide-grid">
            {connectionSteps.map((step, index) => (
              <div key={index} className="guide-card">
                <div className="guide-step-num">{index + 1}</div>
                <div className="guide-icon">{step.icon}</div>
                <h4 className="guide-title">{step.title}</h4>
                <p className="guide-description">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* QR Code Section */}
        <section className="section">
          <div className="qrcode-section">
            <div className="qrcode-info">
              <h3 className="qrcode-title">快速连接</h3>
              <p className="qrcode-description">
                在移动端 MiMo App 中扫描二维码即可快速连接到此桌面端
              </p>
              <button 
                className="toggle-qrcode-btn"
                onClick={() => setShowQRCode(!showQRCode)}
              >
                {showQRCode ? '隐藏二维码' : '显示二维码'}
              </button>
            </div>
            {showQRCode && (
              <div className="qrcode-display">
                <div className="qrcode-placeholder">
                  {Icons.qrcode}
                  <span>QR Code</span>
                </div>
                <p className="qrcode-hint">扫描以连接</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DevicePanel;
