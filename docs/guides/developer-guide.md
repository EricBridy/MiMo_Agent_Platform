# MiMo Agent Platform 开发者指南

## 项目结构

```
mimo/
├── apps/               # 应用层
│   ├── desktop/       # Electron 桌面应用
│   ├── mobile/        # React Native 移动应用
│   ├── cli/           # 命令行工具
│   └── web/          # Web 应用
│
├── packages/          # 核心包（库）
│   ├── core/          # 核心功能
│   │   ├── agent/     # Agent 引擎
│   │   ├── gateway/   # Gateway 服务核心
│   │   └── sync/      # 同步服务
│   ├── shared/        # 共享类型和工具
│   ├── mimo-connector/ # MiMo API 连接器
│   └── device-bridge/  # 设备桥接
│
├── services/          # 后端服务
│   ├── mock-api/      # Mock MiMo API
│   ├── gateway/       # Gateway 服务
│   └── notification/  # 通知服务
│
├── prisma/           # Prisma 数据库 Schema
├── docs/             # 文档
└── package.json      # Monorepo 配置
```

---

## 开发环境配置

### 前置要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0（或使用 `ni`  x)
- **Git**: >= 2.30.0

### 安装依赖

```bash
# 克隆仓库
git clone https://github.com/your-org/mimo.git
cd mimo

# 安装所有依赖（Monorepo）
npm install

# 构建共享包（按顺序）
npm run build --workspace=packages/shared
npm run build --workspace=packages/mimo-connector
npm run build --workspace=packages/core/agent
```

### 运行应用

#### 桌面端 (Desktop)

```bash
# 开发模式（热重载）
npm run dev:desktop

# 生产构建
npm run build:desktop

# 打包可执行文件
npm run package:desktop
```

#### 移动端 (Mobile)

```bash
# iOS
cd apps/mobile
npx react-native run-ios

# Android
cd apps/mobile
npx react-native run-android

# 启动 Metro 打包器
npx react-native start
```

#### CLI

```bash
# 开发模式
npm run dev:cli

# 全局链接（方便测试）
cd apps/cli
npm link
mimo --help
```

---

## 架构概述

### Agent Engine

**路径**: `packages/core/agent/`

**核心类**: `AgentEngine`

```typescript
import { AgentEngine, createAgent } from '@mimo/agent';

const agent = createAgent({
  session: { id: 'session_123', deviceId: 'device_456' },
  device: { id: 'device_456', platform: 'windows', type: 'desktop' },
  mimoConnector: new MiMoConnector({ apiKey: 'your-key' }),
  tools: allTools,
  maxIterations: 10
});

// 处理用户请求
const response = await agent.processRequest({
  content: '帮我写一个 Hello World',
  model: 'mimo-pro'
});
```

#### 添加自定义工具

```typescript
// packages/core/agent/src/tools/custom.ts
import { Tool } from '@mimo/shared';

export const myCustomTool: Tool = {
  name: 'my_custom_tool',
  description: 'My custom tool',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'Input parameter' }
    },
    required: ['input']
  },
  handler: async (params, context) => {
    // 你的工具逻辑
    const result = await doSomething(params.input);
    return result;
  }
};

// 注册工具
import { allTools } from '../tools';
allTools.push(myCustomTool);
```

---

### MiMo Connector

**路径**: `packages/mimo-connector/`

**核心类**: `MiMoConnector`

```typescript
import { MiMoConnector } from '@mimo/mimo-connector';

const connector = new MiMoConnector({
  apiKey: 'your-api-key',
  baseURL: 'https://api.mimo.com/v1',
  timeout: 60000
});

// 聊天
const response = await connector.chat({
  messages: [{ role: 'user', content: 'Hello' }],
  model: 'mimo-pro',
  stream: false
});

// 流式聊天
await connector.streamChat({
  messages: [{ role: 'user', content: 'Hello' }]
}, (chunk) => {
  console.log(chunk); // 增量内容
});

// 代码补全
const completion = await connector.complete({
  prompt: 'function add(a, b) {',
  maxTokens: 100
});

// 文本嵌入
const embedding = await connector.embed({
  input: 'Hello World',
  model: 'text-embedding-ada-002'
});
```

---

### Device Bridge

**路径**: `packages/device-bridge/`

**核心类**: `DeviceBridge`

```typescript
import { DeviceBridge } from '@mimo/device-bridge';

const bridge = new DeviceBridge({
  serverUrl: 'http://localhost:3000',
  deviceId: 'device_123',
  deviceName: 'My Desktop',
  platform: 'windows',
  type: 'desktop'
});

// 连接
await bridge.connect();

// 发送消息
bridge.sendMessage({
  sessionId: 'session_123',
  content: 'Hello'
});

// 监听消息
bridge.on('message', (data) => {
  console.log(data.message.content);
});

// 心跳检测
bridge.startHeartbeat();

// 设备能力协商
const capabilities = await bridge.negotiateCapabilities('target_device_id');

// 会话迁移
await bridge.migrateSession('session_123', 'target_device_id');
```

---

## 数据库

### Prisma Schema

**路径**: `prisma/schema.prisma`

```prisma
model Session {
  id          String   @id @default(cuid())
  deviceId    String
  userId      String   @default("local")
  projectPath String?
  startedAt   DateTime @default(now())
  lastActivity DateTime @default(now())
  context     String?
  
  messages    Message[]
  
  @@map("sessions")
}
```

### 数据库操作

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 创建会话
const session = await prisma.session.create({
  data: {
    deviceId: 'device_123',
    projectPath: '/path/to/project'
  }
});

