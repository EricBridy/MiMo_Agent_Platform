/**
 * MiMo Agent Platform - 共享类型定义
 */

// ============ 通用类型 ============

export type Platform = 'windows' | 'linux' | 'macos' | 'android' | 'ios' | 'web';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export type DeviceType = 'desktop' | 'mobile' | 'web' | 'cli';

// ============ 设备相关类型 ============

export interface Device {
  id: string;
  name: string;
  platform: Platform;
  type: DeviceType;
  status: ConnectionStatus;
  lastSeen: Date;
  capabilities: DeviceCapabilities;
  address?: string;
  port?: number;
}

export interface DeviceCapabilities {
  canExecuteCommands: boolean;
  canAccessFilesystem: boolean;
  canRunGUI: boolean;
  maxConcurrentSessions: number;
}

export interface DeviceDiscovery {
  type: 'mdns' | 'manual' | 'push';
  serviceName?: string;
  ipAddress?: string;
  port?: number;
}

// ============ 会话相关类型 ============

export interface Session {
  id: string;
  deviceId: string;
  userId: string;
  projectPath?: string;
  startedAt: Date;
  lastActivity: Date;
  context: SessionContext;
}

export interface SessionContext {
  recentFiles: string[];
  currentFile?: string;
  openTabs: string[];
  workspaceState: Record<string, unknown>;
}

// ============ Agent相关类型 ============

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  model?: string;
  tokens?: number;
  latency?: number;
}

export interface AgentRequest {
  type: 'chat' | 'task' | 'code' | 'search';
  content: string;
  context?: Record<string, unknown>;
  tools?: string[];
  model?: string;
}

export interface AgentResponse {
  success: boolean;
  message?: AgentMessage;
  error?: string;
  suggestions?: string[];
}

// ============ 工具系统类型 ============

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  returns: ToolReturnType;
  permission?: ToolPermission;
  handler: ToolHandler;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  required: boolean;
  default?: unknown;
}

export interface ToolReturnType {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'void';
  description?: string;
}

export interface ToolPermission {
  requireApproval: boolean;
  allowedRoles?: string[];
  timeout?: number;
}

export interface ToolHandler {
  (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult | any>;
}

export interface ToolContext {
  session: Session;
  device: Device;
  projectPath?: string;
}

export interface ToolCall {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
  startTime: Date;
}

export interface ToolResult {
  id: string;
  toolName: string;
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
}

// ============ 项目相关类型 ============

export interface Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  lastOpened: Date;
  devices: string[];
}

export interface FileOperation {
  path: string;
  operation: 'read' | 'write' | 'delete' | 'create' | 'rename';
  content?: string;
  encoding?: string;
}

export interface CodeSearch {
  query: string;
  files?: string[];
  regex?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

// ============ 唤醒相关类型 ============

export interface WakeRequest {
  deviceId: string;
  sourceDevice: string;
  purpose: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface WakeResponse {
  success: boolean;
  sessionId?: string;
  connectionUrl?: string;
  error?: string;
}

// ============ 同步相关类型 ============

export interface SyncState {
  projectId: string;
  lastSyncTime: Date;
  pendingChanges: SyncChange[];
  deviceStates: Record<string, DeviceState>;
}

export interface SyncChange {
  id: string;
  type: 'file' | 'setting' | 'session' | 'message';
  operation: 'create' | 'update' | 'delete';
  path: string;
  content?: unknown;
  timestamp: Date;
  deviceId: string;
}

export interface DeviceState {
  deviceId: string;
  currentFile?: string;
  openTabs: string[];
  cursorPosition?: CursorPosition;
}

export interface CursorPosition {
  file: string;
  line: number;
  column: number;
}

// ============ 事件相关类型 ============

export interface AgentEvent {
  type: EventType;
  payload: unknown;
  timestamp: Date;
  deviceId?: string;
}

export type EventType =
  | 'device:connected'
  | 'device:disconnected'
  | 'session:started'
  | 'session:ended'
  | 'tool:called'
  | 'tool:completed'
  | 'message:received'
  | 'message:sent'
  | 'sync:started'
  | 'sync:completed'
  | 'wake:requested'
  | 'wake:completed'
  | 'error';

// ============ 配置相关类型 ============

export interface AppConfig {
  server: ServerConfig;
  mimo: MiMoConfig;
  security: SecurityConfig;
  sync: SyncConfig;
}

export interface ServerConfig {
  port: number;
  host: string;
  wsPingInterval: number;
  wsPingTimeout: number;
}

export interface MiMoConfig {
  apiKey: string;
  apiUrl: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface SecurityConfig {
  jwtSecret: string;
  apiSecret: string;
  enableTLS?: boolean;
}

export interface SyncConfig {
  enableAutoSync: boolean;
  syncInterval: number;
  maxRetries: number;
}

// ============ API相关类型 ============

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
