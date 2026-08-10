---
title: "浏览器跨标签页通讯方案：BroadcastChannel 与 localStorage"
date: 2022-06-08 18:50:00
updated: 2026-06-23
categories: "JavaScript"
description: "实现浏览器中多个标签页之间的数据通讯，涵盖 BroadcastChannel、localStorage、SharedWorker 等方案的对比与实战"
tags: "JavaScript"
copyright: true
---

## 前言

在浏览器中，不同标签页（同一域名下）之间有时需要共享数据或状态——比如用户在一个标签页退出登录，其他标签页也同步退出。

最常见的实现方式有：
- **BroadcastChannel**（现代推荐）
- **localStorage**（兼容性好）
- **SharedWorker**（复杂场景）

---

## 一、BroadcastChannel（推荐）

### 1.1 基本用法

```javascript
// 页面 A：发送消息
const channelA = new BroadcastChannel('app_channel')
channelA.postMessage({ type: 'LOGOUT', userId: 123 })

// 页面 B：接收消息
const channelB = new BroadcastChannel('app_channel')
channelB.onmessage = (event) => {
  console.log('收到消息:', event.data)
  if (event.data.type === 'LOGOUT') {
    // 执行退出登录
    clearUserSession()
  }
}
```

### 1.2 完整示例

```javascript
// utils/tab-channel.js

const CHANNEL_NAME = 'app_sync'

class TabChannel {
  constructor() {
    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.listeners = []

    this.channel.onmessage = (event) => {
      this.listeners.forEach((fn) => fn(event.data))
    }
  }

  // 发送消息到其他标签页
  send(data) {
    this.channel.postMessage(data)
  }

  // 监听消息
  onMessage(callback) {
    this.listeners.push(callback)
  }

  // 清理
  destroy() {
    this.channel.close()
    this.listeners = []
  }
}

// 使用
const tabChannel = new TabChannel()

// 监听退出事件
tabChannel.onMessage((data) => {
  if (data.type === 'LOGOUT') {
    window.location.href = '/login'
  }
})

// 用户点击退出
document.getElementById('logoutBtn').addEventListener('click', () => {
  tabChannel.send({ type: 'LOGOUT' })
})
```

### 1.3 收发消息

```markdown
发送：BroadcastChannel.postMessage(data)
接收：channel.onmessage / channel.addEventListener('message', handler)
清理：channel.close()

同源策略：必须同源才能通讯
```

---

## 二、localStorage 方案（兼容性更好）

利用 `storage` 事件实现跨标签页通讯：

```javascript
// 页面 A：写入数据
localStorage.setItem('event', JSON.stringify({ type: 'LOGOUT' }))

// 页面 B：监听 storage 事件
window.addEventListener('storage', (event) => {
  if (event.key === 'event') {
    const data = JSON.parse(event.newValue)
    if (data.type === 'LOGOUT') {
      handleLogout()
    }
  }
  // 清除（避免重复触发）
  localStorage.removeItem('event')
})
```

**注意：** `storage` 事件**只在其他标签页修改 localStorage 时触发**，当前页面修改不会触发。

### 适用场景

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 简单消息通知 | **BroadcastChannel** | API 简洁、语义清晰 |
| 需要兼容旧浏览器 | **localStorage** | IE 10+ 支持 |
| 复杂状态共享 | **SharedWorker** | 持久的共享作用域 |
| 实时数据同步 | **BroadcastChannel** | 低延迟、双向 |

---

## 三、兼容性

| 方案 | Chrome | Firefox | Safari | IE |
|------|--------|---------|--------|----|
| **BroadcastChannel** | 54+ | 38+ | 15.4+ | ❌ |
| **localStorage** | 4+ | 3.5+ | 4+ | 8+ |
| **SharedWorker** | 4+ | 3.5+ | 16.4+ | ❌ |

**建议：** 优先使用 BroadcastChannel，降级到 localStorage：

```javascript
function createChannel() {
  if (typeof BroadcastChannel !== 'undefined') {
    return new BroadcastChannel('app_channel')
  }
  // 降级方案：使用 localStorage
  return {
    postMessage: (data) => {
      localStorage.setItem('cross_tab_msg', JSON.stringify(data))
      localStorage.removeItem('cross_tab_msg')
    },
    onmessage: null,
    close: () => {},
  }
}
```

---

## 四、其他方案

### 4.1 SharedWorker

```javascript
// worker.js
const connections = []

self.onconnect = (event) => {
  const port = event.ports[0]
  connections.push(port)

  port.onmessage = (e) => {
    // 广播到所有标签页
    connections.forEach((conn) => conn.postMessage(e.data))
  }
}

// 页面中使用
const worker = new SharedWorker('worker.js')
worker.port.postMessage('Hello from tab')
worker.port.onmessage = (event) => console.log(event.data)
```

### 4.2 window.open + postMessage

```javascript
// 打开新窗口并与其通讯
const childWindow = window.open('/child.html')

// 父 → 子
childWindow.postMessage({ type: 'greeting' }, origin)

// 子 → 父
window.opener.postMessage({ type: 'reply' }, origin)

// 接收
window.addEventListener('message', (event) => {
  console.log(event.data)
})
```

---

## 总结

```javascript
// 选型建议：
//
// ├─ 现代浏览器 → BroadcastChannel ✅（最简单）
// ├─ 需要兼容 IE → localStorage
// ├─ 复杂状态共享 → SharedWorker
// └─ 父子窗口 → window.postMessage

// 核心原则：
// 1. 必须同源
// 2. 接收端要提前监听
// 3. 使用完记得清理（channel.close / removeEventListener）
```

**推荐阅读：**
- [MDN: BroadcastChannel](https://developer.mozilla.org/zh-CN/docs/Web/API/BroadcastChannel)
- [MDN: Window: storage event](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/storage_event)