// 添加消息
const message = await prisma.message.create({
  data: {
    sessionId: session.id,
    role: 'user',
    content: 'Hello'
  }
});

// 查询会话的历史消息
const messages = await prisma.message.findMany({
  where: { sessionId: session.id },
  orderBy: { timestamp: 'asc' }
});
```

---

## 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定包的测试
npm test --workspace=packages/core/agent

# 监视模式
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage
```

### 编写测试

```typescript
// packages/core/agent/__tests__/agent.test.ts
import { AgentEngine } from '../../src';
import { MockMiMoConnector } from './mocks';

describe('AgentEngine', () => {
  it('should process request', async () => {
    const agent = new AgentEngine({
      mimoConnector: new MockMiMoConnector(),
      // ... 其他配置
    });
    
    const response = await agent.processRequest({
      content: 'Hello'
    });
    
    expect(response.success).toBe(true);
  });
});
```

---

## 构建和打包

### 桌面端打包

```bash
# Windows
npm run package:desktop -- --win

# macOS
npm run package:desktop -- --mac

# Linux
npm run package:desktop -- --linux

# 所有平台
npm run package:desktop -- --win --mac --linux
```

**配置**: `apps/desktop/electron-builder.yml`

```yaml
appId: com.mimo.desktop
productName: MiMo
directories:
  output: dist
files:
  - 'dist/**/*'
  - 'node_modules/**/*'
  - 'package.json'
dmg:
  title: MiMo
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

### 移动端构建

#### Android

```bash
cd apps/mobile/android
./gradlew assembleRelease

# 输出: apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

#### iOS

```bash
cd apps/mobile/ios
pod install
open MiMo.xcworkspace

# 然后在 Xcode 中选择设备并点击 "Build"
```

---

## 贡献流程

### 1. Fork 和 Clone

```bash
# Fork 仓库（在 GitHub 上操作）
git clone https://github.com/YOUR_USERNAME/mimo.git
cd mimo
git remote add upstream https://github.com/ORIGINAL_OWNER/mimo.git
```

### 2. 创建分支

```bash
git checkout -b feature/my-feature
```

### 3. 开发和提交

```bash
# 进行修改...

# 运行测试
npm test

# 提交
git add .
git commit -m "feat: add my feature"
```

### 4. 推送和创建 PR

```bash
git push origin feature/my-feature

# 然后在 GitHub 上创建 Pull Request
```

---

## 代码规范

### Lint

```bash
# 运行 ESLint
npm run lint

# 自动修复
npm run lint -- --fix
```

### Format

```bash
# 运行 Prettier
npm run format

# 检查格式
npm run format:check
```

### Git Commit 规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

**示例**:
```
feat(agent): add support for streaming responses
fix(desktop): resolve crash when opening large files
docs(readme): update installation instructions
```

---

## 调试

### 桌面端

**主进程**:
```bash
# 使用 VS Code 调试
# 1. 打开 VS Code
# 2. 按 F5 选择 "Electron Main" 配置
# 3. 设置断点
# 4. 开始调试
```

**渲染进程**:
```bash
# 1. 打开 Chrome DevTools (Ctrl+Shift+I)
# 2. 在 "Sources" 标签设置断点
# 3. 使用 React Developer Tools 扩展
```

### 移动端

**iOS**:
```bash
# 在 Xcode 中打开项目
open apps/mobile/ios/MiMo.xcworkspace

# 选择设备或模拟器
# 点击 "Run" 按钮
# 在 Xcode 中查看日志和断点
```

**Android**:
```bash
# 使用 Android Studio 打开项目
# 或命令行调试：
adb logcat | grep "ReactNative"

# 在 Chrome 中调试：
# 1. 打开 Chrome
# 2. 访问 chrome://inspect
# 3. 点击 "Inspect"
```

---

## 发布流程

### 1. 更新版本号

```bash
# 自动更新版本号（根据 Conventional Commits）
npm run release

# 或手动更新
npm version patch # 1.0.0 → 1.0.1
npm version minor # 1.0.0 → 1.1.0
npm version major # 1.0.0 → 2.0.0
```

### 2. 构建和测试

```bash
# 清理
npm run clean

# 构建所有包
npm run build

# 运行测试
npm test

# 打包桌面端
npm run package:desktop
```

### 3. 发布到 npm（如果是库）

```bash
# 发布所有包
npm run publish:all

# 或单独发布
npm run publish --workspace=packages/core/agent
```

### 4. 创建 GitHub Release

```bash
# 使用 GitHub CLI
gh release create v1.0.0 --title "Release 1.0.0" --notes "Release notes..."

# 上传打包文件
gh release upload v1.0.0 dist/mimo-setup.exe dist/mimo.dmg
```

---

## 常见问题

### 1. 依赖安装失败

**解决**:
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 和 lock 文件
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

### 2. 构建失败

**检查**:
- TypeScript 版本是否一致？
- 是否先构建了依赖的包（`shared`, `mimo-connector`）？
- Node.js 版本是否符合要求？

### 3. 测试失败

**解决**:
```bash
# 更新 Jest 配置
# 检查 __mocks__ 文件是否正确
# 确保所有依赖都被正确 mock
```

---

## 获取帮助

- **GitHub Issues**: [github.com/mimo/issues](https://github.com/mimo/issues)
- **Discord 社区**: [discord.gg/mimo](https://discord.gg/mimo)
- **邮件列表**: dev@mimo.ai
