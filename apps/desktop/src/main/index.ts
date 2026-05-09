/**
 * MiMo Agent - Electron主进程入口
 */

import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AgentServer } from './server';
import { DeviceBridge } from '@mimo/device-bridge';
import { generateId } from '@mimo/shared';

// 配置文件路径
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

// 默认配置
const defaultConfig = {
  apiUrl: process.env.MIMO_API_URL || 'https://api.mimo.com/v1',
  apiKey: process.env.MIMO_API_KEY || ''
};

// 全局配置对象
let appConfig = { ...defaultConfig };

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let agentServer: AgentServer | null = null;
let deviceBridge: DeviceBridge | null = null;

// 环境变量
const isDev = false; // 强制使用生产模式

class MiMoDesktopApp {
  private deviceId: string;
  private deviceName: string;
  
  constructor() {
    this.deviceId = generateId('device');
    this.deviceName = `MiMo-Agent-${process.env.COMPUTERNAME || process.env.HOST || 'Desktop'}`;
  }
  
  async initialize() {
    // 加载保存的配置
    await this.loadConfig();
    
    // 初始化设备桥接
    this.initializeDeviceBridge();
    
    // 创建主窗口
    await this.createMainWindow();
    
    // 初始化Agent服务
    await this.initializeAgentServer();
    
    // 创建系统托盘
    this.createTray();
    
    // 设置菜单
    this.setupMenu();
  }
  
  private initializeDeviceBridge() {
    deviceBridge = new DeviceBridge({
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      platform: process.platform as any,
      type: 'desktop'
    });
    
    deviceBridge.on('device:discovered', (device) => {
      console.log('Mobile device discovered:', device.name);
      mainWindow?.webContents.send('device:discovered', device);
    });
    
    deviceBridge.on('device:connected', (device) => {
      console.log('Mobile device connected:', device.name);
      mainWindow?.webContents.send('device:connected', device);
    });
    
    deviceBridge.on('device:disconnected', (device) => {
      console.log('Mobile device disconnected:', device.name);
      mainWindow?.webContents.send('device:disconnected', device);
    });
    
    deviceBridge.on('wake:request', (request) => {
      console.log('Wake request from mobile:', request.sourceDevice);
      // 显示唤醒通知
      this.showWakeNotification(request);
    });
    
    deviceBridge.startDiscovery();
  }
  
