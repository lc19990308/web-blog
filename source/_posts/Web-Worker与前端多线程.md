---
title: "Web Worker 与前端多线程：不只是为了不卡顿"
date: 2025-07-15
categories: "JavaScript"
description: "JavaScript 是单线程的，但 Web Worker 提供了真正的多线程能力。本文从 Dedicated Worker 到 Shared Worker、Service Worker，覆盖数据处理、离屏 Canvas 渲染等实战场景"
tags: "JavaScript"
copyright: true
---

## 前言

JavaScript 运行在单线程上——这意味着如果有一段代码执行了 500ms，用户的点击、滚动、动画全部卡住。

**Web Worker** 让 JS 有了真正的多线程：在后台线程运行代码，不阻塞主线程。

---

## 一、Dedicated Worker——专用线程

最基础也是最常用的 Worker，一个 Worker 对应一个使用方。

### 1.1 基础用法

```javascript
// main.js——主线程
const worker = new Worker('worker.js')

// 向 Worker 发消息
worker.postMessage({ type: 'process', data: largeArray })

// 接收 Worker 返回的结果
worker.onmessage = (event) => {
  console.log('Worker 处理完成:', event.data)
}

// 错误处理
worker.onerror = (err) => {
  console.error('Worker 出错:', err.message)
}
```

```javascript
// worker.js——后台线程
self.onmessage = (event) => {
  const { type, data } = event.data

  if (type === 'process') {
    // 执行耗时操作——不阻塞主线程
    const result = heavyComputation(data)
    self.postMessage(result)
  }
}

function heavyComputation(data) {
  // 模拟大数据处理
  return data.map(item => item * 2).filter(n => n > 100)
}
```

### 1.2 实战：大数据搜索过滤

```javascript
// 当列表有 10 万条数据需要过滤时
function searchProducts(keyword) {
  // 如果主线程过滤，输入时会卡顿
  // 交给 Worker
  searchWorker.postMessage({ keyword, data: productList })
}

searchWorker.onmessage = (event) => {
  renderResults(event.data)  // UI 更新
}
```

```javascript
// search-worker.js
const cache = new Map()

self.onmessage = (event) => {
  const { keyword, data } = event.data
  const cacheKey = `${keyword}_${data.length}`

  if (cache.has(cacheKey)) {
    self.postMessage(cache.get(cacheKey))
    return
  }

  const result = data.filter(item =>
    item.name.includes(keyword) || item.tags.some(t => t.includes(keyword))
  )

  cache.set(cacheKey, result)
  self.postMessage(result)
}
```

---

## 二、Shared Worker——共享线程

多个同源页面共享同一个 Worker 实例，适用于跨标签页数据同步。

```javascript
// 所有页面连接同一个 Shared Worker
const worker = new SharedWorker('shared-worker.js')

// 发送消息
worker.port.postMessage({ type: 'getState' })

// 接收消息
worker.port.onmessage = (event) => {
  console.log('共享状态:', event.data)
}
```

```javascript
// shared-worker.js
let sharedState = { count: 0 }
const ports = new Set()

self.onconnect = (event) => {
  const port = event.ports[0]
  ports.add(port)

  port.onmessage = (e) => {
    if (e.data.type === 'increment') {
      sharedState.count++
      // 广播到所有连接的页面
      ports.forEach(p => p.postMessage(sharedState))
    }
  }
}
```

---

## 三、Service Worker——网络代理

Service Worker 是浏览器和网络之间的**代理层**，可以拦截请求、管理缓存、实现离线访问。

```javascript
// sw.js
const CACHE_NAME = 'my-app-v1'
const urlsToCache = ['/', '/styles.css', '/app.js']

// 安装时缓存资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
})

// 拦截请求：缓存优先，网络兜底
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})

// 激活时清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    })
  )
})
```

---

## 四、Worker 限制与适用场景

```markdown
### Worker 不能做的事
❌ 操作 DOM（不能访问 document/window）
❌ 使用某些 Web API（localStorage、alert）
❌ 跨域加载脚本（同源限制）

### Worker 适合做的事
✅ 大数据处理（过滤、排序、搜索）
✅ 图像/视频处理
✅ 数据压缩/加密
✅ 实时数据流处理
✅ 后台同步

### Worker 不适合做的事
❌ 简单的 UI 交互
❌ 频繁的小数据通信（通信开销可能超过收益）
```

### 选型对比

| Worker 类型 | 生命周期 | 通信范围 | 适用场景 |
|------------|---------|---------|---------|
| **Dedicated Worker** | 随页面销毁 | 单个页面 | 大数据计算、加密、图像处理 |
| **Shared Worker** | 随最后一个连接销毁 | 同源多页面 | 跨标签页状态同步 |
| **Service Worker** | 独立于页面 | 网络请求拦截 | 离线缓存、PWA、消息推送 |

---

## 五、性能注意事项

```javascript
// 传输大数据的优化
// ❌ 传输大对象会被结构化克隆（有性能开销）
worker.postMessage(largeArray)

// ✅ 使用 Transferable Objects（零拷贝）
const buffer = new ArrayBuffer(1024 * 1024 * 100)  // 100MB
worker.postMessage(buffer, [buffer])  // 第二个参数转移所有权
// 主线程中 buffer 变为空，零拷贝传输
```

---

**推荐阅读：**
- [MDN: Web Workers API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Workers_API)
- [MDN: Service Worker](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)
