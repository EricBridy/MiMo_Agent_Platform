# MiMo Agent Platform - Docker配置

# Node.js基础镜像
FROM node:20-slim AS base

# 安装构建依赖
FROM base AS build-deps
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# 构建阶段
FROM build-deps AS builder
WORKDIR /app

# 复制并构建包
COPY package*.json ./
COPY packages packages
COPY apps apps

RUN npm ci --legacy-peer-deps
RUN npm run build --workspaces --if-present

# 生产阶段
FROM base AS production
WORKDIR /app

# 安装运行时依赖
RUN apt-get update && apt-get install -y \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# 复制构建产物
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps ./apps
COPY package*.json ./

# 安装生产依赖
RUN npm ci --omit=dev --legacy-peer-deps

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 使用dumb-init管理进程
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/desktop/dist/main/index.js"]
