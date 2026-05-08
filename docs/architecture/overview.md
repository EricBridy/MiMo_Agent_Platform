# MiMo Agent Platform 架构文档

## 系统概述

MiMo Agent Platform 是一个跨平台的 AI 编程助手，支持桌面端、移动端和命令行界面。用户可以通过移动端唤醒桌面端进行编程工作，实现跨设备的无缝体验。

---

## 架构分层

系统采用分层架构，从下到上分为：

```
┌─────────────────────────────────────────────────────┐
│             用户界面层 (Presentation Layer)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐ │
│  │ Desktop  │ │ Mobile   │ │ Web      │ │ CLI │ │
│  │ Electron │ │ React Nat│ │ React    │ │     │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────┘ │
└─────────────────────────────────────────────────────┘
                          ↓ (HTTP / WebSocket)
┌─────────────────────────────────────────────────────┐
│             API 网关层 (API Gateway Layer)          │
│  ┌─────────────────────────────────────────────┐  │
│  │  Gateway Service (Express + Socket.IO)      │  │
│  │  - REST API 路由                          │  │
│  │  - WebSocket 事件处理                     │  │
│  │  - 认证中间件                             │  │
│  │  - 限流保护                               │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│             Agent 核心层 (Agent Core Layer)         │
│  ┌──────────────┐  ┌──────────────────────┐     │
│  │ Agent Engine │  │   MiMo Connector     │     │
│  │  - 消息处理  │  │   - chat            │     │
│  │  - 工具调用  │  │   - complete        │     │
│  │  - 历史管理  │  │   - embed           │     │
│  └──────────────┘  └──────────────────────┘     │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│           服务集成层 (Service Integration Layer)     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Device   │ │ Sync     │ │ File     │        │
│  │ Bridge   │ │ Service  │ │ System  │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Terminal │ │ Git      │ │ Browser  │        │
│  │ Execution│ │ Service  │ │ Control  │        │
│  └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│            数据存储层 (Data Storage Layer)          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ SQLite   │  │ Redis    │  │ Local    │    │
│  │ (Prisma) │  │ (Cache) │  │ Files    │    │
│  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 核心组件

### 1. Agent Engine (Agent 引擎)

**路径**: `packages/core/agent/`

**职责**:
- 处理用户输入并调用 MiMo API
- 管理对话历史和上下文
- 执行工具调用
- 处理多步骤任务

**关键类**:
```typescript
class AgentEngine extends EventEmitter {
  // 处理用户请求
  async processRequest(request: AgentRequest): Promise<AgentResponse>
  
  // 执行工具
  async executeTool(toolName: string, params: Record<string, unknown>): Promise<ToolResult>
  
  // 获取消息历史
  getMessageHistory(): AgentMessage[]
  
  // 压缩历史（节省 Token）
  compactHistory(maxMessages: number): void
}
```

---

### 2. MiMo Connector (MiMo 连接器)

**路径**: `packages/mimo-connector/`

**职责**:
- 封装 MiMo API 调用
- 支持流式和非流式响应
- 错误处理和重试

**接口**:
```typescript
class MiMoConnector {
  // 聊天接口
  async chat(params: ChatRequest): Promise<ChatResponse>
  
  // 流式聊天
  async streamChat(params: ChatRequest, callback: (chunk: string) => void): Promise<void>
  
  // 代码补全
  async complete(params: CompletionRequest): Promise<CompletionResponse>
  
  // 文本嵌入
  async embed(params: EmbedRequest): Promise<EmbedResponse>
}
```

---

### 3. Device Bridge (设备桥接)

**路径**: `packages/device-bridge/`

**职责**:
- 管理设备间通信
- 心跳检测
- 设备能力协商
- 会话迁移

**事件**:
```typescript
// 客户端发送
socket.emit('join', { sessionId })
socket.emit('message', { content, sessionId })
socket.emit('tool:execute', { toolName, params })

