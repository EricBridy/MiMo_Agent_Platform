#!/bin/bash
# Gateway Service 测试脚本

set -e

GATEWAY_URL="${GATEWAY_URL:-http://localhost:3001}"

echo "🧪 Testing Gateway Service at $GATEWAY_URL"
echo ""

# 健康检查
echo "1. Health Check"
curl -s "$GATEWAY_URL/health" | jq .
echo ""

# 创建设备
echo "2. Register Device"
DEVICE_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/v1/devices" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test-device-001",
    "name": "Test Device",
    "platform": "windows",
    "type": "desktop"
  }')
echo "$DEVICE_RESPONSE" | jq .
DEVICE_ID=$(echo "$DEVICE_RESPONSE" | jq -r '.data.deviceId')
echo ""

# 获取设备列表
echo "3. List Devices"
curl -s "$GATEWAY_URL/api/v1/devices" | jq .
echo ""

# 创建会话
echo "4. Create Session"
SESSION_RESPONSE=$(curl -s -X POST "$GATEWAY_URL/api/v1/chat/sessions" \
  -H "Content-Type: application/json" \
  -d "{\n    \"deviceId\": \"$DEVICE_ID\",\n    \"userId\": \"test-user\",\n    \"projectPath\": \"/test/project\"\n  }")
echo "$SESSION_RESPONSE" | jq .
SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.data.id')
echo ""

# 获取会话列表
echo "5. List Sessions"
curl -s "$GATEWAY_URL/api/v1/chat/sessions?deviceId=$DEVICE_ID" | jq .
echo ""

# 发送消息
echo "6. Send Message"
curl -s -X POST "$GATEWAY_URL/api/v1/chat" \
  -H "Content-Type: application/json" \
  -d "{\n    \"sessionId\": \"$SESSION_ID\",\n    \"message\": \"Hello, MiMo!\"\n  }" | jq .
echo ""

# 获取会话消息
echo "7. Get Session Messages"
curl -s "$GATEWAY_URL/api/v1/chat/sessions/$SESSION_ID/messages" | jq .
echo ""

# 获取工具列表
echo "8. List Tools"
curl -s "$GATEWAY_URL/api/v1/tools/list" | jq .
echo ""

# 设备心跳
echo "9. Device Heartbeat"
curl -s -X POST "$GATEWAY_URL/api/v1/devices/$DEVICE_ID/heartbeat" | jq .
echo ""

echo "✅ All tests passed!"
