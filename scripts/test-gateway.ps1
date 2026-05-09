# Gateway Service 测试脚本 (PowerShell)

$GATEWAY_URL = $env:GATEWAY_URL
if (-not $GATEWAY_URL) { $GATEWAY_URL = "http://localhost:3001" }

Write-Host "🧪 Testing Gateway Service at $GATEWAY_URL" -ForegroundColor Cyan
Write-Host ""

# 健康检查
Write-Host "1. Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/health" -Method GET
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# 创建设备
Write-Host "2. Register Device" -ForegroundColor Yellow
try {
    $body = @{
        deviceId = "test-device-001"
        name = "Test Device"
        platform = "windows"
        type = "desktop"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/v1/devices" -Method POST -ContentType "application/json" -Body $body
    $response | ConvertTo-Json -Depth 3
    $DEVICE_ID = $response.data.deviceId
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    $DEVICE_ID = "test-device-001"
}
Write-Host ""

# 获取设备列表
Write-Host "3. List Devices" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/v1/devices" -Method GET
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# 创建会话
Write-Host "4. Create Session" -ForegroundColor Yellow
try {
    $body = @{
        deviceId = $DEVICE_ID
        userId = "test-user"
        projectPath = "/test/project"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/v1/chat/sessions" -Method POST -ContentType "application/json" -Body $body
    $response | ConvertTo-Json -Depth 3
    $SESSION_ID = $response.data.id
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# 获取会话列表
Write-Host "5. List Sessions" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/v1/chat/sessions?deviceId=$DEVICE_ID" -Method GET
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# 发送消息
Write-Host "6. Send Message" -ForegroundColor Yellow
try {
    $body = @{
        sessionId = $SESSION_ID
        message = "Hello, MiMo!"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/v1/chat" -Method POST -ContentType "application/json" -Body $body
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# 获取会话消息
Write-Host "7. Get Session Messages" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/v1/chat/sessions/$SESSION_ID/messages" -Method GET
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# 获取工具列表
Write-Host "8. List Tools" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/v1/tools/list" -Method GET
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# 设备心跳
Write-Host "9. Device Heartbeat" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$GATEWAY_URL/api/v1/devices/$DEVICE_ID/heartbeat" -Method POST
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "✅ All tests completed!" -ForegroundColor Green
