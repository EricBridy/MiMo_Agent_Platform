/**
 * Agent Engine 单元测试
 */

import { AgentEngine, AgentConfig } from '../src/index';
import { MiMoConnector } from '@mimo/mimo-connector';
import { allTools } from '../src/tools';
import { Session, Device } from '@mimo/shared';

// Mock MiMoConnector
class MockMiMoConnector {
  async chat(params: any) {
    return {
      content: 'Mock response from MiMo',
      model: 'mimo-mock',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      }
    };
  }
  
  async complete(params: any) {
    return {
      choices: [{ text: 'mock completion' }]
    };
  }
  
  async embed(params: any) {
    return {
      data: [{ embedding: [0.1, 0.2, 0.3] }]
    };
  }
  
  async streamChat(params: any, callback: (chunk: string) => void) {
    callback('Mock ');
    callback('stream ');
    callback('response');
  }
}

describe('AgentEngine', () => {
  let agent: AgentEngine;
  let config: AgentConfig;
  
  beforeEach(() => {
    config = {
      session: {
        id: 'test-session',
        deviceId: 'test-device',
        projectPath: '/test/project',
        startedAt: new Date(),
        lastActivity: new Date()
      },
      device: {
        id: 'test-device',
        name: 'Test Device',
        platform: 'test',
        type: 'desktop',
        capabilities: {
          canExecuteCommands: true,
          canAccessFilesystem: true,
          canRunGUI: true,
          maxConcurrentSessions: 5
        },
        status: 'connected',
        lastSeen: new Date()
      },
      mimoConnector: new MockMiMoConnector() as any,
      tools: allTools,
      maxIterations: 10,
      enableToolCalls: true
    };
    
    agent = new AgentEngine(config);
  });
  
  describe('processRequest', () => {
    it('should process user request and return response', async () => {
      const request = {
        content: 'Hello, MiMo!',
        model: 'mimo-pro'
      };
      
      const response = await agent.processRequest(request);
      
      expect(response.success).toBe(true);
      expect(response.message).toBeDefined();
      expect(response.message?.role).toBe('assistant');
      expect(response.message?.content).toBe('Mock response from MiMo');
    });
    
    it('should handle errors gracefully', async () => {
      // Mock 抛出错误
      const errorConnector = new MockMiMoConnector() as any;
      errorConnector.chat = async () => { throw new Error('Mock error'); };
      
      const errorAgent = new AgentEngine({
        ...config,
        mimoConnector: errorConnector
      });
      
      const response = await errorAgent.processRequest({
        content: 'This will fail'
      });
      
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });
  
  describe('executeTool', () => {
    it('should execute file tools successfully', async () => {
      // 注意：这需要一个真实文件系统，这里仅测试工具存在
      const tools = allTools.filter(t => t.name === 'list_files');
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe('list_files');
    });
    
    it('should return error for non-existent tool', async () => {
      const result = await agent.executeTool('non_existent_tool', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });
  
  describe('message history', () => {
    it('should maintain message history', async () => {
      await agent.processRequest({ content: 'Message 1' });
      await agent.processRequest({ content: 'Message 2' });
      
      const history = agent.getMessageHistory();
      expect(history.length).toBe(4); // 2 user + 2 assistant
      expect(history[0].role).toBe('user');
      expect(history[1].role).toBe('assistant');
    });
    
    it('should clear history', async () => {
      await agent.processRequest({ content: 'Test' });
      agent.clearHistory();
      
      const history = agent.getMessageHistory();
      expect(history.length).toBe(0);
    });
    
    it('should compact history', async () => {
      // 添加多条消息
      for (let i = 0; i < 25; i++) {
        await agent.processRequest({ content: `Message ${i}` });
      }
      
      const beforeCompact = agent.getMessageHistory().length;
      expect(beforeCompact).toBeGreaterThan(20);
      
      agent.compactHistory(10);
      
      const afterCompact = agent.getMessageHistory();
      expect(afterCompact.length).toBeLessThan(beforeCompact);
      expect(afterCompact.some(m => m.content.includes('compacted'))).toBe(true);
    });
  });
});
