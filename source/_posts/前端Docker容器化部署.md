---
title: "前端 Docker 容器化：把构建和运行分开"
date: 2025-08-20
categories: "工程化"
description: "用多阶段构建发布 Vite SPA：先判断 Docker 是否值得引入，再处理 pnpm 锁文件、Nginx、运行期配置和部署检查。"
tags: ["工程化"]
copyright: true
---

对静态前端来说，Docker 的价值不是把 Node.js 带到生产环境，而是把**构建环境**固定下来，再只把 `dist/` 交给运行容器。

这样能解决 Node 版本、包管理器和 Nginx 配置在不同环境里漂移的问题。它不会自动解决接口地址、缓存策略或发布回滚，这些仍然要在部署方案里明确。

## 先判断是否值得容器化

Docker 适合需要在 CI、测试环境和生产环境之间保持构建一致的项目，也适合把 Nginx 配置和静态产物一起交付的团队。

如果只是把一个已经构建好的 `dist/` 上传到托管平台，容器通常只会增加维护成本。先确认团队是否真的需要自管运行环境，再决定是否引入镜像构建。

## 构建环境和运行环境

下面这张图描述了静态前端的最小路径。Node 和 pnpm 只出现在构建阶段；运行阶段只有 Nginx、构建产物和浏览器请求的 API。

<iframe class="article-diagram" src="/web-blog/diagrams/docker-static-site-architecture.html" title="前端静态站点容器化架构图" loading="lazy"></iframe>

<p class="diagram-caption">图：构建镜像和运行镜像的职责不同。<a href="/web-blog/diagrams/docker-static-site-architecture.html" target="_blank" rel="noopener">打开可交互架构图</a></p>

## 一个与 pnpm 锁文件一致的 Dockerfile

下面的示例面向 Vite 这类输出 `dist/` 的静态站点。项目使用 `pnpm-lock.yaml`，所以构建阶段同样使用 pnpm；混用 `pnpm-lock.yaml` 和 `npm install` 会让锁定版本失去意义。

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

配套的 `.dockerignore` 至少应排除本地依赖、构建产物和密钥文件：

```gitignore
node_modules
dist
.git
.env*
```

不要把 `.env.production`、私钥或令牌复制进镜像。静态前端打包后的代码任何用户都能下载，前端环境变量不能承载秘密。

## 让 Nginx 正确服务 SPA

`try_files` 负责把浏览器路由回退到 `index.html`。带指纹的静态资源可以长期缓存，而 HTML 应保持较短缓存，避免发布后仍拿到旧入口。

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
```

## 不要把构建期变量当成运行期变量

Vite 的 `VITE_*` 变量会在 `pnpm build` 时写进 JavaScript。容器启动后再执行 `docker run -e VITE_API_URL=...`，并不会改写已经生成的文件。

需要一份镜像部署到多个环境时，有两种常见做法：为每个环境重新构建，或者在容器启动时生成一个公开的 `config.js`，由应用从 `window.__APP_CONFIG__` 读取接口地址。无论选哪种，都要把它写进发布流程，避免“本地对、线上错”。

## 本地运行和发布检查

Compose 文件不需要再写废弃的顶层 `version`。本地先验证镜像能构建、SPA 深链能打开、资源缓存头正确，再交给 CI 推送镜像。

```yaml
services:
  web:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

```bash
docker compose up --build
curl -I http://localhost:8080/
curl -I http://localhost:8080/some/client/route
```

发布时保留不可变的镜像标签，例如 Git commit SHA。回滚应该是重新部署已验证的旧标签，而不是临时在服务器上重新构建。

## 上线前检查

- 锁文件、包管理器和 Dockerfile 是否一致。
- 镜像中是否只留下运行需要的文件。
- SPA 深链、静态资源缓存和错误页是否实际访问过。
- 接口地址属于构建期还是运行期配置，团队是否有一致约定。
- 镜像标签能否定位到一次具体提交并完成回滚。

参考：[Docker 多阶段构建](https://docs.docker.com/build/building/multi-stage/) 与 [Docker Compose](https://docs.docker.com/compose/)。
