# MiMo Agent Platform API 文档

## 概述

MiMo Agent Platform 提供 REST API 和 WebSocket API 两种接口，用于与 Agent 引擎交互。

- **Base URL**: `http://localhost:3000` (Gateway 服务)
- **API Version**: v1
- **Authentication**: API Key 或 JWT Token

---

## 认证

所有 API 请求需要在 Header 中包含认证信息：

```
x-api-key: your-api-key
# 或
Authorization: Bearer your-jwt-token
```

---

## REST API

### 1. 聊天接口

#### POST /api/v1/chat

发送消息给 Agent 并获取响应。

**请求体**:
```json
{
  "message": "帮我写一个 Hello World 程序",
  "sessionId": "optional-session-id",
  "model": "mimo-pro",
  "stream": false
}
```

**响应** (非流式):
```json
{
  "success": true,
  "message": {
    "id": "msg_123",
    "role": "assistant",
    "content": "好的，我来帮你写一个 Hello World 程序...",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "metadata": {
      "model": "mimo-pro",
      "tokens": 150,
      "latency": 1200
    }
  }
}
```

**响应** (流式):
```
Content-Type: text/event-stream

data: {"choices":[{"delta":{"content":"好的"}}]}

data: {"choices":[{"delta":{"content":"，"}}]}

data: [DONE]
```

---

### 2. 会话管理

#### GET /api/v1/sessions

获取会话列表。

**响应**:
```json
{
  "sessions": [
    {
      "id": "session_123",
      "deviceId": "device_456",
      "projectPath": "/path/to/project",
      "startedAt": "2024-01-01T00:00:00.000Z",
      "lastActivity": "2024-01-01T00:05:00.000Z"
    }
  ]
}
```

#### POST /api/v1/sessions

创建新会话。

**请求体**:
```json
{
  "projectPath": "/path/to/project"
}
```

#### DELETE /api/v1/sessions/:id

删除会话。

---

### 3. 设备管

#### GET /api/v1/devices

获取已连接设备列表。

**响应**:
```json
{
  "devices": [
    {
      "deviceId": "device_123",
      "name": "My Desktop",
      "platform": "windows",
      "type": "desktop",
      "status": "connected",
      "lastSeen": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/v1/devices/register

注册设备。

**请求体**:
```json
{
  "name": "My Device",
  "platform": "windows",
  "type": "desktop"
}
```

---

### 4. 文件操作

#### POST /api/v1/files/read

读取文件内容。

**请求体**:
```json
{
  "path": "/path/to/file.txt"
}
```

#### POST /api/v1/files/write

写入文件内容。

**请求体**:
```json
{
  "path": "/path/to/file.txt",
  "content": "Hello World"
}
```

#### POST /api/v1/files/list

列出目录内容。

**请求体**:
```json
{
  "path": "/path/to/directory",
  "recursive": false
}
```

---

### 5. 终端命令

#### POST /api/v1/terminal/execute

执行终端命令。

**请求体**:
```json
{
  "command": "ls -la",
  "cwd": "/path/to/directory"
}
```

**响应**:
```json
{
  "success": true,
  "stdout": "file1.txt\nfile2.txt\n",
  "stderr": "",
  "exitCode": 0
}
```

---

## WebSocket API

### 连接

```
ws://localhost:3000?deviceId=your-device-id&apiKey=your-api-key
```

或使用 Socket.IO 客户端：
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    deviceId: 'your-device-id',
    apiKey: 'your-api-key'
  }
});
```

---

### 客户端事件

#### join

加入会话房间。

```typescript
socket.emit('join', { sessionId: 'session_123' });
```

#### message

发送消息。

```typescript
socket.emit('message', {
  sessionId: 'session_123',
  content: '帮我写一个 Hello World 程序',
  model: 'mimo-pro'
});
```

#### tool:execute

执行工具。

```typescript
socket.emit('tool:execute', {
  toolName: 'read_file',
  params: { path: '/path/to/file.txt' }
}, (result) => {
  console.log(result);
});
```

#### sync:request

请求状态同步。

```typescript
socket.emit('sync:request', {
  sessionId: 'session_123',
  state: { cursorPosition: 100 }
});
```

---

### 服务端事件

#### message

收到 Agent 消息。

```typescript
socket.on('message', (data) => {
  console.log(data.message.content);
});
```

#### 'message:chunk'

收到流式消息片段。

```typescript
socket.on('message:chunk', (data) => {
  console.log(data.chunk); // 增量内容
});
```

#### 'tool:result'

工具执行结果。

```typescript
socket.on('tool:result', (data) => {
  console.log(data.result);
});
```

#### 'sync:update'

状态同步更新。

```typescript
socket.on('sync:update', (data) => {
  console.log(data.state);
});
```

#### error

错误事件。

```typescript
socket.on('error', (data) => {
  console.error(data.error);
});
```

---

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |

**错误响应格式**:
```json
{
  "success": false,
  "error": "错误描述信息"
}
```

---

## 限流

- 每个 API Key 每分钟最多 60 个请求
- 超出限制将返回 429 状态码

---

## 使用示例

### JavaScript/TypeScript

```typescript
import { io } from 'socket.io-client';
import { MiMoConnector } from '@mimo/mimo-connector';

// 使用 REST API
const response = await fetch('http://localhost:3000/api/v1/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your-api-key'
  },
  body: JSON.stringify({
    message: 'Hello',
    sessionId: 'session_123'
  })
});

const data = await response.json();
console.log(data.message.content);

// 使用 WebSocket API
const socket = io('http://localhost:3000', {
  auth: { apiKey: 'your-api-key' }
});

socket.emit('message', {
  sessionId: 'session_123',
  content: 'Hello'
});

socket.on('message', (data) => {
  console.log(data.message.content);
});
```

### curl

```bash
# 发送聊天消息
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "message": "帮我写一个 Hello World",
    "sessionId": "session_123"
  }'
```
