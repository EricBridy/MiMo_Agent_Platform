/**
 * Agent服务 - 处理WebSocket连接和Agent请求
 */

import express, { Express, Request, Response } from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
// @ts-ignore
import morgan from 'morgan';
import { AgentEngine, createAgent } from '@mimo/agent';
import { MiMoConnector, MiMoConfig } from '@mimo/mimo-connector';
import { 
  Session, 
  Device, 
  AgentRequest, 
  AgentResponse,
  generateId,
  Tool,
  ToolContext
} from '@mimo/shared';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AgentServerConfig {
  port: number;
  deviceId: string;
  deviceName: string;
}

export class AgentServer {
  private app: Express;
  private httpServer: HttpServer;
  private io: SocketIOServer;
  private config: AgentServerConfig;
  private sessions: Map<string, Session> = new Map();
  private agents: Map<string, AgentEngine> = new Map();
  private running = false;
  private apiConfig: { apiUrl: string; apiKey: string } = {
    apiUrl: process.env.MIMO_API_URL || 'https://api.mimo.com/v1',
    apiKey: process.env.MIMO_API_KEY || ''
  };
  
  constructor(config: AgentServerConfig) {
    this.config = config;
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      pingInterval: 30000,
      pingTimeout: 10000
    });
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }
  
  private setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(morgan('dev'));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }
  
  private setupRoutes() {
    // 健康检查
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        deviceId: this.config.deviceId,
        deviceName: this.config.deviceName,
        uptime: process.uptime()
      });
    });
    
    // 设备信息
    this.app.get('/device', (req: Request, res: Response) => {
      res.json({
        id: this.config.deviceId,
        name: this.config.deviceName,
        platform: process.platform,
        type: 'desktop'
      });
    });
    
    // 创建会话
    this.app.post('/session', async (req: Request, res: Response) => {
      try {
        const session = await this.createSession(req.body);
        res.json({ success: true, data: session });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      }
    });
    
    // 发送消息
    this.app.post('/chat', async (req: Request, res: Response) => {
      try {
        const { sessionId, message } = req.body;
        const agent = this.agents.get(sessionId);
        
        if (!agent) {
          res.status(404).json({
            success: false,
            error: 'Session not found'
          });
          return;
        }
        
        const request: AgentRequest = {
          type: 'chat',
          content: message
        };
        
        const response = await agent.processRequest(request);
        res.json(response);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      }
    });
    
    // 文件操作API
    this.app.get('/files/*', async (req: Request, res: Response) => {
      try {
        const filePath = req.params[0];
        const content = await fs.readFile(filePath, 'utf-8');
        res.json({ success: true, data: content });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      }
    });
    
    this.app.post('/files/*', async (req: Request, res: Response) => {
      try {
        const filePath = req.params[0];
        const { content } = req.body;
        await fs.writeFile(filePath, content, 'utf-8');
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      }
    });
    
    // 终端命令
    this.app.post('/terminal', async (req: Request, res: Response) => {
      try {
        const { command, cwd } = req.body;
        const { stdout, stderr } = await execAsync(command, { cwd });
        res.json({
          success: true,
          stdout,
          stderr
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      }
    });
  }
  
  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);
      
      // 加入房间
      socket.on('join', (data: { deviceId?: string; sessionId?: string }) => {
        if (data.sessionId) {
          socket.join(`session:${data.sessionId}`);
        }
        if (data.deviceId) {
          socket.join(`device:${data.deviceId}`);
        }
      });
      
      // 发送消息
      socket.on('message', async (data: { sessionId: string; content: string }) => {
        try {
          const agent = this.agents.get(data.sessionId);
          if (!agent) {
            socket.emit('error', { message: 'Session not found' });
            return;
          }
          
          const request: AgentRequest = {
            type: 'chat',
            content: data.content
          };
          
          const response = await agent.processRequest(request);
          
          // 发送响应
          socket.emit('message', response);
          
          // 广播到房间
          this.io.to(`session:${data.sessionId}`).emit('message', response);
        } catch (error) {
          socket.emit('error', { message: (error as Error).message });
        }
      });
      
      // 执行工具
      socket.on('tool', async (data: { sessionId: string; toolName: string; params: any }) => {
        try {
          const agent = this.agents.get(data.sessionId);
          if (!agent) {
            socket.emit('error', { message: 'Session not found' });
            return;
          }
          
          const result = await agent.executeTool(data.toolName, data.params);
          socket.emit('tool:result', result);
        } catch (error) {
          socket.emit('error', { message: (error as Error).message });
        }
      });
      
      // 断开连接
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }
  
  private async createSession(data: any): Promise<Session> {
    const sessionId = generateId('session');
    
    const device: Device = {
      id: this.config.deviceId,
      name: this.config.deviceName,
      platform: process.platform as any,
      type: 'desktop',
      status: 'connected',
      lastSeen: new Date(),
      capabilities: {
        canExecuteCommands: true,
        canAccessFilesystem: true,
        canRunGUI: true,
        maxConcurrentSessions: 5
      }
    };
    
    const session: Session = {
      id: sessionId,
      deviceId: device.id,
      userId: data.userId || 'local',
      projectPath: data.projectPath,
      startedAt: new Date(),
      lastActivity: new Date(),
      context: {
        recentFiles: [],
        openTabs: [],
        workspaceState: {}
      }
    };
    
    // 创建Agent实例 - 使用当前API配置
    const mimoConfig: MiMoConfig = {
      apiKey: this.apiConfig.apiKey,
      apiUrl: this.apiConfig.apiUrl
    };
    
    const mimoConnector = new MiMoConnector(mimoConfig);
    const agent = createAgent({
      session,
      device,
      mimoConnector,
      tools: this.getDefaultTools()
    });
    
    this.sessions.set(sessionId, session);
    this.agents.set(sessionId, agent);
    
    return session;
  }
  
  private getDefaultTools(): Tool[] {
    return [
      {
        name: 'read_file',
        description: '读取文件内容',
        parameters: [
          { name: 'path', type: 'string', required: true, description: '文件路径' }
        ],
        returns: { type: 'string', description: '文件内容' },
        handler: async (params, context) => {
          const content = await fs.readFile(params.path as string, 'utf-8');
          return content;
        }
      },
      {
        name: 'write_file',
        description: '写入文件内容',
        parameters: [
          { name: 'path', type: 'string', required: true, description: '文件路径' },
          { name: 'content', type: 'string', required: true, description: '文件内容' }
        ],
        returns: { type: 'boolean', description: '是否成功' },
        handler: async (params, context) => {
          await fs.writeFile(params.path as string, params.content as string, 'utf-8');
          return true;
        }
      },
      {
        name: 'list_directory',
        description: '列出目录内容',
        parameters: [
          { name: 'path', type: 'string', required: true, description: '目录路径' }
        ],
        returns: { type: 'array', description: '目录条目列表' },
        handler: async (params, context) => {
          const entries = await fs.readdir(params.path as string, { withFileTypes: true });
          return entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            path: path.join(params.path as string, entry.name)
          }));
        }
      },
      {
        name: 'execute_command',
        description: '执行终端命令',
        parameters: [
          { name: 'command', type: 'string', required: true, description: '要执行的命令' },
          { name: 'cwd', type: 'string', required: false, description: '工作目录' }
        ],
        returns: { type: 'object', description: '命令执行结果' },
        handler: async (params, context) => {
          try {
            const { stdout, stderr } = await execAsync(params.command as string, {
              cwd: params.cwd as string || context.projectPath
            });
            return { success: true, stdout, stderr };
          } catch (error) {
            return { 
              success: false, 
              error: (error as Error).message,
              stdout: '',
              stderr: ''
            };
          }
        }
      },
      {
        name: 'search_files',
        description: '搜索文件内容',
        parameters: [
          { name: 'query', type: 'string', required: true, description: '搜索关键词' },
          { name: 'path', type: 'string', required: false, description: '搜索路径' }
        ],
        returns: { type: 'array', description: '匹配的文件列表' },
        handler: async (params, context) => {
          // 简化实现，实际应该使用grep或其他搜索工具
          return [];
        }
      }
    ];
  }
  
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.config.port, () => {
        this.running = true;
        console.log(`Agent server listening on port ${this.config.port}`);
        resolve();
      });
    });
  }
  
  stop(): void {
    this.running = false;
    this.io.close();
    this.httpServer.close();
  }
  
  isRunning(): boolean {
    return this.running;
  }
  
  updateApiConfig(apiUrl: string, apiKey: string): void {
    this.apiConfig = { apiUrl, apiKey };
    console.log('API config updated:', { apiUrl, apiKey: apiKey ? '***' : '' });
    // 更新所有现有 Agent 的配置
    this.agents.forEach((agent, sessionId) => {
      // 这里可以添加更新 agent 配置的逻辑
      console.log(`Agent ${sessionId} config will use new API settings on next request`);
    });
  }
  
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }
  
  getAgent(sessionId: string): AgentEngine | undefined {
    return this.agents.get(sessionId);
  }
}
