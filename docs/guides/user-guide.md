# MiMo Agent Platform 用户指南

## 安装

### 桌面端

1. 下载安装包：
   - Windows: `MiMo-Setup.exe`
   - macOS: `MiMo.dmg`
   - Linux: `MiMo.AppImage`

2. 运行安装包，按照提示完成安装。

3. 首次启动会引导你完成初始配置。

### 移动端

1. Android: 下载 `MiMo.apk` 并安装。
2. iOS: 通过 TestFlight 或 App Store 安装。
3. 安装后打开应用，授予必要权限。

### 命令行 (CLI)

```bash
# 使用 npm 全局安装
npm install -g @mimo/cli

# 验证安装
mimo --version
```

---

## 配置

### 配置 MiMo API

1. 打开设置（桌面端：`Ctrl+,`，移动端：点击设置图标）。
2. 在 "API 配置" 部分：
   - **API Endpoint**: 输入 MiMo API 地址（默认：`https://api.mimo.com/v1`）
   - **API Key**: 输入你的 API Key
3. 点击 "测试连接" 验证配置。
4. 保存设置。

### 配置桌面端

- **项目路径**: 设置默认项目目录。
- **编辑器字体**: 设置 Monaco Editor 字体。
- **主题**: 选择亮色或暗色主题。
- **终端外壳**: 选择默认终端（如 `bash`, `zsh`, `powershell`）。

### 配置移动端

- **服务器 URL**: 输入桌面端 IP 地址（用于连接桌面端）。
- **推送通知**: 启用/禁用推送通知。
- **自动发现**: 启用局域网自动发现桌面端。

---

## 使用指南

### 桌面端

#### 1. 开始对话

1. 打开 MiMo 应用。
2. 在底部输入框输入你的问题或指令。
3. 按 `Enter` 发送（或 `Shift+Enter` 换行）。
4. Agent 会思考并回复。

**示例**:
```
你: 帮我创建一个 React 组件，显示一个按钮，点击后计数加 1。

Agent: 好的，我来帮你创建这个组件...

[Agent 调用工具创建文件 Counter.tsx]

已创建 Counter.tsx，代码如下：
[显示代码内容]

是否要我帮你运行 `npm start` 查看效果？
```

#### 2. 编辑代码

1. 在左侧文件树中点击文件，在编辑器中打开。
2. 编辑代码，会自动保存到磁盘。
3. 你也可以让 Agent 帮你编辑：
   ```
   你: 帮我在 Counter.tsx 中添加一个重置按钮。
   ```

#### 3. 使用终端

1. 点击底部 "终端" 标签。
2. 在终端中输入命令。
3. 你也可以让 Agent 帮你执行命令：
   ```
   你: 帮我安装 axios 依赖。
   ```

#### 4. 管理项目

- 点击 "文件" → "打开文件夹" 选择项目目录。
- 左侧文件树会显示项目结构。
- 右键文件或文件夹可以进行重命名、删除等操作。

---

### 移动端

#### 1. 连接桌面端

**自动发现**（推荐）:
1. 确保手机和电脑在同一局域网。
2. 打开移动端应用，点击 "发现设备"。
3. 应用会自动扫描并列出可用的桌面端设备。
4. 点击设备名称连接。

**手动连接**:
1. 在桌面端打开设置，查看 IP 地址和端口。
2. 在移动端点击 "手动连接"。
3. 输入桌面端的 IP 地址和端口。
4. 点击连接。

#### 2. 发送消息

1. 连接成功后，你可以在移动端发送消息。
2. 消息会发送到桌面端的 Agent 引擎处理。
3. Agent 的回复会同时显示在移动端和桌面端。

#### 3. 查看文件

1. 连接成功后，点击底部 "文件" 标签。
2. 可以浏览桌面端打开的项目文件。
3. 点击文件可以查看内容（只读）。

#### 4. 快速命令

1. 点击底部 "命令" 标签。
2. 这里有一些预设的快速命令：
   - 启动开发服务器
   - 运行测试
   - 构建项目
   - 查看 Git 状态
