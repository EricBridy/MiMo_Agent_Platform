#!/usr/bin/env node

/**
 * MiMo Agent CLI - 命令行工具入口
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { AgentEngine, createAgent } from '@mimo/agent';
import { MiMoConnector } from '@mimo/mimo-connector';
import { generateId, EventEmitter } from '@mimo/shared';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const program = new Command();

// 显示Banner
function showBanner() {
  console.log(chalk.cyan(`
    ╔═══════════════════════════════════════╗
    ║                                       ║
    ║      🤖  MiMo Agent CLI               ║
    ║      AI Programming Assistant         ║
    ║                                       ║
    ╚═══════════════════════════════════════╝
  `));
}

// 全局变量
let agent: AgentEngine | null = null;
let sessionId: string | null = null;

// 初始化Agent
async function initializeAgent() {
  const apiKey = process.env.MIMO_API_KEY;
  const apiUrl = process.env.MIMO_API_URL || 'https://api.mimo.com/v1';
  
  if (!apiKey) {
    console.log(chalk.yellow('⚠️  请设置环境变量 MIMO_API_KEY'));
    console.log(chalk.gray('   export MIMO_API_KEY=your_api_key'));
    process.exit(1);
  }
  
  const mimoConnector = new MiMoConnector({ apiKey, apiUrl });
  
  agent = createAgent({
    session: {
      id: generateId('session'),
      deviceId: generateId('device'),
      userId: 'cli',
      startedAt: new Date(),
      lastActivity: new Date(),
      context: {
        recentFiles: [],
        openTabs: [],
        workspaceState: {}
      }
    },
    device: {
      id: generateId('device'),
      name: 'MiMo CLI',
      platform: process.platform as any,
      type: 'cli',
      status: 'connected',
      lastSeen: new Date(),
      capabilities: {
        canExecuteCommands: true,
        canAccessFilesystem: true,
        canRunGUI: false,
        maxConcurrentSessions: 1
      }
    },
    mimoConnector,
    tools: [
      {
        name: 'read_file',
        description: '读取文件内容',
        parameters: [
          { name: 'path', type: 'string', required: true }
        ],
        returns: { type: 'string' },
        handler: async (params) => {
          return fs.readFile(params.path as string, 'utf-8');
        }
      },
      {
        name: 'write_file',
        description: '写入文件内容',
        parameters: [
          { name: 'path', type: 'string', required: true },
          { name: 'content', type: 'string', required: true }
        ],
        returns: { type: 'boolean' },
        handler: async (params) => {
          await fs.writeFile(params.path as string, params.content as string, 'utf-8');
          return true;
        }
      },
      {
        name: 'execute_command',
        description: '执行终端命令',
        parameters: [
          { name: 'command', type: 'string', required: true }
        ],
        returns: { type: 'object' },
        handler: async (params) => {
          try {
            const { stdout, stderr } = await execAsync(params.command as string);
            return { success: true, stdout, stderr };
          } catch (error) {
            return { 
              success: false, 
              error: (error as Error).message 
            };
          }
        }
      }
    ]
  });
  
  sessionId = agent.getMessageHistory().length > 0 ? sessionId! : null;
}

// 命令: chat - 与AI对话
program
  .command('chat')
  .description('启动交互式对话')
  .option('-p, --project <path>', '项目路径')
  .action(async (options) => {
    showBanner();
    console.log(chalk.green('✓ 初始化中...\n'));
    
    await initializeAgent();
    
    if (!agent) {
      console.log(chalk.red('✗ Agent初始化失败'));
      return;
    }
    
    if (options.project) {
      console.log(chalk.blue(`📁 项目: ${options.project}\n`));
    }
    
    console.log(chalk.gray('输入消息开始对话，输入 exit 退出\n'));
    
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const prompt = () => {
      rl.question(chalk.cyan('你: '), async (input) => {
        if (input.toLowerCase() === 'exit') {
          console.log(chalk.gray('\n再见！👋\n'));
          rl.close();
          return;
        }
        
        if (!input.trim()) {
          prompt();
          return;
        }
        
        process.stdout.write(chalk.cyan('AI: '));
        
        try {
          const response = await agent!.processRequest({
            type: 'chat',
            content: input
          });
          
          if (response.success && response.message) {
            console.log(chalk.white(response.message.content));
          } else {
            console.log(chalk.red(response.error || '未知错误'));
          }
        } catch (error) {
          console.log(chalk.red(`错误: ${(error as Error).message}`));
        }
        
        console.log('');
        prompt();
      });
    };
    
    prompt();
  });

// 命令: code - 编程辅助
program
  .command('code <prompt>')
  .description('执行编程任务')
  .option('-o, --output <file>', '输出文件')
  .option('-l, --language <lang>', '语言', 'typescript')
  .action(async (prompt, options) => {
    showBanner();
    console.log(chalk.green(`✓ 正在处理: ${prompt}\n`));
    
    await initializeAgent();
    
    if (!agent) return;
    
    try {
      const response = await agent.processRequest({
        type: 'code',
        content: `编写代码: ${prompt}`,
        context: {
          language: options.language,
          outputFile: options.output
        }
      });
      
      if (response.success && response.message) {
        const code = response.message.content;
        
        if (options.output) {
          await fs.writeFile(options.output, code, 'utf-8');
          console.log(chalk.green(`✓ 代码已保存到: ${options.output}`));
        } else {
          console.log(chalk.white(code));
        }
      } else {
        console.log(chalk.red(response.error || '生成失败'));
      }
    } catch (error) {
      console.log(chalk.red(`错误: ${(error as Error).message}`));
    }
  });

// 命令: search - 搜索文件
program
  .command('search <query>')
  .description('搜索文件内容')
  .option('-d, --dir <directory>', '搜索目录', '.')
  .option('-r, --recursive', '递归搜索', false)
  .action(async (query, options) => {
    showBanner();
    console.log(chalk.green(`✓ 搜索: ${query}\n`));
    
    // 简化实现
    console.log(chalk.gray(`在 ${options.dir} 中搜索 "${query}"...`));
    console.log(chalk.yellow('\n搜索功能开发中...'));
  });

// 命令: devices - 查看设备
program
  .command('devices')
  .description('查看已连接的设备')
  .action(async () => {
    showBanner();
    console.log(chalk.green('✓ 已连接的设备\n'));
    console.log(chalk.gray('暂无已连接的设备'));
    console.log(chalk.gray('\n提示: 启动桌面端应用以连接设备\n'));
  });

// 命令: status - 查看状态
program
  .command('status')
  .description('查看Agent状态')
  .action(() => {
    showBanner();
    console.log(chalk.green('✓ Agent状态\n'));
    console.log(chalk.white(`版本: ${chalk.cyan('1.0.0')}`));
    console.log(chalk.white(`平台: ${chalk.cyan(process.platform)}`));
    console.log(chalk.white(`Node.js: ${chalk.cyan(process.version)}`));
    
    if (agent) {
      const history = agent.getMessageHistory();
      console.log(chalk.white(`会话消息数: ${chalk.cyan(history.length.toString())}`));
    }
    
    console.log('');
  });

// 帮助信息
program.on('--help', () => {
  console.log(chalk.gray(`
示例:
  $ mimo chat                    启动交互式对话
  $ mimo code "创建React组件"    执行编程任务
  $ mimo search "function"       搜索文件内容
  $ mimo devices                 查看已连接设备
  $ mimo status                  查看Agent状态
  
环境变量:
  MIMO_API_KEY       MiMo API密钥
  MIMO_API_URL       MiMo API地址 (可选)
  `));
});

// 解析参数
program.parse(process.argv);

// 默认显示帮助
if (!process.argv.slice(2).length) {
  showBanner();
  program.outputHelp();
}
