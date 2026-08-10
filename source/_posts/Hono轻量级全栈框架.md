---
title: "Hono 适合放在前端项目的哪一层"
date: 2025-11-05
categories: "Node.js"
description: "Hono 适合做边缘函数、BFF 和小型 API。本文从运行时选择、路由组织到 Node 部署，说明它解决什么、不解决什么。"
tags: ["Node.js"]
copyright: true
---

Hono 是一个面向 Web 标准 API 的轻量 Web 框架。它可以运行在 Workers、Bun、Deno 和 Node 等环境，但这不意味着每个前端项目都该把它当成完整后端。

对前端团队更有价值的使用方式，通常是把 Hono 放在 BFF、边缘接口或一组小型服务里：把鉴权后的数据组合、接口适配和少量业务规则放在靠近前端的位置。

## 先选运行时，再选部署方式

同一份路由可以运行在不同运行时，入口和部署方式会随适配器变化。先确认目标平台：如果部署到 Cloudflare Workers，就使用对应的 Worker 入口；如果服务运行在现有 Node 服务器上，再使用 Node 适配器。

```bash
npm create hono@latest my-hono-app
cd my-hono-app
npm install
npm run dev
```

不要因为框架小就忽略运行时限制。数据库驱动、文件访问、长连接和后台任务是否可用，取决于最终部署的平台，而不是路由写法。

## 一个适合 BFF 的最小 Node 服务

下面的例子只负责把浏览器请求转成稳定的 JSON 响应。它没有假装自己是订单、权限和消息队列全都包办的后端。

```ts
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/health', (c) => c.json({ ok: true }))

app.get('/api/profile', async (c) => {
  const authorization = c.req.header('Authorization')
  if (!authorization) return c.json({ message: 'Unauthorized' }, 401)

  // 这里通常调用已有的用户服务，而不是直接复制领域逻辑。
  return c.json({ id: 'demo-user', name: 'LC' })
})

serve({
  fetch: app.fetch,
  port: 3000
})
```

路由层保持薄一些更容易维护：验证输入、调用已有服务、转换响应、处理已知错误。需要跨多个实体的复杂事务时，应把规则放回领域服务或数据库层。

## 中间件只放跨路由规则

日志、请求 ID、CORS、认证和错误处理适合中间件。不要把具体页面的判断塞进全局中间件，否则调试时很难看出一个请求为什么被拦截。

```ts
app.use('/api/*', async (c, next) => {
  const requestId = crypto.randomUUID()
  c.header('X-Request-Id', requestId)
  await next()
})
```

## 适合与不适合的边界

适合：边缘函数、API 网关的轻量适配、为前端聚合多个后端接口、需要很快迭代的小型服务。

不适合：团队还没有定义领域边界，却希望靠一个新框架解决数据建模、异步任务、权限系统和可观测性。那些问题仍要靠架构、数据库和运维方案处理。

开始前可以问三个问题：服务运行在哪里；它依赖哪些平台能力；出现错误时日志和告警去哪里。能回答清楚，再把 Hono 放进生产路径。

参考：[Hono 官方文档](https://hono.dev/) 与 [Node.js 适配器](https://hono.dev/docs/getting-started/nodejs)。
