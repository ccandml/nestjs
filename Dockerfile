# 构建阶段
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段（只保留编译后的文件，无源码无开发依赖）
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# 时区
RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo Asia/Shanghai > /etc/timezone

CMD ["node", "dist/main.js"]
EXPOSE 3000