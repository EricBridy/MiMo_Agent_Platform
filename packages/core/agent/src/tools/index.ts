/**
 * MiMo Agent 工具系统
 * 包含所有可用工具的定义和实现
 */

import { ToolContext, ToolResult } from '@mimo/shared';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// 简化的 Tool 接口
interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (params: any, context: ToolContext) => Promise<any>;
}

// ==================== 文件操作工具 ====================

export const fileTools: Tool[] = [
  {
    name: 'read_file',
    description: '读取文件内容',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文件路径' }
      },
      required: ['path']
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const filePath = path.resolve(context.projectPath || '', params.path);
      const content = await fs.readFile(filePath, 'utf-8');
      return { path: filePath, content };
    }
  },
  {
    name: 'write_file',
    description: '写入文件内容',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文件路径' },
        content: { type: 'string', description: '文件内容' }
      },
      required: ['path', 'content']
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const filePath = path.resolve(context.projectPath || '', params.path);
      await fs.writeFile(filePath, params.content, 'utf-8');
      return { path: filePath, success: true };
    }
  },
  {
    name: 'create_file',
    description: '创建新文件',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文件路径' },
        content: { type: 'string', description: '初始内容', default: '' }
      },
      required: ['path']
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const filePath = path.resolve(context.projectPath || '', params.path);
      // 检查文件是否已存在
      try {
        await fs.access(filePath);
        throw new Error(`File already exists: ${filePath}`);
      } catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
      }
      await fs.writeFile(filePath, params.content || '', 'utf-8');
      return { path: filePath, success: true };
    }
  },
  {
    name: 'delete_file',
    description: '删除文件或目录',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文件或目录路径' }
      },
      required: ['path']
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const filePath = path.resolve(context.projectPath || '', params.path);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        await fs.rm(filePath, { recursive: true });
      } else {
        await fs.unlink(filePath);
      }
      return { path: filePath, success: true };
    }
  },
  {
    name: 'move_file',
    description: '移动或重命名文件',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', description: '源路径' },
        destination: { type: 'string', description: '目标路径' }
      },
      required: ['source', 'destination']
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const srcPath = path.resolve(context.projectPath || '', params.source);
      const destPath = path.resolve(context.projectPath || '', params.destination);
      await fs.rename(srcPath, destPath);
      return { source: srcPath, destination: destPath, success: true };
    }
  },
  {
    name: 'list_files',
    description: '列出目录中的文件',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '目录路径', default: '.' },
        recursive: { type: 'boolean', description: '是否递归列出', default: false }
      }
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const dirPath = path.resolve(context.projectPath || '', params.path || '.');
      const files = await listDirectory(dirPath, params.recursive || false);
      return { path: dirPath, files };
    }
  }
];

// ==================== Git 操作工具 ====================

export const gitTools: Tool[] = [
  {
    name: 'git_status',
    description: '查看 Git 仓库状态',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '仓库路径', default: '.' }
      }
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const repoPath = path.resolve(context.projectPath || '', params.path || '.');
      const { stdout, stderr } = await execAsync('git status --porcelain', { cwd: repoPath });
      if (stderr) throw new Error(stderr);
      
      const files = stdout.split('\n').filter(line => line.trim()).map(line => ({
        status: line.substring(0, 2).trim(),
        path: line.substring(3)
      }));
      
      return { files, raw: stdout };
    }
  },
  {
    name: 'git_diff',
    description: '查看 Git 差异',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '文件路径（可选，不提供则显示所有差异）' },
        staged: { type: 'boolean', description: '查看暂存区差异', default: false }
      }
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const repoPath = context.projectPath || '.';
      const args = ['diff'];
      if (params.staged) args.push('--staged');
      if (params.path) args.push('--', params.path);
      
      const { stdout, stderr } = await execAsync(args.join(' '), { cwd: repoPath });
      if (stderr && !stderr.includes('warning')) throw new Error(stderr);
      
      return { diff: stdout };
    }
  },
  {
    name: 'git_commit',
    description: '提交修改到 Git 仓库',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: '提交信息' },
        addAll: { type: 'boolean', description: '自动 git add 所有文件', default: false }
      },
      required: ['message']
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const repoPath = context.projectPath || '.';
      
      if (params.addAll) {
        await execAsync('git add -A', { cwd: repoPath });
      }
      
      const { stdout, stderr } = await execAsync(`git commit -m "${params.message}"`, { cwd: repoPath });
      if (stderr && !stderr.includes('warning')) throw new Error(stderr);
      
      return { message: params.message, output: stdout };
    }
  },
  {
    name: 'git_push',
    description: '推送到远程仓库',
    parameters: {
      type: 'object',
      properties: {
        remote: { type: 'string', description: '远程名称', default: 'origin' },
        branch: { type: 'string', description: '分支名称' }
      }
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const repoPath = context.projectPath || '.';
      const args = ['push', params.remote || 'origin'];
      if (params.branch) args.push(params.branch);
      
      const { stdout, stderr } = await execAsync(args.join(' '), { cwd: repoPath });
      if (stderr && !stderr.includes('warning')) throw new Error(stderr);
      
      return { output: stdout };
    }
  },
  {
    name: 'git_pull',
    description: '从远程仓库拉取',
    parameters: {
      type: 'object',
      properties: {
        remote: { type: 'string', description: '远程名称', default: 'origin' },
        branch: { type: 'string', description: '分支名称' }
      }
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const repoPath = context.projectPath || '.';
      const args = ['pull', params.remote || 'origin'];
      if (params.branch) args.push(params.branch);
      
      const { stdout, stderr } = await execAsync(args.join(' '), { cwd: repoPath });
      if (stderr && !stderr.includes('warning')) throw new Error(stderr);
      
      return { output: stdout };
    }
  }
];

