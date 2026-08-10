---
title: "前端测试指南：Vitest + Playwright 从零到实战"
date: 2026-04-12
categories: "测试"
description: "掌握前端测试的核心概念和工具链：用 Vitest 做单元测试、Playwright 做端到端测试，覆盖实用测试场景"
tags: ["测试"]
copyright: true
---

## 前言

很多前端项目没有测试，原因不外乎：**不知道测什么、不知道怎么测、觉得测试浪费时间**。

但事实是：

- 没有测试的项目，重构时如履薄冰
- 没有测试的代码，上线后 Bug 频发
- 没有测试的团队，CR 时只能靠肉眼

本文用两个主流工具——**Vitest（单元测试）**和 **Playwright（E2E 测试）**，覆盖从函数到页面的测试场景。

---

## 一、测试金字塔

```
        ╱  E2E（端到端）  ╲         ← 慢但覆盖真实场景
       ╱    集成测试       ╲        ← 适中
      ╱   单元测试（最多）   ╲       ← 最快、最多
```

| 层级 | 工具 | 运行速度 | 维护成本 | 覆盖率 |
|------|------|---------|---------|--------|
| 单元测试 | Vitest | 毫秒级 | 低 | 代码逻辑 |
| 组件测试 | Vitest + Vue Test Utils | 秒级 | 中 | 组件行为 |
| E2E 测试 | Playwright | 秒-分级 | 高 | 用户流程 |

**推荐比例：** 70% 单元测试 + 20% 组件测试 + 10% E2E 测试。

---

## 二、Vitest——单元测试

### 2.1 安装与配置

```bash
npm install -D vitest
```

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
```

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 2.2 基础测试

```javascript
// src/utils/math.js
export function add(a, b) { return a + b }
export function isEven(n) { return n % 2 === 0 }
export function unique(arr) { return [...new Set(arr)] }
```

```javascript
// src/utils/__tests__/math.test.js
import { describe, it, expect } from 'vitest'
import { add, isEven, unique } from '../math'

describe('add', () => {
  it('两个正数相加', () => {
    expect(add(1, 2)).toBe(3)
  })

  it('负数相加', () => {
    expect(add(-1, -2)).toBe(-3)
  })
})

describe('isEven', () => {
  it('偶数返回 true', () => {
    expect(isEven(2)).toBe(true)
    expect(isEven(0)).toBe(true)
  })

  it('奇数返回 false', () => {
    expect(isEven(3)).toBe(false)
  })
})

describe('unique', () => {
  it('去除重复项', () => {
    expect(unique([1, 2, 2, 3])).toEqual([1, 2, 3])
  })

  it('保持顺序', () => {
    expect(unique([3, 1, 2, 3])).toEqual([3, 1, 2])
  })
})
```

### 2.3 异步测试

```javascript
// src/utils/api.js
export async function fetchUser(id) {
  const res = await fetch(`/api/user/${id}`)
  if (!res.ok) throw new Error('请求失败')
  return res.json()
}
```

```javascript
import { describe, it, expect, vi } from 'vitest'
import { fetchUser } from '../api'

describe('fetchUser', () => {
  it('成功获取用户', async () => {
    const mockUser = { id: 1, name: '张三' }

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUser),
    })

    const user = await fetchUser(1)
    expect(user.name).toBe('张三')
    expect(fetch).toHaveBeenCalledWith('/api/user/1')
  })

  it('请求失败时抛出错误', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    })

    await expect(fetchUser(1)).rejects.toThrow('请求失败')
  })
})
```

---

## 三、Playwright——端到端测试

### 3.1 安装与配置

```bash
npm install -D @playwright/test
npx playwright install  # 安装浏览器
```

```javascript
// playwright.config.js
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
})
```

### 3.2 编写 E2E 测试

```javascript
// e2e/login.spec.js
import { test, expect } from '@playwright/test'

test.describe('登录页面', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('页面正常渲染', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('登录')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('空表单提交显示错误', async ({ page }) => {
    await page.click('button[type="submit"]')
    await expect(page.locator('.error')).toBeVisible()
  })

  test('错误邮箱格式提示', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid-email')
    await page.fill('input[type="password"]', '123456')
    await page.click('button[type="submit"]')
    await expect(page.locator('.error')).toContainText('邮箱格式不正确')
  })

  test('正确登录后跳转到首页', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'correct-password')
    await page.click('button[type="submit"]')

    // 等待跳转
    await page.waitForURL('/dashboard')
    await expect(page.locator('.welcome')).toContainText('欢迎回来')
  })
})
```

### 3.3 数据 Mock

```javascript
// 拦截 API 请求，不依赖后端
test('拦截 API 返回 Mock 数据', async ({ page }) => {
  // 拦截接口，返回 mock 数据
  await page.route('*/**/api/user/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, name: '张三' }),
    })
  })

  await page.goto('/profile')
  await expect(page.locator('.user-name')).toHaveText('张三')
})
```

---

## 四、测试覆盖率目标

```markdown
| 类型 | 覆盖率目标 | 重点关注 |
|------|-----------|---------|
| 工具函数 | 100% | 边界情况、错误处理 |
| API 调用 | 100% | 成功/失败、超时 |
| 组件渲染 | 80%+ | Props 变化、插槽 |
| 用户流程 | 核心路径 | 登录、下单、支付 |
```

---

## 五、测试规范建议

```markdown
1. 测试文件名
   math.js → math.test.js 或 math.spec.js

2. 测试结构（AAA 模式）
   - Arrange（准备数据）
   - Act（执行操作）
   - Assert（断言结果）

3. 测试内容
   - 正常路径（happy path）
   - 边界情况（空、负数、最大值）
   - 错误路径（网络失败、参数错误）

4. 不要做的事
   - 测试框架/库的内部实现
   - 测试第三方库的功能
   - 写过于脆弱的测试（与实现细节耦合）
```

---

## 总结

```javascript
// 测试核心原则：
//
// 1. 测试行为，而非实现——重构时不改测试
// 2. 单元测试要快——毫秒级反馈
// 3. E2E 测试覆盖核心流程——不追求全覆盖
// 4. Mock 外部依赖——数据库、API、时间

// 推荐工具链：
// Vitest——最快的 JS 测试框架
// Playwright——最强大的 E2E 测试工具
// 它们都是新一代工具，体验远超 Jest/Cypress
```

**推荐阅读：**
- [Vitest 官方文档](https://vitest.dev/)
- [Playwright 官方文档](https://playwright.dev/)
