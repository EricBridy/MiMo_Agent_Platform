# MiMo Gateway Service

MiMo Agent Platform 的网关服务，提供 REST API 和 WebSocket 网关功能。

## 功能特性

- **REST API**: 完整的 HTTP API 接口
- **WebSocket**: 实时双向通信
- **数据持久化**: SQLite + Prisma ORM
- **认证授权**: API Key + JWT Token
- **限流保护**: 基于 express-rate-limit
- **日志系统**: Winston 日志记录

## 技术栈

- Node.js 20 LTS
- Express 4.x
- Socket.IO 4.x
- Prisma ORM
- SQLite
- TypeScript 5.x

## 安装

```bash
# 安装依赖
npm install

# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init

# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```

## 环境变量

```bash
# 复制环境变量模板
cp .env.example .env
```

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| DATABASE_URL | SQLite 数据库路径 | file:./mimo.db |
| PORT | 服务端口 | 3001 |
| NODE_ENV | 运行环境 | development |
| JWT_SECRET | JWT 密钥 | - |
| API_KEY | API 密钥 | - |
| CORS_ORIGIN | CORS 来源 | http://localhost:3000 |
| LOG_LEVEL | 日志级别 | info |
| MIMO_API_URL | MiMo API 地址 | http://localhost:3002 |

## API 文档

### 认证

所有 API 请求需要在 Header 中携带 API Key:

```
X-API-Key: your-api-key
```

### 会话管理

#### 创建会话
```http
POST /api/v1/chat/sessions
Content-Type: application/json
X-API-Key: your-api-key

{
  "deviceId": "device-001",
  "projectPath": "/path/to/project",
  "context": "optional context"
}
```

#### 获取会话列表
```http
GET /api/v1/chat/sessions?deviceId=device-001
X-API-Key: your-api-key
```

#### 获取会话详情
```http
GET /api/v1/chat/sessions/:id
X-API-Key: your-api-key
```

#### 删除会话
```http
DELETE /api/v1/chat/sessions/:id
X-API-Key: your-api-key
```

### 聊天

#### 发送消息
```http
POST /api/v1/chat/chat
Content-Type: application/json
X-API-Key: your-api-key

{
  "sessionId": "session-id",
  "message": "Hello, MiMo!"
}
```

### 设备管理

#### 注册设备
```http
POST /api/v1/devices/register
Content-Type: application/json
X-API-Key: your-api-key

{
  "id": "device-001",
  "name": "My Desktop",
  "platform": "windows",
  "type": "desktop"
}
```

#### 获取设备列表
```http
GET /api/v1/devices
X-API-Key: your-api-key
```

#### 设备心跳
```http
POST /api/v1/devices/:id/heartbeat
X-API-Key: your-api-key
```

### 项目管理

#### 创建项目
```http
POST /api/v1/projects
Content-Type: application/json
X-API-Key: your-api-key

{
  "name": "My Project",
  "path": "/path/to/project"
}
```

#### 获取项目列表
```http
GET /api/v1/projects
X-API-Key: your-api-key
```

## WebSocket 事件

### 连接

```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### 事件列表

| 事件名 | 方向 | 说明 |
|--------|------|------|
| `join` | Client -> Server | 加入房间 |
| `leave` | Client -> Server | 离开房间 |
| `message` | Bidirectional | 发送/接收消息 |
| `tool` | Bidirectional | 工具调用 |
| `ping` | Client -> Server | 心跳 ping |
| `pong` | Server -> Client | 心跳 pong |

### 示例

```javascript
// 加入房间
socket.emit('join', { sessionId: 'session-id' });

// 发送消息
socket.emit('message', {
  sessionId: 'session-id',
  content: 'Hello!'
});

// 接收消息
socket.on('message', (data) => {
  console.log('Received:', data);
});
```

## 数据库模型

### Session (会话)
- id: String @id
- deviceId: String
- userId: String
- projectPath: String?
- startedAt: DateTime
- lastActivity: DateTime
- context: String?
- messages: Message[]

### Message (消息)
- id: String @id
- sessionId: String
- role: String (user/assistant/system)
- content: String
- timestamp: DateTime
- metadata: String?

### Device (设备)
- id: String @id
- deviceId: String @unique
- name: String
- platform: String
- type: String (desktop/mobile)
- status: String
- lastSeen: DateTime
- capabilities: String?

### Project (项目)
- id: String @id
- name: String
- path: String @unique
- lastOpened: DateTime
- files: ProjectFile[]

## 许可证

MIT
