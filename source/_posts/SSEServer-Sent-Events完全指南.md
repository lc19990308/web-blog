---
title: "SSE（Server-Sent Events）完全指南：服务端推送的轻量方案"
date: 2026-04-06
categories: "网络协议"
description: "SSE 是比 WebSocket 更轻量的服务端推送方案。本文从基础用法到生产实践，覆盖 EventSource API、数据格式、断线重连、与 WebSocket 的选型对比"
tags: ["网络协议"]
copyright: true
---

## 前言

SSE（Server-Sent Events）是一种**服务端主动向客户端推送数据**的技术。与 WebSocket 不同，SSE 是**单向的**（服务端→客户端），基于**原生 HTTP 协议**，使用起来非常简单。

**最典型场景：** ChatGPT 的流式输出、实时通知、股票行情、日志推送。

---

## 一、SSE 的核心特点

### 1.1 与 WebSocket 的对比

```
SSE（单向推送）：
客户端 ──请求──────► 服务端
客户端 ◄──持续推送── 服务端（单向）

WebSocket（全双工）：
客户端 ═══ 握手 ═══► 服务端
客户端 ◄──推送────── 服务端
客户端 ──发送──────► 服务端
```

| 特性 | SSE | WebSocket |
|------|-----|-----------|
| **方向** | 服务端→客户端（单向） | **双向** |
| **协议** | **原生 HTTP** | 需要协议升级（ws://）|
| **使用复杂度** | **极低**（原生 EventSource） | 较高 |
| **自动重连** | ✅ **内置**（浏览器自动处理） | ❌ 需要手动实现 |
| **二进制数据** | ❌ 仅文本 | ✅ 支持 |
| **浏览器支持** | 现代浏览器均支持 | 均支持 |
| **最大连接数** | 浏览器限制（通常 6 个）| 无限制 |
| **适用场景** | 通知、推送、流式响应 | 聊天、游戏、实时协作 |

### 1.2 一句话选型

```markdown
只需要「服务端推送，客户端接收」→ SSE（更简单）
需要「双向实时通信」→ WebSocket
```

---

## 二、客户端：EventSource API

### 2.1 基础用法

```javascript
// 创建 SSE 连接
const eventSource = new EventSource('/api/events')

// 监听消息
eventSource.onmessage = (event) => {
  console.log('收到数据:', event.data)
}

// 监听连接打开
eventSource.onopen = () => {
  console.log('SSE 连接已建立')
}

// 监听错误
eventSource.onerror = (err) => {
  console.error('连接出错:', err)
}

// 关闭连接
// eventSource.close()
```

### 2.2 监听命名事件

服务端可以发送不同类型的事件，客户端分别监听：

```javascript
const eventSource = new EventSource('/api/events')

// 监听特定事件
eventSource.addEventListener('notification', (event) => {
  console.log('通知:', JSON.parse(event.data))
})

eventSource.addEventListener('chat', (event) => {
  console.log('聊天消息:', JSON.parse(event.data))
})

eventSource.addEventListener('status', (event) => {
  console.log('状态更新:', event.data)
})

// 通用消息（没有指定事件名）
eventSource.onmessage = (event) => {
  console.log('通用消息:', event.data)
}
```

### 2.3 自动重连

SSE 最大的优势之一：**浏览器内置自动重连**。

```javascript
const eventSource = new EventSource('/api/events')

// 服务端可以控制重连延迟（通过 retry 字段）
// 浏览器在连接断开后会自动重新连接
// 无需手动实现心跳和重连逻辑！

eventSource.onerror = () => {
  console.log('连接断开，浏览器会自动重连...')
  // eventSource.readyState 可以查看当前状态
  // 0 = CONNECTING（正在重连）
  // 1 = OPEN
  // 2 = CLOSED
}
```

---

## 三、服务端：数据格式

SSE 的数据格式非常简单——纯文本，以 `data:` 开头，以 `\n\n` 结尾。

### 3.1 Node.js 实现

```javascript
// Node.js 原生 SSE 服务
import http from 'http'

const server = http.createServer((req, res) => {
  // 设置 SSE 响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',   // SSE 必须
    'Cache-Control': 'no-cache',           // 不缓存
    'Connection': 'keep-alive',            // 保持连接
    'Access-Control-Allow-Origin': '*',    // CORS（需要时）
  })

  // 发送消息
  let count = 0
  const timer = setInterval(() => {
    count++

    // 基础消息格式
    res.write(`data: ${JSON.stringify({ id: count, message: 'Hello' })}\n\n`)

    // 5 秒后关闭
    if (count >= 5) {
      clearInterval(timer)
      res.end()
    }
  }, 1000)

  // 客户端断开时清理
  req.on('close', () => {
    clearInterval(timer)
    console.log('客户端断开连接')
  })
})

server.listen(3001)
```

### 3.2 Express 实现

```javascript
import express from 'express'

const app = express()

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  // 发送命名事件
  res.write('event: notification\n')
  res.write(`data: ${JSON.stringify({ title: '新消息', body: '你有 3 条未读' })}\n\n`)

  // 发送普通消息
  res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`)

  // 设置重连延迟（毫秒）
  res.write('retry: 3000\n\n')

  // 定时推送
  const timer = setInterval(() => {
    res.write(`data: ${new Date().toISOString()}\n\n`)
  }, 5000)

  req.on('close', () => {
    clearInterval(timer)
  })
})

app.listen(3000)
```

### 3.3 SSE 数据格式速查

```markdown
# SSE 数据格式（每行以 \n 结尾，消息以 \n\n 结尾）

