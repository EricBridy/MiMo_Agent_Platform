/**
 * 工具权限管理单元测试
 */

import { ToolPermissionManager } from '../../src/tools/permission';

describe('ToolPermissionManager', () => {
  let manager: ToolPermissionManager;
  
  beforeEach(() => {
    manager = new ToolPermissionManager();
  });
  
  describe('isToolAllowed', () => {
    it('should allow tools by default', () => {
      expect(manager.isToolAllowed('read_file')).toBe(true);
      expect(manager.isToolAllowed('write_file')).toBe(true);
      expect(manager.isToolAllowed('execute_command')).toBe(false); // 默认禁用
    });
    
    it('should respect disabled tools', () => {
      manager.updateConfig({
        disabledTools: ['read_file', 'write_file']
      });
      
      expect(manager.isToolAllowed('read_file')).toBe(false);
      expect(manager.isToolAllowed('write_file')).toBe(false);
      expect(manager.isToolAllowed('list_files')).toBe(true);
    });
    
    it('should respect allowed tools whitelist', () => {
      manager.updateConfig({
        allowedTools: ['read_file', 'list_files']
      });
      
      expect(manager.isToolAllowed('read_file')).toBe(true);
      expect(manager.isToolAllowed('list_files')).toBe(true);
      expect(manager.isToolAllowed('write_file')).toBe(false);
      expect(manager.isToolAllowed('execute_command')).toBe(false);
    });
    
    it('should disable all tools when enableToolCalls is false', () => {
      manager.updateConfig({
        enableToolCalls: false
      });
      
      expect(manager.isToolAllowed('read_file')).toBe(false);
      expect(manager.isToolAllowed('list_files')).toBe(false);
    });
  });
  
  describe('isDangerousTool', () => {
    it('should identify dangerous tools', () => {
      expect(manager.isDangerousTool('delete_file')).toBe(true);
      expect(manager.isDangerousTool('execute_command')).toBe(true);
      expect(manager.isDangerousTool('git_push')).toBe(true);
      expect(manager.isDangerousTool('read_file')).toBe(false);
      expect(manager.isDangerousTool('list_files')).toBe(false);
    });
    
    it('should allow customizing dangerous tools', () => {
      manager.updateConfig({
        dangerousTools: ['delete_file'] // 只保留 delete_file
      });
      
      expect(manager.isDangerousTool('delete_file')).toBe(true);
      expect(manager.isDangerousTool('execute_command')).toBe(false);
    });
  });
  
  describe('preExecuteCheck', () => {
    it('should return allowed:true for safe tools', async () => {
      const result = await manager.preExecuteCheck('read_file', {});
      
      expect(result.allowed).toBe(true);
      expect(result.needsConfirmation).toBeUndefined();
    });
    
    it('should return needsConfirmation:true for dangerous tools', async () => {
      const result = await manager.preExecuteCheck('delete_file', {
        path: '/some/path'
      });
      
      expect(result.allowed).toBe(true);
      expect(result.needsConfirmation).toBe(true);
    });
    
    it('should return allowed:false for disabled tools', async () => {
      const result = await manager.preExecuteCheck('execute_command', {
        command: 'ls -la'
      });
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not allowed');
    });
  });
  
  describe('filterAvailableTools', () => {
    it('should filter tools based on permissions', () => {
      const allTools = [
        { name: 'read_file', description: '', parameters: {} },
        { name: 'write_file', description: '', parameters: {} },
        { name: 'execute_command', description: '', parameters: {} }
      ] as any[];
      
      const available = manager.filterAvailableTools(allTools);
      
      expect(available.length).toBe(2);
      expect(available[0].name).toBe('read_file');
      expect(available[1].name).toBe('write_file');
    });
  });
  
  describe('sandbox mode', () => {
    beforeEach(() => {
      manager.updateConfig({ sandboxMode: true });
    });
    
    it('should block dangerous commands in sandbox mode', async () => {
      const result = await manager.preExecuteCheck('execute_command', {
        command: 'rm -rf /'
      });
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('dangerous pattern');
    });
    
    it('should allow safe commands in sandbox mode', async () => {
      const result = await manager.preExecuteCheck('execute_command', {
        command: 'ls -la'
      });
      
      expect(result.allowed).toBe(true);
    });
  });
  
  describe('configuration', () => {
    it('should update configuration', () => {
      manager.updateConfig({
        enableToolCalls: false,
        disabledTools: ['read_file']
      });
      
      const config = manager.getConfig();
      expect(config.enableToolCalls).toBe(false);
      expect(config.disabledTools).toContain('read_file');
    });
    
    it('should reset to default', () => {
      manager.updateConfig({
        enableToolCalls: false,
        disabledTools: ['read_file']
      });
      
      manager.resetToDefault();
      
      const config = manager.getConfig();
      expect(config.enableToolCalls).toBe(true);
      expect(config.disabledTools).toContain('execute_command');
    });
  });
});
