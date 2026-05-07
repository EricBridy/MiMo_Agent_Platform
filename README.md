# MiMo Agent Platform

**MiMo大模型Agent编程开发平台** - 跨平台AI编程工具，支持Windows、Linux、macOS、Android、iOS，实现移动端唤醒桌面端进行编程工作。

## 🌟 特性

- 🤖 **MiMo大模型集成** - 基于小米大模型的AI编程助手
- 🖥️ **跨平台支持** - Windows、Linux、macOS、Android、iOS
- 📱 **移动端唤醒** - 移动设备随时唤醒桌面端进行工作
- 🔄 **实时同步** - 多设备间状态和代码同步
- 🛠️ **丰富工具** - 文件操作、代码搜索、Git操作、终端执行
- 🔌 **插件系统** - 扩展Agent能力
- 🌐 **多渠道支持** - CLI、GUI、移动端多入口

## 🚀 快速开始

### 环境要求

- Node.js 20+
- npm 10+
- Git

### 安装

```bash
# 克隆仓库
git clone https://github.com/EricBridy/MiMo_Agent_Platform.git

# 进入目录
cd MiMo_Agent_Platform

# 安装依赖
npm install

# 启动桌面端
npm run dev:desktop
```

## 📦 应用

### 桌面端 (Electron)
```bash
cd apps/desktop
npm install
npm run dev
```

### 移动端 (React Native)
```bash
cd apps/mobile
npm install
npm run android   # Android
npm run ios        # iOS
```

### 命令行工具
```bash
cd apps/cli
npm install
npm link
mimo --help
```

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面层                             │
├─────────────────────────────────────────────────────────────┤
│  Web桌面端 │ Electron桌面端 │ React Native移动端 │ CLI终端   │
├─────────────────────────────────────────────────────────────┤
│                       API网关层                              │
├─────────────────────────────────────────────────────────────┤
│                      Agent核心层                             │
├─────────────────────────────────────────────────────────────┤
│                      服务集成层                              │
├─────────────────────────────────────────────────────────────┤
│                      数据存储层                              │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ 技术栈

- **桌面端**: Electron 28+, React 18, TypeScript 5
- **移动端**: React Native 0.73+, TypeScript 5
- **后端**: Node.js 20, Express, Socket.IO
- **AI**: LangChain, MiMo API

## 📖 文档

- [产品需求规范](./SPEC.md)
- [架构设计](./docs/architecture/)
- [API文档](./docs/api/)
- [使用指南](./docs/guides/)

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 联系方式

- GitHub: https://github.com/EricBridy/MiMo_Agent_Platform
- 问题反馈: GitHub Issues

---

Made with ❤️ by Eric Bridy
