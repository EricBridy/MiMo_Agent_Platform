# MiMo Agent Platform - 开发指南

## 📋 项目概述

MiMo Agent Platform 是一个基于 MiMo 大模型的跨平台 AI 编程开发平台，支持 Windows、Linux、macOS、Android 和 iOS 平台，能够实现移动端唤醒桌面端进行编程工作。

### 技术参考

本项目参考了以下优秀开源项目：
- **OpenClaw** - 网关架构、多渠道支持、多代理系统
- **Claude Code** - CLI 交互模式、自然语言编程
- **KiloCode** - IDE 集成、代码自动补全
- **Codex** - API 驱动编程能力

## 🚀 快速开始

### 环境要求

- Node.js 20+
- npm 10+
- Git

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/EricBridy/MiMo_Agent_Platform.git
cd MiMo_Agent_Platform

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入 MiMo API Key

# 4. 启动开发服务器
npm run dev:desktop
```

## 📦 项目结构

```
mimo/
├── apps/
│   ├── desktop/          # Electron 桌面应用
│   ├── mobile/           # React Native 移动应用
│   ├── cli/              # 命令行工具
│   └── web/              # Web 版本
├── packages/
│   ├── core/agent/       # Agent 核心引擎
│   ├── mimo-connector/   # MiMo API 连接器
│   ├── device-bridge/    # 设备桥接
│   └── shared/           # 共享类型和工具
└── services/             # 后端服务
```

## 🎯 核心功能

### 1. 桌面端应用

```bash
cd apps/desktop
npm install
npm run dev
```

功能：
- AI 对话界面
- 代码编辑器 (Monaco Editor)
- 终端模拟器
- 文件管理器
- 设备管理

### 2. 移动端应用

```bash
cd apps/mobile
npm install
npm run android   # Android
npm run ios       # iOS
```

功能：
- 设备连接
- 消息发送
- 唤醒桌面端
- 状态查看

### 3. 命令行工具

```bash
cd apps/cli
npm install
npm link

# 使用
mimo chat                    # 交互式对话
mimo code "创建React组件"    # 代码生成
mimo status                  # 查看状态
```

### 4. Web 版本

```bash
cd apps/web
npm install
npm run dev
```

## 🔧 配置说明

### 环境变量

创建 `.env` 文件：

```env
# MiMo API 配置
MIMO_API_KEY=your_api_key
MIMO_API_URL=https://api.mimo.com/v1

# 服务器配置
PORT=3001
HOST=0.0.0.0
```

### 移动端推送配置（可选）

```env
# 极光推送
JPUSH_APP_KEY=your_app_key
JPUSH_MASTER_SECRET=your_master_secret
```

## 🐳 Docker 部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 📱 移动端唤醒桌面端

### 工作原理

```
移动端  ──唤醒请求──>  桌面端
  │                      │
  │<─────确认连接────────│
  │                      │
  │────WebSocket连接────>│
  │                      │
  │<───同步状态─────────│
  │                      │
  │─────开始交互────────>│
```

### 使用步骤

1. 在桌面端启动 MiMo Agent
2. 在移动端打开 App
3. 输入桌面端的 IP 地址和端口
4. 点击"连接"按钮
5. 连接成功后即可发送唤醒请求

## 🛠️ 开发指南

### 添加新工具

在 `packages/core/agent/src/index.ts` 中添加：

```typescript
{
  name: 'my_tool',
  description: '工具描述',
  parameters: [
    { name: 'param1', type: 'string', required: true }
  ],
  returns: { type: 'string' },
  handler: async (params, context) => {
    // 工具逻辑
    return '结果';
  }
}
```

### 添加新渠道

参考 `packages/device-bridge` 实现新的设备连接方式。

## 📖 文档

- [产品需求规范](./SPEC.md)
- [API 文档](./docs/api/)
- [架构设计](./docs/architecture/)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件。

---

Made with ❤️ by Eric Bridy
