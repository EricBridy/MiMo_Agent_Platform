/**
 * MiMo Agent Platform - 全局类型声明
 */

export interface DeviceInfo {
  id: string;
  name: string;
  platform: string;
  status: string;
}

export interface AgentStatus {
  running: boolean;
  port: number;
}

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

export interface TerminalResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface MimoAPI {
  device: {
    info: () => Promise<DeviceInfo>;
    list: () => Promise<DeviceInfo[]>;
    sendMessage: (deviceId: string, message: any) => Promise<void>;
  };
  agent: {
    status: () => Promise<AgentStatus>;
    newChat: () => void;
    clearHistory: () => void;
  };
  dialog: {
    openDirectory: () => Promise<string | undefined>;
  };
  file: {
    openDirectory: () => Promise<string | undefined>;
    read: (path: string) => Promise<string>;
    write: (path: string, content: string) => Promise<boolean>;
    listDir: (path: string) => Promise<FileEntry[]>;
  };
  terminal: {
    execute: (command: string, cwd?: string) => Promise<TerminalResult>;
  };
  server: {
    url: () => Promise<string>;
  };
  on: (channel: string, callback: (...args: any[]) => void) => void;
  off: (channel: string, callback: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    mimoAPI: MimoAPI;
  }
}

export {};
