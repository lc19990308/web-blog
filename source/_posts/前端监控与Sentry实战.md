---
title: "前端监控与 Sentry：错误追踪与性能监控实战"
date: 2024-04-10
categories: "监控"
description: "前端上线后不是结束，而是监控的开始。本文介绍如何用 Sentry 搭建前端监控体系，包括错误捕获、SourceMap 上传、性能监控和告警配置"
tags: ["监控"]
copyright: true
---

## 前言

没有监控的前端项目，就像没有仪表盘的飞机——你完全不知道线上发生了什么：

```
用户反馈页面白屏 → 不知道是不是所有用户都受影响
用户说按钮点不动 → 不知道是哪行代码报错
用户说页面很卡  → 不知道渲染性能瓶颈在哪
```

Sentry 是目前最流行的开源监控平台，覆盖**错误追踪** + **性能监控**。

---

## 一、接入 Sentry

```bash
npm install @sentry/vue @sentry/browser
```

```javascript
// main.js
import * as Sentry from '@sentry/vue'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

Sentry.init({
  app,
  dsn: 'https://your-dsn@sentry.io/project-id',
  environment: import.meta.env.MODE,        // production / development
  release: `my-app@${__APP_VERSION__}`,
  tracesSampleRate: 0.2,                    // 性能采样率 20%
  replaysSessionSampleRate: 0.1,            // 录制回放采样
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
})

app.mount('#app')
```

---

## 二、SourceMap 上传

生产代码被压缩混淆过，需要 SourceMap 才能定位到源码：

```javascript
// vite.config.js
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  build: {
    sourcemap: true,   // 生成 SourceMap
  },
  plugins: [
    sentryVitePlugin({
      org: 'my-org',
      project: 'my-project',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
    }),
  ],
})
```

---

## 三、手动上报

```javascript
// 主动捕获错误
try {
  await fetch('/api/data')
} catch (error) {
  Sentry.captureException(error, {
    tags: { api: 'fetchData' },
    extra: { userId: user.value?.id },
  })
}

// 记录消息
Sentry.captureMessage('用户点击了导出按钮', 'info')

// 设置用户上下文（关联错误和用户）
Sentry.setUser({ id: user.id, email: user.email })
```

---

## 四、性能监控

```javascript
// 创建自定义性能事务
const transaction = Sentry.startTransaction({
  name: '页面加载',
  op: 'page-load',
})

// 发起请求
Sentry.startInactiveSpan({ name: 'fetch-user', op: 'http' })

// 测量操作耗时
Sentry.startSpan({ name: '数据处理', op: 'function' }, () => {
  processData()
})
```

---

## 五、部署后检查清单

```markdown
1. SourceMap 上传成功？——在 Sentry 错误堆栈中能看到源码文件名
2. Release 版本号正确？——每个部署对应一个版本
3. Performance 能看到页面？——确认 tracesSampleRate 生效
4. 告警配置完成？——错误率超过阈值时通知
```

---

**推荐阅读：** [Sentry 官方文档](https://docs.sentry.io/)