// ==================== 代码搜索工具 ====================

export const searchTools: Tool[] = [
  {
    name: 'search_files',
    description: '使用 ripgrep 搜索文件内容',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: '搜索模式（支持正则表达式）' },
        path: { type: 'string', description: '搜索路径', default: '.' },
        fileType: { type: 'string', description: '文件类型过滤（如 .ts,.js）' }
      },
      required: ['pattern']
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const searchPath = path.resolve(context.projectPath || '', params.path || '.');
      let command = `rg "${params.pattern}" "${searchPath}" --color=never`;
      
      if (params.fileType) {
        const extensions = params.fileType.split(',').map((ext: string) => ext.trim());
        command += extensions.map((ext: string) => ` -g "*${ext}"`).join('');
      }
      
      try {
        const { stdout, stderr } = await execAsync(command);
        const results = stdout.split('\n').filter(line => line.trim()).map(line => {
          const match = line.match(/^([^:]+):(\d+):(.*)$/);
          return match ? { file: match[1], line: parseInt(match[2]), content: match[3] } : null;
        }).filter(Boolean);
        
        return { pattern: params.pattern, results };
      } catch (error: any) {
        // rg 没有找到匹配时返回 exit code 1
        if (error.code === 1) return { pattern: params.pattern, results: [] };
        throw error;
      }
    }
  },
  {
    name: 'search_code',
    description: '语义代码搜索（使用嵌入向量）',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索查询' },
        path: { type: 'string', description: '搜索路径', default: '.' }
      },
      required: ['query']
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      // 这是一个占位实现，实际应调用嵌入 API
      // 暂时使用简单的文本搜索代替
      const searchPath = path.resolve(context.projectPath || '', params.path || '.');
      const command = `rg "${params.query}" "${searchPath}" --color=never -l`;
      
      try {
        const { stdout } = await execAsync(command);
        const files = stdout.split('\n').filter(line => line.trim());
        return { query: params.query, files, note: 'Semantic search not yet implemented, using text search' };
      } catch (error: any) {
        if (error.code === 1) return { query: params.query, files: [] };
        throw error;
      }
    }
  }
];

// ==================== 浏览器控制工具 ====================

export const browserTools: Tool[] = [
  {
    name: 'browser_navigate',
    description: '打开网页',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL 地址' }
      },
      required: ['url']
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      // 实际应使用 puppeteer 或类似工具
      // 这里仅返回模拟响应
      return { 
        url: params.url, 
        title: 'Mock Page Title',
        content: 'Mock page content for ' + params.url,
        note: 'Browser control not yet fully implemented'
      };
    }
  },
  {
    name: 'browser_click',
    description: '点击网页元素',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS 选择器' }
      },
      required: ['selector']
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      return { 
        selector: params.selector,
        success: true,
        note: 'Browser control not yet fully implemented'
      };
    }
  },
  {
    name: 'browser_type',
    description: '在网页输入框中输入文本',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS 选择器' },
        text: { type: 'string', description: '要输入的文本' }
      },
      required: ['selector', 'text']
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      return { 
        selector: params.selector,
        text: params.text,
        success: true,
        note: 'Browser control not yet fully implemented'
      };
    }
  },
  {
    name: 'browser_screenshot',
    description: '网页截图',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: '保存路径（可选）' }
      }
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const screenshotPath = params.path || 'screenshot.png';
      return { 
        path: screenshotPath,
        success: true,
        note: 'Browser control not yet fully implemented'
      };
    }
  }
];

// ==================== 终端执行工具 ====================

export const terminalTools: Tool[] = [
  {
    name: 'execute_command',
    description: '执行终端命令',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: '要执行的命令' },
        cwd: { type: 'string', description: '工作目录（可选）' }
      },
      required: ['command']
    },
    handler: async (params: any, context: ToolContext): Promise<any> => {
      const cwd = params.cwd ? path.resolve(context.projectPath || '', params.cwd) : context.projectPath;
      const { stdout, stderr } = await execAsync(params.command, { cwd });
      return { command: params.command, stdout, stderr };
    }
  }
];

// ==================== 辅助函数 ====================

async function listDirectory(dirPath: string, recursive: boolean, basePath: string = dirPath): Promise<any[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: any[] = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(basePath, fullPath);
    
    if (entry.isDirectory()) {
      files.push({
        name: entry.name,
        path: relativePath,
        isDirectory: true
      });
      
      if (recursive) {
        const subFiles = await listDirectory(fullPath, recursive, basePath);
        files.push(...subFiles);
      }
    } else {
      const stat = await fs.stat(fullPath);
      files.push({
        name: entry.name,
        path: relativePath,
        isDirectory: false,
        size: stat.size,
        modified: stat.mtime
      });
    }
  }
  
  return files;
}

// ==================== 导出所有工具 ====================

export const allTools: Tool[] = [
  ...fileTools,
  ...gitTools,
  ...searchTools,
  ...browserTools,
  ...terminalTools
];
