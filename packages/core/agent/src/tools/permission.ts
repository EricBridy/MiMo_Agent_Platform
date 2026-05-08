/**
 * 工具权限管理
 * 控制哪些工具可以被 Agent 使用
 */

import { Tool, ToolPermission } from '@mimo/shared';

export interface PermissionConfig {
  // 是否启用工具调用
  enableToolCalls: boolean;
  
  // 允许的工具列表（白名单）
  allowedTools: string[];
  
  // 禁用的工具列表（黑名单）
  disabledTools: string[];
  
  // 需要确认的危险工具
  dangerousTools: string[];
  
  // 是否启用沙箱模式
  sandboxMode: boolean;
}

export class ToolPermissionManager {
  private config: PermissionConfig;
  
  constructor(config?: Partial<PermissionConfig>) {
    // 默认配置
    this.config = {
      enableToolCalls: true,
      allowedTools: [], // 空数组表示允许所有
      disabledTools: ['execute_command'], // 默认禁用危险命令
      dangerousTools: ['delete_file', 'execute_command', 'git_push'],
      sandboxMode: false,
      ...config
    };
  }
  
  /**
   * 检查工具是否可用
   */
  isToolAllowed(toolName: string): boolean {
    // 如果工具调用被禁用
    if (!this.config.enableToolCalls) {
      return false;
    }
    
    // 如果在禁用列表中
    if (this.config.disabledTools.includes(toolName)) {
      return false;
    }
    
    // 如果白名单非空，检查是否在白名单中
    if (this.config.allowedTools.length > 0) {
      return this.config.allowedTools.includes(toolName);
    }
    
    return true;
  }
  
  /**
   * 检查工具是否需要确认
   */
  isDangerousTool(toolName: string): boolean {
    return this.config.dangerousTools.includes(toolName);
  }
  
  /**
   * 过滤可用工具列表
   */
  filterAvailableTools(allTools: Tool[]): Tool[] {
    return allTools.filter(tool => this.isToolAllowed(tool.name));
  }
  
  /**
   * 执行工具前的检查
   */
  async preExecuteCheck(toolName: string, params: Record<string, unknown>): Promise<{
    allowed: boolean;
    reason?: string;
    needsConfirmation?: boolean;
  }> {
    // 检查是否允许使用
    if (!this.isToolAllowed(toolName)) {
      return {
        allowed: false,
        reason: `Tool '${toolName}' is not allowed by permission settings`
      };
    }
    
    // 检查危险工具
    if (this.isDangerousTool(toolName)) {
      return {
        allowed: true,
        needsConfirmation: true
      };
    }
    
    // 沙箱模式检查
    if (this.config.sandboxMode) {
      const sandboxCheck = this.checkSandboxConstraints(toolName, params);
      if (!sandboxCheck.allowed) {
        return sandboxCheck;
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * 沙箱约束检查
   */
  private checkSandboxConstraints(toolName: string, params: Record<string, unknown>): {
    allowed: boolean;
    reason?: string;
  } {
    // 限制文件操作在沙箱目录内
    if (['write_file', 'create_file', 'delete_file'].includes(toolName)) {
      const filePath = params['path'] as string;
      // 这里应该检查路径是否在允许的沙箱目录内
      // 暂时简单返回允许
    }
    
    // 限制命令执行
    if (toolName === 'execute_command') {
      const command = params['command'] as string;
      // 禁止危险命令
      const dangerousPatterns = ['rm -rf', 'dd if=', 'mkfs', '> /dev/'];
      for (const pattern of dangerousPatterns) {
        if (command.includes(pattern)) {
          return {
            allowed: false,
            reason: `Command contains dangerous pattern: ${pattern}`
          };
        }
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * 更新权限配置
   */
  updateConfig(updates: Partial<PermissionConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
  }
  
  /**
   * 获取当前配置
   */
  getConfig(): PermissionConfig {
    return { ...this.config };
  }
  
  /**
   * 重置为默认配置
   */
  resetToDefault(): void {
    this.config = {
      enableToolCalls: true,
      allowedTools: [],
      disabledTools: ['execute_command'],
      dangerousTools: ['delete_file', 'execute_command', 'git_push'],
      sandboxMode: false
    };
  }
}

/**
 * 创建默认权限管理器
 */
export function createDefaultPermissionManager(): ToolPermissionManager {
  return new ToolPermissionManager();
}
