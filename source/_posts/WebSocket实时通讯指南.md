---
title: "WebSocket 实时通讯：从原理到实战"
date: 2026-03-22
categories: "网络协议"
description: "理解 WebSocket 协议的核心原理，掌握前端 WebSocket 的用法（心跳、重连、二进制数据），对比轮询/SSE 等方案"
tags: ["网络协议"]
copyright: true
---

## 前言

传统的 HTTP 请求是**客户端主动发起，服务端被动响应**——无法实现服务端主动推送。

WebSocket 解决了这个问题：**一次握手，全双工通信**，服务端可以随时推送数据给客户端。

---

## 一、WebSocket 基础

### 1.1 与 HTTP 的对比

```
HTTP 请求-响应模式：
客户端 ──请求──► 服务端
客户端 ◄──响应── 服务端
（每次请求都要重新建立连接）

WebSocket 长连接：
客户端 ═══ 握手 ═══► 服务端
客户端 ◄──推送──── 服务端（随时）
客户端 ──发送────► 服务端（随时）
```

| 特性 | HTTP 轮询 | WebSocket |
|------|----------|-----------|
| 连接方式 | 每次新建 | 一次建立，持续复用 |
| 数据推送 | 只能客户端轮询 | **双向实时推送** |
| 头部开销 | 每次请求都有 HTTP 头 | 少量帧头 |
| 延迟 | 取决于轮询间隔 | 低延迟 |
| 适用场景 | 非实时数据 | 即时通讯、实时更新 |

### 1.2 基础用法

```javascript
// 客户端
const ws = new WebSocket('ws://localhost:8080/ws')

// 连接建立
ws.onopen = () => {
  console.log('连接已建立')
  ws.send('Hello Server!')
}

// 接收消息
ws.onmessage = (event) => {
  console.log('收到:', event.data)
}

// 连接关闭
ws.onclose = () => {
  console.log('连接已关闭')
}

// 连接错误
ws.onerror = (error) => {
  console.error('连接错误:', error)
}

// 发送数据
ws.send(JSON.stringify({ type: 'chat', message: '你好' }))

// 关闭连接
ws.close()
```

---

## 二、生产环境的 WebSocket

### 2.1 心跳机制

由于网络不稳定，WebSocket 连接可能**悄无声息地断开**。心跳用于检测连接是否存活：

```javascript
class WebSocketClient {
  constructor(url, options = {}) {
    this.url = url
    this.reconnectInterval = options.reconnectInterval || 3000
    this.heartbeatInterval = options.heartbeatInterval || 30000
    this.listeners = {}
    this.connect()
  }

  connect() {
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      console.log('连接已建立')
      this.startHeartbeat()
      this.emit('open')
    }

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      // 心跳响应不做处理
      if (data.type === 'pong') return
      this.emit(data.type, data.payload)
    }

    this.ws.onclose = () => {
      console.log('连接关闭，尝试重连...')
      this.stopHeartbeat()
      setTimeout(() => this.connect(), this.reconnectInterval)
    }

    this.ws.onerror = (err) => {
      console.error('连接错误:', err)
      this.ws.close()
    }
  }

  // 心跳：定期发送 ping
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, this.heartbeatInterval)
  }

  stopHeartbeat() {
    clearInterval(this.heartbeatTimer)
  }

  send(type, payload) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(callback)
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach((fn) => fn(data))
  }

  close() {
    this.stopHeartbeat()
    this.ws.close()
  }
}

// 使用
const client = new WebSocketClient('ws://localhost:8080/ws')

client.on('message', (data) => {
  console.log('新消息:', data)
})

client.send('message', { text: '你好' })
```

### 2.2 自动重连

网络抖动导致断开时，自动重连是必备功能：

```javascript
// 已包含在 WebSocketClient 中
// 核心逻辑：onclose 时自动重连
// 指数退避：连续失败时逐渐增大重连间隔
let retryCount = 0

function reconnect() {
  const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
  console.log(`${delay}ms 后重连...`)
  setTimeout(() => {
    retryCount++
    connect()
  }, delay)
}
```

---

## 三、实战场景

### 3.1 即时聊天

```javascript
class ChatClient extends WebSocketClient {
  constructor(url) {
    super(url)
    this.userId = null
  }

  login(userId, token) {
    this.userId = userId
    this.send('auth', { userId, token })
  }

  sendMessage(to, content) {
    this.send('chat', { to, content, from: this.userId })
  }

  joinRoom(roomId) {
    this.send('join', { roomId })
  }
}

const chat = new ChatClient('ws://chat.example.com/ws')
chat.login('user123', 'token')
chat.on('chat', (msg) => {
  console.log(`${msg.from}: ${msg.content}`)
})
```

### 3.2 实时通知

```javascript
// 服务端推送通知
client.on('notification', (notification) => {
  // 展示通知
  showToast(notification.title, notification.body)

  // 更新未读数
  unreadCount.value++

  // 浏览器 Notification API（需用户授权）
  if (Notification.permission === 'granted') {
    new Notification(notification.title, { body: notification.body })
  }
})
```

---

## 四、方案选型

| 方案 | 方向 | 延迟 | 适用场景 |
|------|------|------|---------|
| **WebSocket** | 双向 | 低 | 聊天、实时协作、游戏 |
| **SSE** | 服务端→客户端 | 低 | 通知推送、状态更新 |
| **轮询** | 客户端→服务端 | 高 | 简单场景 |

### SSE（Server-Sent Events）

```javascript
// 如果只需要服务端推送，SSE 更简单
const sse = new EventSource('/api/events')

sse.onmessage = (event) => {
  console.log('收到推送:', event.data)
}

sse.addEventListener('notification', (event) => {
  console.log('通知:', event.data)
})
```

**选型建议：**

```markdown
双向通信（发消息 + 收消息）→ WebSocket
只需接收服务端推送          → SSE（更简单）
兼容性要求高                → 轮询（降级方案）
```

---

## 总结

```javascript
// WebSocket 核心要点：
// 1. 建立连接：new WebSocket(url)
// 2. 发送数据：ws.send(data)
// 3. 接收消息：ws.onmessage
// 4. 必须实现：心跳检测 + 自动重连
// 5. 善用 JSON 格式传输结构化数据

// 一句话：需要实时双向通讯时，WebSocket 是首选方案
```

**推荐阅读：**
- [MDN: WebSocket](https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket)
- [WebSocket 协议 RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455)
