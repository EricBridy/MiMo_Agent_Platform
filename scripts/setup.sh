#!/bin/bash
# MiMo 项目初始化脚本

set -e

echo "🚀 Setting up MiMo project..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm
fi

echo "✅ pnpm version: $(pnpm -v)"

# 安装依赖
echo "📦 Installing dependencies..."
pnpm install

# 构建共享包
echo "🔨 Building shared packages..."
pnpm --filter @mimo/shared build
pnpm --filter @mimo/core build

# 初始化 Gateway 数据库
echo "🗄️  Setting up Gateway database..."
cd services/gateway
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from .env.example"
fi

# 检查是否安装了 prisma
if ! command -v npx &> /dev/null; then
    echo "❌ npx is not available"
    exit 1
fi

# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init || true

cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update services/gateway/.env with your configuration"
echo "   2. Start Gateway: cd services/gateway && pnpm dev"
echo "   3. Start Desktop: cd apps/desktop && pnpm dev"
echo "   4. Start Mobile: cd apps/mobile && pnpm start"
echo ""
