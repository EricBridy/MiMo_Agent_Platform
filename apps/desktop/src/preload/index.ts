/**
 * Preload脚本 - 安全的IPC通信桥梁
 */

import { contextBridge, ipcRenderer } from 'electron';

// 暴露API到渲染进程
contextBridge.exposeInMainWorld('mimoAPI', {
  // 设备信息
  device: {
    info: () => ipcRenderer.invoke('device:info'),
    list: () => ipcRenderer.invoke('device:list'),
    sendMessage: (deviceId: string, message: any) => 
      ipcRenderer.invoke('device:sendMessage', deviceId, message)
  },
  
  // Agent服务
  agent: {
    status: () => ipcRenderer.invoke('agent:status'),
    newChat: () => ipcRenderer.send('agent:new-chat'),
    clearHistory: () => ipcRenderer.send('agent:clear-history')
  },
  
  // 文件操作
  file: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    read: (path: string) => ipcRenderer.invoke('file:read', path),
    write: (path: string, content: string) => ipcRenderer.invoke('file:write', path, content),
    listDir: (path: string) => ipcRenderer.invoke('file:listDir', path),
    delete: (path: string) => ipcRenderer.invoke('file:delete', path),
    rename: (oldPath: string, newPath: string) => ipcRenderer.invoke('file:rename', oldPath, newPath),
    createDir: (path: string) => ipcRenderer.invoke('file:createDir', path)
  },
  
  // 终端
  terminal: {
    execute: (command: string, cwd?: string) => 
      ipcRenderer.invoke('terminal:execute', command, cwd)
  },
  
  // 服务器
  server: {
    url: () => ipcRenderer.invoke('server:url')
  },
  
  // 事件监听
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      'device:discovered',
      'device:connected',
      'device:disconnected',
      'wake:notification',
      'project:opened',
      'open:settings',
      'agent:new-chat',
      'agent:clear-history',
      'file:new',
      'device:connect'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  },
  
  // 移除监听
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

// 类型声明
declare global {
  interface Window {
    mimoAPI: {
      device: {
        info: () => Promise<any>;
        list: () => Promise<any[]>;
        sendMessage: (deviceId: string, message: any) => Promise<void>;
      };
      agent: {
        status: () => Promise<any>;
        newChat: () => void;
        clearHistory: () => void;
      };
      file: {
        openDirectory: () => Promise<string | undefined>;
        read: (path: string) => Promise<string>;
        write: (path: string, content: string) => Promise<boolean>;
        listDir: (path: string) => Promise<any[]>;
        delete: (path: string) => Promise<boolean>;
        rename: (oldPath: string, newPath: string) => Promise<boolean>;
        createDir: (path: string) => Promise<boolean>;
      };
      terminal: {
        execute: (command: string, cwd?: string) => Promise<any>;
      };
      server: {
        url: () => Promise<string>;
      };
      on: (channel: string, callback: (...args: any[]) => void) => void;
      off: (channel: string, callback: (...args: any[]) => void) => void;
    };
  }
}
