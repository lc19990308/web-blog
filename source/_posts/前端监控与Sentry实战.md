---
title: "前端监控与 Sentry：错误追踪与性能监控实战"
date: 2024-04-10
categories: "监控"
description: "接入 Sentry 之前，先定义错误、性能和回放数据的采集边界。本文给出 Vue 项目的初始化、Source Map 发布关联、采样和脱敏检查。"
tags: ["监控"]
copyright: true
---

## 监控先回答四个问题

线上报错的价值不在“多收集一些事件”，而在有人能回答：哪个版本开始出错、影响了多少用户、用户当时在什么操作、修复是否已随新版本上线。Sentry 可以把异常、性能事务和会话回放放到同一处，但采集范围必须先定下来。

接入前至少明确四件事：

- 错误事件要保留哪些上下文，哪些字段绝不能发送。
- 生产、预发和本地环境如何区分，避免测试噪声进入告警。
- 每次部署使用什么稳定的 `release` 名称，通常是应用名加 Git commit SHA。
- 性能和回放分别采样多少，异常发生时是否提高回放采样。

不要把用户邮箱、手机号、完整请求体、授权头或业务密钥作为排障的默认上下文。能关联到账号的内部 ID 往往已经足够。

## Vue 项目的最小初始化

Vue 应用只需要 `@sentry/vue`。下面的例子把环境、版本和采样显式写出来，并在发送前清理可能识别用户的信息。

```ts
// src/main.ts
import * as Sentry from '@sentry/vue'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

Sentry.init({
  app,
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_SENTRY_RELEASE,
  sendDefaultPii: false,
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: import.meta.env.PROD ? 0.1 : 0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event) {
    if (event.request?.headers) {
      delete event.request.headers.Authorization
      delete event.request.headers.authorization
    }

    if (event.user) {
      event.user = event.user.id ? { id: event.user.id } : undefined
    }

    return event
  },
})

app.mount('#app')
```

DSN 可以出现在浏览器配置中，它用于将事件投递到指定项目，不是服务端密钥。上传 Source Map 的认证令牌则必须只存在于 CI 的秘密变量里，不能写进 `VITE_` 环境变量。

登录完成后设置最小用户上下文，退出时清掉它：

```ts
Sentry.setUser({ id: account.id })

// 用户退出
Sentry.setUser(null)
```

## Source Map 要和 Release 对上

压缩后的堆栈只有在三个条件同时满足时才能还原：浏览器上报的 `release` 正确，构建产物已上传 Source Map，上传时的 release 名称与浏览器完全一致。只打开 Vite 的 `sourcemap` 并不能保证这条链路成立。

在 CI 中生成一次 release 名称，同时传给前端构建和 Sentry Vite 插件：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  build: { sourcemap: 'hidden' },
  plugins: [
    vue(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: process.env.SENTRY_RELEASE },
    }),
  ],
})
```

`hidden` 会生成 Source Map 但不在编译后的 JavaScript 中写入 `sourceMappingURL` 注释。部署前仍应确认 `.map` 文件不会被公开托管，或在插件上传成功后从部署目录删除。还要在 Sentry 页面打开一条真实的生产错误，确认堆栈已经显示项目源码和正确行号。

## 用标签补充业务语境

全局异常捕获解决不了所有排障。对于可预期的失败，例如导出接口异常，可以在保留原始错误的前提下补充一个低基数标签。不要把订单号、搜索词一类高基数或敏感数据写进 tag。

```ts
try {
  await exportReport()
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'report-export' },
  })
  throw error
}
```

手动性能测量同样应围绕用户动作，而不是给每个函数包一层监控：

```ts
await Sentry.startSpan(
  { name: 'report.export', op: 'ui.action' },
  async () => {
    await exportReport()
  },
)
```

采样率不是越高越好。它影响费用、网络开销和告警信号质量。错误量很大的项目可先保留全部异常、低比例采样性能事务；高价值路径再用采样函数或明确的 span 增加可见性。

## 上线验收

- 人为抛出一条测试异常，检查环境、release、版本时间和 Source Map 行号。
- 使用真实的 CI 构建流程验证 Source Map 上传，不要只在本地构建测试。
- 审查事件详情、回放和面包屑，确认没有密码、Cookie、授权头和个人文本。
- 为新增问题、回归问题和错误激增设定不同的告警路由，避免所有异常都骚扰同一群人。
- 在一次发布后标记 release 已部署，问题列表才能准确展示“哪一版修复”。

Sentry 记录的是排障线索，不是业务数据仓库。把版本关联和隐私边界做好，告警才会成为能行动的信息。

**推荐阅读：** [Sentry Vue 文档](https://docs.sentry.io/platforms/javascript/guides/vue/)
