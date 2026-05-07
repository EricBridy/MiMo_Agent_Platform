/**
 * MiMo Agent 核心引擎
 * 参考OpenClaw架构设计，结合Claude Code的交互模式
 */

import {
  AgentMessage,
  AgentRequest,
  AgentResponse,
  Tool,
  ToolContext,
  ToolResult,
  Session,
  Device,
  ToolCall,
  generateId,
  EventEmitter
} from '@mimo/shared';
import { MiMoConnector } from '@mimo/mimo-connector';

export interface AgentConfig {
  session: Session;
  device: Device;
  mimoConnector: MiMoConnector;
  tools: Tool[];
  maxIterations?: number;
  enableToolCalls?: boolean;
}

export interface AgentEvents {
  'message': { message: AgentMessage };
  'tool:call': { call: ToolCall };
  'tool:result': { result: ToolResult };
  'error': { error: Error };
  'complete': { message: AgentMessage };
}

export class AgentEngine extends EventEmitter<AgentEvents> {
  private config: AgentConfig;
  private messageHistory: AgentMessage[] = [];
  private toolCallHistory: ToolCall[] = [];
  
  constructor(config: AgentConfig) {
    super();
    this.config = config;
  }
  
  /**
   * 处理用户请求
   */
  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    try {
      // 构建消息
      const userMessage: AgentMessage = {
        id: generateId('msg'),
        role: 'user',
        content: request.content,
        timestamp: new Date(),
        metadata: {
          model: request.model
        }
      };
      
      this.messageHistory.push(userMessage);
      this.emit('message', { message: userMessage });
      
      // 调用MiMo大模型
      const response = await this.callMiMo(request);
      
      return response;
    } catch (error) {
      const err = error as Error;
      this.emit('error', { error: err });
      
      return {
        success: false,
        error: err.message
      };
    }
  }
  
  /**
   * 调用MiMo大模型
   */
  private async callMiMo(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      // 构建上下文
      const context = this.buildContext(request);
      
      // 调用MiMo API
      const result = await this.config.mimoConnector.chat({
        messages: this.messageHistory.map(m => ({
          role: m.role,
          content: m.content
        })),
        context,
        model: request.model
      });
      
      const duration = Date.now() - startTime;
      
      // 处理响应
      const assistantMessage: AgentMessage = {
        id: generateId('msg'),
        role: 'assistant',
        content: result.content,
        timestamp: new Date(),
        metadata: {
          model: result.model,
          tokens: result.usage?.total_tokens,
          latency: duration
        }
      };
      
      this.messageHistory.push(assistantMessage);
      this.emit('message', { message: assistantMessage });
      
      return {
        success: true,
        message: assistantMessage
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 构建上下文
   */
  private buildContext(request: AgentRequest): Record<string, unknown> {
    return {
      session: {
        id: this.config.session.id,
        projectPath: this.config.session.projectPath
      },
      device: {
        id: this.config.device.id,
        platform: this.config.device.platform,
        capabilities: this.config.device.capabilities
      },
      tools: this.config.tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
      })),
      context: request.context || {}
    };
  }
  
  /**
   * 执行工具调用
   */
  async executeTool(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.config.tools.find(t => t.name === toolName);
    
    if (!tool) {
      return {
        id: generateId('tool'),
        toolName,
        success: false,
        error: `Tool '${toolName}' not found`,
        duration: 0
      };
    }
    
    const toolCall: ToolCall = {
      id: generateId('call'),
      toolName,
      parameters: params,
      startTime: new Date()
    };
    
    this.toolCallHistory.push(toolCall);
    this.emit('tool:call', { call: toolCall });
    
    const startTime = Date.now();
    
    try {
      const context: ToolContext = {
        session: this.config.session,
        device: this.config.device,
        projectPath: this.config.session.projectPath
      };
      
      const result = await tool.handler(params, context);
      
      const duration = Date.now() - startTime;
      
      const toolResult: ToolResult = {
        id: toolCall.id,
        toolName,
        success: true,
        output: result,
        duration
      };
      
      this.emit('tool:result', { result: toolResult });
      
      return toolResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const toolResult: ToolResult = {
        id: toolCall.id,
        toolName,
        success: false,
        error: (error as Error).message,
        duration
      };
      
      this.emit('tool:result', { result: toolResult });
      
      return toolResult;
    }
  }
  
  /**
   * 获取消息历史
   */
  getMessageHistory(): AgentMessage[] {
    return [...this.messageHistory];
  }
  
  /**
   * 清空消息历史
   */
  clearHistory(): void {
    this.messageHistory = [];
  }
  
  /**
   * 压缩历史消息（减少token消耗）
   */
  compactHistory(maxMessages: number = 20): void {
    if (this.messageHistory.length <= maxMessages) return;
    
    // 保留系统消息和最近的消息
    const systemMessages = this.messageHistory.filter(m => m.role === 'system');
    const recentMessages = this.messageHistory.slice(-maxMessages);
    
    this.messageHistory = [
      ...systemMessages,
      {
        id: generateId('msg'),
        role: 'system',
        content: '[Previous conversation was compacted to save tokens]',
        timestamp: new Date()
      },
      ...recentMessages
    ];
  }
  
  /**
   * 获取工具调用历史
   */
  getToolHistory(): ToolCall[] {
    return [...this.toolCallHistory];
  }
}

/**
 * 创建Agent工厂函数
 */
export function createAgent(config: AgentConfig): AgentEngine {
  return new AgentEngine(config);
}