// 服务端发送
socket.on('message', (data) => {})
socket.on('tool:result', (data) => {})
socket.on('sync:update', (data) => {})
```

---

### 4. Sync Service (同步服务)

**路径**: `packages/core/sync/`

**职责**:
- 跨设备状态同步
- 冲突解决
- 操作日志管理

**同步类型**:
- 编辑器状态（光标位置、选中内容）
- 对话历史
- 项目状态（打开的文件、文件树展开状态）

---

## 数据流

### 1. 用户发送消息流程

```
用户 → UI → Gateway → Agent Engine → MiMo API → Agent Engine → Gateway → UI → 用户
```

**详细步骤**:
1. 用户在 UI 输入消息
2. UI 通过 WebSocket 发送 `message` 事件到 Gateway
3. Gateway 转发给 Agent Engine
4. Agent Engine 调用 MiMo API
5. MiMo API 返回响应
6. Agent Engine 处理响应并触发 `message` 事件
7. Gateway 将响应通过 WebSocket 发送到 UI
8. UI 更新显示响应

---

### 2. 工具执行流程

```
Agent Engine → Tool Permission Check → Execute Tool → Return Result → Agent Engine
```

**详细步骤**:
1. Agent Engine 决定需要调用工具
2. 权限管理器检查工具是否允许使用
3. 如果允许，执行工具处理函数
4. 工具返回结果
5. Agent Engine 将结果加入到上下文
6. 继续调用 MiMo API（如果需要）

---

### 3. 跨设备同步流程

```
Device A → Sync Service → Database → Sync Service → Device B
```

**详细步骤**:
1. Device A 的状态发生变化
2. Sync Service 记录操作日志
3. 操作日志保存到数据库
4. Sync Service 通知其他设备（Device B）
5. Device B 拉取操作日志
6. Device B 应用操作日志，更新本地状态

---

## 安全设计

### 1. 认证

- API Key 认证（简单场景）
- JWT Token 认证（企业场景）

### 2. 权限控制

- 工具权限管理（白名单/黑名单）
- 危险操作确认（删除文件、执行命令等）
- 沙箱模式（限制文件访问和命令执行）

### 3. 数据安全

- API Key 加密存储
- 会话数据本地存储（SQLite）
- 敏感信息不记录日志

---

## 性能优化

### 1. 消息历史压缩

当消息数量超过阈值时，压缩早期消息以节省 Token。

```typescript
agent.compactHistory(20); // 保留最近 20 条消息
```

### 2. 文件读取缓存

缓存最近读取的文件内容，减少磁盘 I/O。

### 3. WebSocket 心跳优化

使用 ping/pong 机制检测连接状态，避免频繁轮询。

### 4. 数据库查询优化

- 使用索引加速查询
- 分页加载历史消息
- 定期清理过期数据

---

## 扩展性设计

### 1. 工具系统

工具系统采用插件化设计，可以轻松添加新的工具。

```typescript
const customTool: Tool = {
  name: 'my_custom_tool',
  description: 'My custom tool',
  parameters: { ... },
  handler: async (params, context) => { ... }
};

agent.registerTool(customTool);
```

### 2. 多模型支持

通过 MiMo Connector 可以轻松切换到其他 AI 模型。

### 3. 多设备支持

设备桥接层支持任意数量的设备同时连接。

---

## 部署架构

### 开发环境

```
┌─────────────────┐
│   Desktop App   │ ← → Mock API (services/mock-api)
│   (Electron)    │ ← → SQLite (local)
└─────────────────┘
```

### 生产环境

```
                    ┌──────────────┐
                    │   Load       │
                    │   Balancer   │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────▼─────┐ ┌────▼─────┐ ┌────▼─────┐
     │ Gateway 1   │ │ Gateway 2 │ │ Gateway 3 │
     └──────┬─────┘ └────┬─────┘ └────┬─────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
                    ┌──────▼─────┐
                    │   Redis     │
                    │   (Cache)  │
                    └──────┬─────┘
                           │
                    ┌──────▼─────┐
                    │  SQLite    │
                    │  (Prisma) │
                    └────────────┘
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面端 | Electron 28+, React 18, TypeScript 5, Monaco Editor |
| 移动端 | React Native 0.73+, Socket.IO Client |
| 后端 | Node.js 20, Express, Socket.IO |
| 数据库 | SQLite, Prisma ORM |
| AI | MiMo API |
| 构建 | Vite, electron-builder |
| 测试 | Jest, React Testing Library |

---

## 目录结构

详见 [项目结构文档](./project-structure.md)（待创建）。

---

## 贡献指南

详见 [开发者文档](../guides/developer-guide.md)。
