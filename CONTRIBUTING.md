# Contributing to MiMo

感谢您对 MiMo 项目的关注！我们欢迎各种形式的贡献。

## 开发环境

- Node.js 18+
- pnpm 8+
- Git

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/yourusername/mimo.git
cd mimo

# 运行初始化脚本
./scripts/setup.sh  # Linux/Mac
# 或
.\scripts\setup.ps1  # Windows

# 启动 Gateway 服务
cd services/gateway
pnpm dev

# 启动桌面端（新终端）
cd apps/desktop
pnpm dev

# 启动移动端（新终端）
cd apps/mobile
pnpm start
```

## 项目结构

```
mimo/
├── apps/
│   ├── desktop/     # Electron 桌面应用
│   └── mobile/      # React Native 移动应用
├── services/
│   └── gateway/     # Node.js API 服务
├── packages/
│   ├── core/        # 核心工具系统
│   ├── shared/      # 共享类型和工具
│   └── device-bridge/  # 设备桥接
└── scripts/         # 开发和部署脚本
```

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式（不影响功能）
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

示例：
```
feat: add file sync between devices
fix: handle session timeout correctly
docs: update API documentation
```

## 代码风格

- 使用 TypeScript 严格模式
- 2 空格缩进
- 单引号
- 分号必需

## 测试

```bash
# 运行所有测试
pnpm test

# 运行特定包测试
pnpm --filter @mimo/core test
```

## 提交 PR

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 问题反馈

如有问题或建议，请提交 [Issue](https://github.com/yourusername/mimo/issues)。
