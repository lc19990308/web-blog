---
title: "前端测试指南：Vitest + Playwright 从零到实战"
date: 2026-04-12
categories: "测试"
description: "测试的价值在于给高风险改动提供快速、可信的反馈。本文用 Vitest 覆盖确定性逻辑，用 Playwright 验证关键用户流程，并说明 Mock 与真实依赖的边界。"
tags: ["测试"]
copyright: true
---

## 从风险而不是覆盖率开始

测试不是把每个函数都测一遍。登录、支付、权限切换、数据提交和不可逆操作的失败成本高，应该优先获得稳定的自动化保护；一个简单的展示组件可能只需要少量组件测试，甚至不值得单独写测试。

“70% 单元测试、20% 组件测试、10% E2E”不是通用配方。团队应根据改动速度、业务风险和环境成本选择组合。最重要的是：测试能在行为被破坏时失败，又不会因为内部重构频繁误报。

Vitest 适合快速验证确定性逻辑和组件行为，Playwright 适合从浏览器视角验证跨页面的关键流程。两者不需要互相替代。

## 用 Vitest 保护业务规则

先测试输入与输出明确、没有浏览器环境依赖的逻辑。下面的请求封装明确了成功和非成功响应，测试也覆盖这两条行为，而不是断言内部变量。

```ts
// src/api/user.ts
export async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`)

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json() as Promise<{ id: string; name: string }>
}
```

```ts
// src/api/user.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchUser } from './user'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchUser', () => {
  it('返回接口中的用户信息', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '42', name: '林默' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchUser('42')).resolves.toEqual({ id: '42', name: '林默' })
    expect(fetchMock).toHaveBeenCalledWith('/api/users/42')
  })

  it('在非成功响应时抛出错误', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))

    await expect(fetchUser('42')).rejects.toThrow('Request failed: 503')
  })
})
```

每个测试结束后恢复全局 Mock，避免前一个测试改变后一个测试的环境。涉及时间、随机数和网络时也应显式控制它们；测试顺序不应影响结果。

## 组件测试断言可见行为

组件测试适合验证用户能看到和操作的状态：禁用按钮是否在提交时出现、空数据是否有提示、错误是否能重试。尽量通过角色、标签和文本定位元素，不要依赖组件内部 class 名、私有方法或 DOM 层级。

组件越难测试，往往越说明它同时承担了数据读取、状态转换和展示。把纯业务逻辑抽到普通模块、把副作用集中在边界处，测试和维护都会更简单。

## 用 Playwright 验证一条真实流程

E2E 测试的成本较高，重点覆盖用户完成关键任务所需的路径。下面的测试不依赖 CSS class，而是用页面的可访问语义定位元素：

```ts
import { expect, test } from '@playwright/test'

test('未登录用户访问账单页会看到登录入口', async ({ page }) => {
  await page.goto('/billing')

  await expect(
    page.getByRole('heading', { name: '登录后查看账单' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: '去登录' }),
  ).toHaveAttribute('href', '/login')
})
```

测试身份和数据必须可控。可以由测试环境提供专用账号与重置接口，也可以在边界处拦截第三方服务；不要拿生产账号、真实支付信息或不稳定的公开接口跑 CI。对自家后端的关键契约，至少保留一组连接测试环境的流程，避免全部被 Mock 掩盖。

## 把本地和 CI 的运行环境固定下来

Playwright 应知道如何启动待测应用，并在失败时保留足够的证据。以下配置把本地已有服务与 CI 启动服务区分开：

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
})
```

在 CI 里先安装锁定版本的依赖，再运行单元测试、构建和 E2E。失败的 trace、截图和控制台日志要作为构建产物保留，排查时才能看到用户实际经历的页面状态。

## 不要用数字代替判断

覆盖率可以发现完全没触及的模块，却不能证明断言有价值。一个覆盖率 100% 的测试可能只验证了实现细节；一个覆盖率不高的项目也可能对所有支付和权限风险都有充分保护。

每次改动后更值得问的是：

- 这项改动改变了哪个用户行为或接口契约？
- 成功、拒绝、超时和重复操作是否各有合理处理？
- 测试会在真正的回归发生时失败吗？
- Mock 的边界是否让测试避开了最需要验证的集成？

当测试回答这些问题，它才是重构时可以依靠的反馈，而不是 CI 里的一个绿色图标。

**推荐阅读：** [Vitest 指南](https://vitest.dev/guide/) 与 [Playwright 入门文档](https://playwright.dev/docs/intro)
