---
title: "前端构建流水线与 CI/CD 最佳实践"
date: 2026-07-19
categories: "工程化"
description: "从代码提交到生产部署，构建一套完整的前端 CI/CD 流水线——代码检查、自动化测试、构建、部署、监控"
tags: ["工程化", "部署"]
copyright: true
---

## 前言

CI/CD（持续集成/持续部署）是现代前端工程化中不可或缺的一环。一个成熟的流水线应该：

-   代码提交后自动检查质量
-   通过测试后自动构建
-   构建成功后自动部署
-   部署后自动监控

本文将基于 GitHub Actions，搭建一套完整的前端 CI/CD 流水线。

---

## 一、CI/CD 整体流程

```
代码 Push/PR
    ↓
Lint + Type Check   ← 代码质量
    ↓
Unit Test           ← 功能验证
    ↓
Build               ← 构建产物
    ↓
E2E Test            ← 集成验证
    ↓
Deploy（Preview）   ← Staging 环境
    ↓
Deploy（Production）← 生产环境
    ↓
监控告警             ← 线上质量
```

---

## 二、GitHub Actions 配置

### 2.1 基础配置

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test:
    name: Tests
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run test:ci -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
```

### 2.2 构建与部署

```yaml
  build:
    name: Build
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run build
        env:
          VITE_API_BASE: ${{ vars.API_BASE }}

      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  deploy-staging:
    name: Deploy to Staging
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/

      - name: Deploy to Vercel (Preview)
        run: npx vercel --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 三、代码质量检查

### 3.1 ESLint + Prettier

```json
{
  "scripts": {
    "lint": "eslint src/ --max-warnings 0",
    "format": "prettier --check src/",
    "type-check": "tsc --noEmit"
  }
}
```

### 3.2 提交预检查（Husky + lint-staged）

```bash
npm install -D husky lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.json": ["prettier --write"]
  }
}
```

```bash
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

---

## 四、自动化测试

### 4.1 单元测试（Vitest）

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
})
```

### 4.2 E2E 测试（Playwright）

```yaml
  e2e:
    name: E2E Tests
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps

      - uses: actions/download-artifact@v4
        with:
          name: build-output
          path: dist/

      - name: Start preview server
        run: npx serve dist -l 4173 &

      - name: Run E2E tests
        run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 五、部署策略

### 5.1 环境管理

```ts
// src/config/env.ts
const env = {
  development: {
    API_BASE: 'http://localhost:3000',
    ENABLE_ANALYTICS: false,
  },
  staging: {
    API_BASE: 'https://staging-api.example.com',
    ENABLE_ANALYTICS: true,
  },
  production: {
    API_BASE: 'https://api.example.com',
    ENABLE_ANALYTICS: true,
  },
}[import.meta.env.MODE]
```

### 5.2 Docker 部署

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```yaml
# .github/workflows/deploy-docker.yml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: my-app:${{ github.sha }}
```

---

## 六、监控与告警

### 6.1 性能监控

```ts
// 集成 Sentry
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.1,  // 采样率
  release: __APP_VERSION__,
})
```

### 6.2 部署后健康检查

```yaml
- name: Health Check
  run: |
    curl --retry 5 --retry-delay 10 --retry-all-errors \
      https://example.com
```

---

## 七、最佳实践总结

1. **Fast Fail**：Lint 和类型检查放最前面，快速让不合格的 PR 失败
2. **缓存依赖**：`actions/setup-node` 启用 `cache: 'npm'`，节省 30s+
3. **并行化**：没有依赖的 job 用 `needs` 解耦，并行执行
4. **产物 artifact**：build 产物通过 artifact 传递，避免重复构建
5. **环境变量分离**：用 GitHub Actions 的 `vars` 和 `secrets`，不要在代码中硬编码
6. **Preview Deploy**：每个 PR 自动生成预览链接，方便 Review

---

## 八、总结

CI/CD 不是"上了就完事"，而是一个持续优化的过程。从简单的 Lint → Build → Deploy 开始，逐步加入测试、E2E、监控。

**核心目标：** 让开发者只需要 `git push`，剩下的一切自动化完成。
