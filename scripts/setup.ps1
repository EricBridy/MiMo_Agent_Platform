# MiMo 项目初始化脚本 (PowerShell)

Write-Host "🚀 Setting up MiMo project..." -ForegroundColor Cyan

# 检查 Node.js
$nodeVersion = & node -v 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

$majorVersion = [int]($nodeVersion -replace 'v', '').Split('.')[0]
if ($majorVersion -lt 18) {
    Write-Host "❌ Node.js 18+ is required. Current version: $nodeVersion" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green

# 检查 pnpm
$pnpmVersion = & pnpm -v 2>$null
if (-not $pnpmVersion) {
    Write-Host "📦 Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    $pnpmVersion = & pnpm -v
}

Write-Host "✅ pnpm version: $pnpmVersion" -ForegroundColor Green

# 安装依赖
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
pnpm install

# 构建共享包
Write-Host "🔨 Building shared packages..." -ForegroundColor Yellow
pnpm --filter @mimo/shared build
pnpm --filter @mimo/core build

# 初始化 Gateway 数据库
Write-Host "🗄️  Setting up Gateway database..." -ForegroundColor Yellow
$gatewayPath = Join-Path $PSScriptRoot ".." "services" "gateway"
Push-Location $gatewayPath

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "✅ Created .env file from .env.example" -ForegroundColor Green
}

# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init

Pop-Location

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Update services/gateway/.env with your configuration"
Write-Host "   2. Start Gateway: cd services/gateway && pnpm dev"
Write-Host "   3. Start Desktop: cd apps/desktop && pnpm dev"
Write-Host "   4. Start Mobile: cd apps/mobile && pnpm start"
Write-Host ""
