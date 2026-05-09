/**
 * Gateway Service - 类型定义
 */

// 设备类型
export interface Device {
  id: string;
  name: string;
  platform: 'windows' | 'macos' | 'linux' | 'android' | 'ios';
  type: 'desktop' | 'mobile';
  status: 'online' | 'offline' | 'busy';
  lastSeen: Date;
  capabilities: DeviceCapabilities;
  ipAddress?: string;
  port?: number;
}

export interface DeviceCapabilities {
  canExecuteCommands: boolean;
  canAccessFilesystem: boolean;
  canRunGUI: boolean;
  maxConcurrentSessions: number;
}

// 会话类型
export interface Session {
  id: string;
  deviceId: string;
  userId: string;
  projectPath?: string;
  startedAt: Date;
  lastActivity: Date;
  status: 'active' | 'paused' | 'closed';
  context?: SessionContext;
}

export interface SessionContext {
  recentFiles: string[];
  openTabs: string[];
  workspaceState: Record<string, any>;
}

// 消息类型
export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  model?: string;
  tokens?: number;
  latency?: number;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: Record<string, any>;
  result?: any;
}

// API 请求/响应类型
export interface ChatRequest {
  sessionId: string;
  message: string;
  stream?: boolean;
  context?: Record<string, any>;
}

export interface ChatResponse {
  id: string;
  sessionId: string;
  message: Message;
  usage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// WebSocket 事件类型
export interface WebSocketEvents {
  // 客户端 -> 服务器
  'join': { deviceId?: string; sessionId?: string };
  'leave': { deviceId?: string; sessionId?: string };
  'message': { sessionId: string; content: string };
  'tool': { sessionId: string; toolName: string; params: any };
  'ping': void;
  
  // 服务器 -> 客户端
  'joined': { room: string };
  'left': { room: string };
  'chat:message': ChatResponse;
  'tool:result': { toolCallId: string; result: any; error?: string };
  'error': { message: string; code?: string };
  'pong': { timestamp: number };
}

// 文件操作类型
export interface FileOperation {
  path: string;
  operation: 'read' | 'write' | 'delete' | 'list';
  content?: string;
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: Date;
}

// 终端命令类型
export interface TerminalCommand {
  id: string;
  sessionId: string;
  command: string;
  cwd?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  executedAt: Date;
  completedAt?: Date;
}

// 用户认证类型
export interface User {
  id: string;
  email: string;
  name?: string;
  apiKey: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface AuthToken {
  token: string;
  expiresAt: Date;
  userId: string;
}

// 配置类型
export interface GatewayConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  mimoApi: {
    url: string;
    key: string;
  };
}