  private async createMainWindow() {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      title: 'MiMo Agent',
      backgroundColor: '#1a1a2e',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        sandbox: false
      },
      show: false
    });
    
    // 加载应用
    if (isDev) {
      await mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools();
    } else {
      await mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
    }
    
    // 显示窗口
    mainWindow.once('ready-to-show', () => {
      mainWindow?.show();
    });
    
    // 窗口关闭时最小化到托盘
    mainWindow.on('close', (event) => {
      // @ts-ignore
      if (!app.isQuitting) {
        event.preventDefault();
        mainWindow?.hide();
      }
    });
    
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }
  
  private async initializeAgentServer() {
    const port = 3002; // 使用不同端口避免与 Gateway 冲突
    agentServer = new AgentServer({
      port,
      deviceId: this.deviceId,
      deviceName: this.deviceName
    });
    
    // 设置IPC处理器
    this.setupIpcHandlers();
    
    await agentServer.start();
    
    console.log(`Agent server started on port ${port}`);
  }
  
  private createTray() {
    // 创建托盘图标
    const iconPath = isDev
      ? path.join(__dirname, '../../build/icon.png')
      : path.join(process.resourcesPath, 'icon.png');
    
    // 使用默认图标（实际项目应该有图标文件）
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示 MiMo Agent',
        click: () => mainWindow?.show()
      },
      {
        label: '打开项目...',
        click: () => this.openProject()
      },
      { type: 'separator' },
      {
        label: '当前设备',
        enabled: false
      },
      {
        label: `名称: ${this.deviceName}`,
        enabled: false
      },
      {
        label: `ID: ${this.deviceId.slice(0, 8)}...`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: '设置',
        click: () => mainWindow?.webContents.send('open:settings')
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          (app as any).isQuitting = true;
          app.quit();
        }
      }
    ]);
    
    tray.setToolTip('MiMo Agent');
    tray.setContextMenu(contextMenu);
    
    tray.on('double-click', () => {
      mainWindow?.show();
    });
  }
  
  private setupMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: '文件',
        submenu: [
          {
            label: '打开项目...',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.openProject()
          },
          {
            label: '新建文件',
            accelerator: 'CmdOrCtrl+N',
            click: () => mainWindow?.webContents.send('file:new')
          },
          { type: 'separator' },
          {
            label: '设置',
            accelerator: 'CmdOrCtrl+,',
            click: () => mainWindow?.webContents.send('open:settings')
          },
          { type: 'separator' },
          {
            label: '退出',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
            click: () => {
              (app as any).isQuitting = true;
              app.quit();
            }
          }
        ]
      },
      {
        label: '编辑',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' }
        ]
      },
      {
        label: '视图',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      },
      {
        label: 'Agent',
        submenu: [
          {
            label: '开始新对话',
            accelerator: 'CmdOrCtrl+Shift+N',
            click: () => mainWindow?.webContents.send('agent:new-chat')
          },
          {
            label: '清除历史',
            click: () => mainWindow?.webContents.send('agent:clear-history')
          },
          { type: 'separator' },
          {
            label: '连接设备',
            click: () => mainWindow?.webContents.send('device:connect')
          }
        ]
      },
      {
        label: '帮助',
        submenu: [
          {
            label: '关于 MiMo Agent',
            click: () => {
              dialog.showMessageBox({
                type: 'info',
                title: '关于 MiMo Agent',
                message: 'MiMo Agent Platform',
                detail: `版本: 1.0.0\n设备ID: ${this.deviceId}\n设备名称: ${this.deviceName}`
              });
            }
          }
        ]
      }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
  
  private setupIpcHandlers() {
    // 获取设备信息
    ipcMain.handle('device:info', () => ({
      id: this.deviceId,
      name: this.deviceName,
      platform: process.platform,
      status: 'online'
    }));
    
    // 获取Agent服务状态
    ipcMain.handle('agent:status', () => ({
      running: agentServer?.isRunning() || false,
      port: 3001
    }));
    
    // 打开项目文件夹
    ipcMain.handle('dialog:openDirectory', async () => {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory']
      });
      return result.filePaths[0];
    });
    
    // 读取文件
    ipcMain.handle('file:read', async (_, filePath: string) => {
      const fs = await import('fs/promises');
      return fs.readFile(filePath, 'utf-8');
    });
    
    // 写入文件
    ipcMain.handle('file:write', async (_, filePath: string, content: string) => {
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    });
    
    // 列出目录
    ipcMain.handle('file:listDir', async (_, dirPath: string) => {
      const fs = await import('fs/promises');
      const path = await import('path');
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.join(dirPath, entry.name)
      }));
    });
    
    // 删除文件/目录
    ipcMain.handle('file:delete', async (_, filePath: string) => {
      const fs = await import('fs/promises');
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        await fs.rmdir(filePath, { recursive: true });
      } else {
        await fs.unlink(filePath);
      }
      return true;
    });
    
    // 重命名文件/目录
    ipcMain.handle('file:rename', async (_, oldPath: string, newPath: string) => {
      const fs = await import('fs/promises');
      await fs.rename(oldPath, newPath);
      return true;
    });
    
    // 创建目录
    ipcMain.handle('file:createDir', async (_, dirPath: string) => {
      const fs = await import('fs/promises');
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    });
    
    // 执行命令
    ipcMain.handle('terminal:execute', async (_, command: string, cwd: string) => {
      const { exec } = await import('child_process');
      return new Promise((resolve) => {
        exec(command, { cwd }, (error, stdout, stderr) => {
          resolve({
            success: !error,
            stdout,
            stderr,
            error: error?.message
          });
        });
      });
    });
    
    // 获取连接的设备列表
    ipcMain.handle('device:list', () => {
      return deviceBridge?.getConnectedDevices() || [];
    });
    
    // 发送消息到移动端
    ipcMain.handle('device:sendMessage', (_, deviceId: string, message: any) => {
      return deviceBridge?.sendToDevice(deviceId, message);
    });
    
    // 获取服务器URL
    ipcMain.handle('server:url', () => {
      return `http://localhost:3001`;
    });
    
    // 获取配置
    ipcMain.handle('config:get', () => {
      return appConfig;
    });
    
    // 设置配置项
    ipcMain.handle('config:set', async (_, key: string, value: any) => {
      (appConfig as any)[key] = value;
      await this.saveConfig();
      return true;
    });
    
    // 设置API配置
    ipcMain.handle('config:setApiConfig', async (_, url: string, key: string) => {
      appConfig.apiUrl = url;
      appConfig.apiKey = key;
      await this.saveConfig();
      // 更新AgentServer的配置
      agentServer?.updateApiConfig(url, key);
      return true;
    });
  }
  
  private showWakeNotification(request: any) {
    if (mainWindow?.isVisible()) {
      mainWindow.webContents.send('wake:notification', request);
    } else {
      // 系统通知
      const { Notification } = require('electron');
      new Notification({
        title: '唤醒请求',
        body: `${request.sourceDevice} 想要唤醒桌面端`,
        silent: false
      }).show();
    }
  }
  
  private async openProject() {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    });
    
    if (result.filePaths[0]) {
      mainWindow?.webContents.send('project:opened', result.filePaths[0]);
    }
  }
  
  // 加载配置
  private async loadConfig() {
    try {
      const data = await fs.readFile(CONFIG_PATH, 'utf-8');
      const saved = JSON.parse(data);
      appConfig = { ...defaultConfig, ...saved };
      console.log('Config loaded:', appConfig);
    } catch (error) {
      console.log('Using default config');
      appConfig = { ...defaultConfig };
    }
  }
  
  // 保存配置
  private async saveConfig() {
    try {
      await fs.writeFile(CONFIG_PATH, JSON.stringify(appConfig, null, 2), 'utf-8');
      console.log('Config saved');
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }
}

// 启动应用
app.whenReady().then(async () => {
  const desktopApp = new MiMoDesktopApp();
  await desktopApp.initialize();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      desktopApp.initialize();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  (app as any).isQuitting = true;
  agentServer?.stop();
  deviceBridge?.stopDiscovery();
});