data: 数据内容                        # 消息数据（可多行）
data: 第二行数据                      # 多行 data 拼接为一条消息

event: eventName                      # 事件名称（客户端用 addEventListener 监听）
id: msg-123                           # 消息 ID（断线重连时自动发送 Last-Event-ID）
retry: 3000                           # 重连延迟（毫秒）

: 这是一个注释                        # 以 : 开头的是注释

# 一条完整消息示例：
event: notification
id: notif-001
data: {"title":"新消息","body":"你好"}
                                   ← 空行表示消息结束
```

---

## 四、实战场景

### 4.1 ChatGPT 流式输出

```javascript
// 前端：逐字显示 AI 回复
async function fetchAIResponse(prompt) {
  const eventSource = new EventSource(`/api/chat?prompt=${encodeURIComponent(prompt)}`)

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)

    if (data.type === 'token') {
      // 逐 token 追加显示
      outputElement.textContent += data.text
      scrollToBottom()
    }

    if (data.type === 'done') {
      // 流结束
      eventSource.close()
      console.log('生成完成')
    }
  }

  eventSource.onerror = () => {
    // 出错时也关闭
    eventSource.close()
  }
}
```

### 4.2 日志实时推送

```javascript
// 服务端实时推送日志
app.get('/api/logs', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  // 监听日志文件变化
  const watcher = fs.watch('app.log', (eventType) => {
    if (eventType === 'change') {
      const data = fs.readFileSync('app.log', 'utf-8')
      const lines = data.split('\n').filter(Boolean).slice(-10)
      res.write(`data: ${JSON.stringify({ lines })}\n\n`)
    }
  })

  req.on('close', () => {
    watcher.close()
  })
})
```

### 4.3 实时通知

```javascript
// 前端统一通知处理
class NotificationClient {
  constructor(url) {
    this.eventSource = new EventSource(url)
    this.setupListeners()
  }

  setupListeners() {
    this.eventSource.addEventListener('notification', (event) => {
      const data = JSON.parse(event.data)
      this.showNotification(data)
    })

    this.eventSource.onerror = () => {
      console.log('通知服务重连中...')
    }
  }

  showNotification(data) {
    // 更新 UI 上的未读数
    if (data.unreadCount !== undefined) {
      badgeElement.textContent = data.unreadCount
    }

    // 浏览器原生通知
    if (Notification.permission === 'granted') {
      new Notification(data.title, { body: data.body })
    }
  }

  close() {
    this.eventSource.close()
  }
}

const notifier = new NotificationClient('/api/notifications')
```

---

## 五、生产注意事项

### 5.1 连接数限制

```markdown
浏览器对同一域名的 SSE 连接数有限制：
- HTTP/1.1：通常 6 个
- HTTP/2：最多 100 个

解决方案：
- 一个页面只建一个 SSE 连接，通过事件名区分不同类型
- 使用 HTTP/2
```

### 5.2 代理与负载均衡

```nginx
# Nginx 配置 SSE
location /api/events {
  proxy_pass http://backend;
  proxy_http_version 1.1;
  proxy_set_header Connection '';
  proxy_buffering off;           # 关闭缓冲（SSE 必须）
  proxy_cache off;               # 关闭缓存
  chunked_transfer_encoding on;
}
```

### 5.3 断线重连的 ID

```javascript
// 服务端发送 id，客户端重连时自动发送 Last-Event-ID
// 服务端据此恢复断点后的数据

let eventId = 0
const timer = setInterval(() => {
  eventId++
  res.write(`id: ${eventId}\n`)
  res.write(`data: ${JSON.stringify({ eventId, data: '...' })}\n\n`)
}, 1000)
```

---

## 六、完整示例：Vue 3 + SSE

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const messages = ref([])
const connected = ref(false)
let eventSource = null

onMounted(() => {
  eventSource = new EventSource('/api/events')

  eventSource.onopen = () => {
    connected.value = true
  }

  eventSource.onmessage = (event) => {
    messages.value.push({
      id: Date.now(),
      content: event.data,
      time: new Date().toLocaleTimeString(),
    })

    // 只保留最近 50 条
    if (messages.value.length > 50) {
      messages.value.shift()
    }
  }

  eventSource.onerror = () => {
    connected.value = false
  }
})

onUnmounted(() => {
  eventSource?.close()
})
</script>

<template>
  <div class="sse-demo">
    <div class="status" :class="{ connected }">
      {{ connected ? '已连接' : '连接中...' }}
    </div>

    <div class="messages">
      <div v-for="msg in messages" :key="msg.id" class="message">
        <span class="time">{{ msg.time }}</span>
        <span class="content">{{ msg.content }}</span>
      </div>
    </div>
  </div>
</template>
```

---

## 总结

```markdown
SSE 的三大优势：

1. 简单——原生 EventSource API，几行代码搞定
2. 自动重连——浏览器内置，不需要手动实现
3. 基于 HTTP——不需要额外的协议和服务器配置

什么时候用 SSE？
- ChatGPT 流式输出
- 实时通知/提醒
- 状态/进度推送
- 日志实时展示

什么时候用 WebSocket？
- 需要双向通信（聊天、游戏）
- 需要发送二进制数据
- 需要大量并发连接

一句话：SSE 是「够用且简单」的服务端推送方案。
```

**推荐阅读：**
- [MDN: Server-Sent Events](https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events)
- [EventSource API](https://developer.mozilla.org/zh-CN/docs/Web/API/EventSource)
- [SSE vs WebSocket](https://www.developer.com/web-services/server-sent-events-vs-websockets/)