3. 点击命令即可执行。

---

### 命令行 (CLI)

#### 1. 聊天模式

```bash
# 启动交互式聊天
mimo chat

# 指定项目路径
mimo chat --project /path/to/project

# 指定模型
mimo chat --model mimo-pro
```

#### 2. 单次提问

```bash
# 问一个问题并退出
mimo ask "帮我写一个 Hello World 程序"

# 保存到文件
mimo ask "写一个 React 组件" --output Counter.tsx
```

#### 3. 管理会话

```bash
# 列出所有会话
mimo sessions

# 恢复会话
mimo restore <session-id>

# 删除会话
mimo delete-session <session-id>
```

#### 4. 搜索

```bash
# 搜索文件内容
mimo search "function Counter"

# 只搜索特定文件类型
mimo search "import React" --type .tsx
```

---

## 高级功能

### 1. 工具权限管理

你可以控制 Agent 能使用哪些工具：

1. 打开设置 → 工具权限。
2. 你可以：
   - 禁用危险工具（如 `execute_command`）。
   - 设置工具白名单（只允许特定工具）。
   - 启用沙箱模式（限制文件访问和命令执行）。

### 2. 多设备同步

当你有多个设备（比如一个台式机和一个笔记本）：

1. 在所有设备上登录同一个账号。
2. Agent 会话会自动同步。
3. 你可以在台式机上开始对话，然后在笔记本上继续。

### 3. 自定义工具

（开发者功能）你可以为 Agent 添加自定义工具：

```typescript
// custom-tools.ts
import { Tool } from '@mimo/agent';

const myTool: Tool = {
  name: 'my_custom_tool',
  description: 'My custom tool',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string' }
    }
  },
  handler: async (params) => {
    // 你的工具逻辑
    return { result: 'done' };
  }
};

// 注册工具
agent.registerTool(myTool);
```

---

## 常见问题 (FAQ)

### 1. 连接问题

**Q: 移动端无法发现桌面端？**

A: 请确保：
- 手机和电脑在同一局域网。
- 桌面端 MiMo 应用正在运行。
- 防火墙允许 MiMo 通过。

**Q: 显示 "API Key 无效"？**

A: 请检查：
- API Key 是否正确。
- API Endpoint 是否正确。
- 网络连接是否正常。

### 2. 性能问题

**Q: Agent 响应很慢？**

A: 可能原因：
- MiMo API 响应慢（检查网络连接）。
- 消息历史太长（尝试清空历史）。
- 项目文件太多（尝试关闭不需要的文件）。

### 3. 工具执行问题

**Q: Agent 无法执行命令？**

A: 请检查：
- 工具权限设置是否允许 `execute_command`。
- 终端外壳配置是否正确。
- 命令是否在项目目录中执行。

---

## 键盘快捷键

### 桌面端

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+,` | 打开设置 |
| `Ctrl+N` | 新建文件 |
| `Ctrl+S` | 保存文件 |
| `Ctrl+`` ` | 打开/关闭终端 |
| `Ctrl+Shift+P` | 打开命令面板 |
| `Alt+Up/Down` | 切换终端标签 |

### 移动端

| 手势 | 功能 |
|------|------|
| 左滑 | 打开文件浏览器 |
| 右滑 | 打开设置 |
| 长按消息 | 复制/删除消息 |

---

## 卸载

### 桌面端

- Windows: 控制面板 → 卸载程序 → 找到 MiMo → 卸载。
- macOS: 将 MiMo.app 拖到废纸篓。
- Linux: 取决于安装方式（如 `rm MiMo.AppImage`）。

### 移动端

- Android: 设置 → 应用管理 → MiMo → 卸载。
- iOS: 长按应用图标 → 删除应用。

### CLI

```bash
npm uninstall -g @mimo/cli
```

---

## 获取帮助

- **GitHub Issues**: [github.com/mimo/issues](https://github.com/mimo/issues)
- **Discord 社区**: [discord.gg/mimo](https://discord.gg/mimo)
- **邮件支持**: support@mimo.ai
