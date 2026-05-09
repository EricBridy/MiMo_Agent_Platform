/**
 * Tools Routes - 工具执行 API
 */

import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);
const router = Router();

// 执行工具
router.post('/execute', async (req, res, next) => {
  try {
    const { toolName, params, projectPath } = req.body;
    
    if (!toolName) {
      return res.status(400).json({ success: false, error: 'toolName is required' });
    }

    logger.info('Tool execution requested', { toolName, projectPath });

    let result: any;

    switch (toolName) {
      // 文件操作
      case 'read_file': {
        const filePath = path.resolve(projectPath || '', params.path);
        const content = await fs.readFile(filePath, 'utf-8');
        result = { path: filePath, content };
        break;
      }

      case 'write_file': {
        const filePath = path.resolve(projectPath || '', params.path);
        await fs.writeFile(filePath, params.content, 'utf-8');
        result = { path: filePath, success: true };
        break;
      }

      case 'create_file': {
        const filePath = path.resolve(projectPath || '', params.path);
        await fs.writeFile(filePath, params.content || '', 'utf-8');
        result = { path: filePath, success: true };
        break;
      }

      case 'delete_file': {
        const filePath = path.resolve(projectPath || '', params.path);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
          await fs.rm(filePath, { recursive: true });
        } else {
          await fs.unlink(filePath);
        }
        result = { path: filePath, success: true };
        break;
      }

      case 'list_files': {
        const dirPath = path.resolve(projectPath || '', params.path || '.');
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const files = await Promise.all(
          entries.map(async (entry) => {
            const fullPath = path.join(dirPath, entry.name);
            const isDir = entry.isDirectory();
            return {
              name: entry.name,
              path: path.relative(projectPath || '', fullPath),
              isDirectory: isDir,
              size: isDir ? null : (await fs.stat(fullPath)).size,
            };
          })
        );
        result = { path: dirPath, files };
        break;
      }

      // Git 操作
      case 'git_status': {
        const repoPath = path.resolve(projectPath || '', params.path || '.');
        const { stdout } = await execAsync('git status --porcelain', { cwd: repoPath });
        const files = stdout.split('\n').filter(line => line.trim()).map(line => ({
          status: line.substring(0, 2).trim(),
          path: line.substring(3),
        }));
        result = { files, raw: stdout };
        break;
      }

      case 'git_diff': {
        const repoPath = projectPath || '.';
        const args = ['git diff'];
        if (params.staged) args.push('--staged');
        if (params.path) args.push('--', params.path);
        const { stdout } = await execAsync(args.join(' '), { cwd: repoPath });
        result = { diff: stdout };
        break;
      }

      case 'git_commit': {
        const repoPath = projectPath || '.';
        if (params.addAll) {
          await execAsync('git add -A', { cwd: repoPath });
        }
        const { stdout } = await execAsync(`git commit -m "${params.message}"`, { cwd: repoPath });
        result = { message: params.message, output: stdout };
        break;
      }

      case 'git_push': {
        const repoPath = projectPath || '.';
        const args = ['git push', params.remote || 'origin'];
        if (params.branch) args.push(params.branch);
        const { stdout } = await execAsync(args.join(' '), { cwd: repoPath });
        result = { output: stdout };
        break;
      }

      // 终端命令
      case 'execute_command': {
        const cwd = params.cwd ? path.resolve(projectPath || '', params.cwd) : projectPath;
        const { stdout, stderr } = await execAsync(params.command, { cwd });
        result = { command: params.command, stdout, stderr };
        break;
      }

      // 搜索
      case 'search_files': {
        const searchPath = path.resolve(projectPath || '', params.path || '.');
        let command = `rg "${params.pattern}" "${searchPath}" --color=never`;
        if (params.fileType) {
          const extensions = params.fileType.split(',').map((ext: string) => ext.trim());
          command += extensions.map((ext: string) => ` -g "*${ext}"`).join('');
        }
        try {
          const { stdout } = await execAsync(command);
          const results = stdout.split('\n').filter(line => line.trim()).map(line => {
            const match = line.match(/^([^:]+):(\d+):(.*)$/);
            return match ? { file: match[1], line: parseInt(match[2]), content: match[3] } : null;
          }).filter(Boolean);
          result = { pattern: params.pattern, results };
        } catch (error: any) {
          if (error.code === 1) {
            result = { pattern: params.pattern, results: [] };
          } else {
            throw error;
          }
        }
        break;
      }

      default:
        return res.status(400).json({ success: false, error: `Unknown tool: ${toolName}` });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// 获取可用工具列表
router.get('/list', (req, res) => {
  const tools = [
    { name: 'read_file', description: '读取文件内容', category: 'file' },
    { name: 'write_file', description: '写入文件内容', category: 'file' },
    { name: 'create_file', description: '创建新文件', category: 'file' },
    { name: 'delete_file', description: '删除文件或目录', category: 'file', dangerous: true },
    { name: 'list_files', description: '列出目录中的文件', category: 'file' },
    { name: 'git_status', description: '查看 Git 仓库状态', category: 'git' },
    { name: 'git_diff', description: '查看 Git 差异', category: 'git' },
    { name: 'git_commit', description: '提交修改到 Git 仓库', category: 'git' },
    { name: 'git_push', description: '推送到远程仓库', category: 'git', dangerous: true },
    { name: 'execute_command', description: '执行终端命令', category: 'terminal', dangerous: true },
    { name: 'search_files', description: '使用 ripgrep 搜索文件内容', category: 'search' },
  ];

  res.json({ success: true, data: tools });
});

export default router;
