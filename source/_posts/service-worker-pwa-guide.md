---
title: "Service Worker 与 PWA 完整实战：从离线缓存到推送通知"
date: 2026-06-25
categories: "浏览器"
description: "从零实现一个完整的 PWA 应用，涵盖 Service Worker 生命周期、缓存策略、离线体验、消息推送、更新管理与性能优化"
tags: ["浏览器", "JavaScript"]
copyright: true
---

## 前言

PWA（Progressive Web App）让网页拥有"类原生 App"的体验：

- ✅ **离线可用** — 没有网络也能访问
- ✅ **可安装** — 添加到主屏幕，像 App 一样打开
- ✅ **推送通知** — 像原生 App 一样发通知
- ✅ **后台同步** — 在后台同步数据

这一切的核心是 **Service Worker**——一个独立于网页的 JavaScript 线程，充当浏览器和网络之间的代理。

---

## 一、Service Worker 基础

### 1.1 Service Worker 的特性

```javascript
// 1. 独立线程：不与页面共享全局作用域
// 2. 无 DOM 访问权限：不能操作 window/document
// 3. 全 HTTPS：确保安全（localhost 开发没问题）
// 4. 可拦截请求：充当网络代理
// 5. 生命周期独立：页面关闭后 SW 仍在运行
// 6. 事件驱动：不工作时停止，节省内存
```

### 1.2 生命周期

```
注册 → 安装（install） → 激活（activate） → 运行（fetch / message / push）
                              ↑
                         旧 SW 控制中的页面关闭后，新 SW 激活
```

---

## 二、注册 Service Worker

### 2.1 注册

```javascript
// main.js — 在页面中注册
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('SW 注册成功，作用域:', registration.scope)
    } catch (err) {
      console.error('SW 注册失败:', err)
    }
  })
}
```

### 2.2 查看状态

```javascript
// 检查 SW 状态
navigator.serviceWorker.ready.then((registration) => {
  console.log('SW 状态:', registration.active ? '活跃' : '等待')
})

// 监听 SW 状态变化
navigator.serviceWorker.addEventListener('controllerchange', () => {
  console.log('新的 SW 开始控制页面')
})
```

---

## 三、安装阶段——预缓存资源

```javascript
// sw.js
const CACHE_NAME = 'my-app-v1'

// 需要离线缓存的核心资源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/main.js',
  '/scripts/vendor.js',
  '/images/logo.png',
  '/offline.html',     // 离线备用页面
]

self.addEventListener('install', (event) => {
  console.log('SW 安装中...')

  // 跳过等待，立即激活
  self.skipWaiting()

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS)
    })
  )
})
```

### 3.1 skipWaiting

```javascript
self.skipWaiting()
// 让新安装的 SW 立即激活，不等待旧页面关闭
// 通常和以下配合使用：
self.addEventListener('install', () => self.skipWaiting())
```

---

## 四、激活阶段——清理旧缓存

```javascript
self.addEventListener('activate', (event) => {
  console.log('SW 激活中...')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)  // 不是当前版本
          .map((name) => {
            console.log('删除旧缓存:', name)
            return caches.delete(name)
          })
      )
    })
  )

  // 立即接管所有页面
  self.clients.claim()
})
```

---

## 五、拦截请求——缓存策略

### 5.1 Cache First（优先缓存）

适用于版本稳定的静态资源：

```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.url.match(/\.(js|css|png|jpg|svg)$/)) {
    event.respondWith(cacheFirst(event.request))
  }
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
    return response
  } catch (error) {
    // 返回离线占位图
    return caches.match('/offline-image.png')
  }
}
```

### 5.2 Network First（优先网络）

适用于动态 API 数据：

```javascript
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(networkFirst(event.request))
  }
})

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open('api-cache')
    cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await caches.match(request)
    if (cached) return cached

    // API 离线时的兜底
    return new Response(
      JSON.stringify({ error: '离线状态', data: null }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }
}
```

### 5.3 Stale While Revalidate（缓存更新）

先显示缓存，后台更新缓存（适用于即时性不强的数据）：

```javascript
async function staleWhileRevalidate(request) {
  const cache = await caches.open('dynamic-cache')

  // 先返回缓存（如果有）
  const cached = await cache.match(request)
  if (cached) {
    // 后台更新不阻塞页面
    fetch(request).then((response) => {
      if (response.ok) cache.put(request, response)
    })
    return cached
  }

  // 没有缓存就走网络
  const response = await fetch(request)
  cache.put(request, response.clone())
  return response
}
```

### 5.4 策略选择表

| 策略 | 适用资源 | 效果 |
|------|---------|------|
| **Cache First** | JS/CSS/图片/字体 | 最快，资源变更需要换版本号 |
| **Network First** | API 响应 | 优先最新，离线用缓存兜底 |
| **Stale While Revalidate** | 用户头像、文章列表 | 即时显示，后台更新 |
| **Cache Only** | 纯离线资源 | 只读缓存，不请求网络 |
| **Network Only** | 支付、表单提交 | 必须在线 |

---

## 六、离线体验

### 6.1 离线页面

```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  // HTML 页面请求使用 Network First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      networkFirst(event.request).catch(() => {
        return caches.match('/offline.html')
      })
    )
  }
})
```

```html
<!-- offline.html -->
<!DOCTYPE html>
<html>
<head>
  <title>离线</title>
  <style>
    body { display: flex; justify-content: center; align-items: center; height: 100vh; font-family: system-ui; }
    .offline { text-align: center; }
  </style>
</head>
<body>
  <div class="offline">
    <h1>您已断开网络连接</h1>
    <p>部分页面仍可访问</p>
    <button onclick="location.reload()">重试连接</button>
  </div>
</body>
</html>
```

### 6.2 检测网络状态

```javascript
// 页面中监听网络变化
window.addEventListener('online', () => {
  console.log('网络已恢复')
  // 重新加载数据或同步离线操作
})

window.addEventListener('offline', () => {
  console.log('网络已断开')
  // 显示离线提示
  showOfflineBanner()
})

// 判断当前状态
const isOnline = navigator.onLine
```

---

## 七、消息推送

### 7.1 订阅推送

```javascript
// main.js
async function subscribePush() {
  const registration = await navigator.serviceWorker.ready

  // 请求通知权限
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  // 生成 VAPID 密钥（在服务器端生成）
  const publicKey = 'BEl62i...'
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  // 发送到后端保存
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  })
}
```

### 7.2 接收推送

```javascript
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json()

  const options = {
    body: data.body,
    icon: '/images/icon.png',
    badge: '/images/badge.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url,
    },
    actions: [
      { action: 'view', title: '查看' },
      { action: 'close', title: '关闭' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// 点击通知
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    )
  }
})
```

---

## 八、更新管理

### 8.1 版本化缓存

```javascript
// sw.js 顶部
const CACHE_VERSION = 'v2'
const CACHE_NAME = `my-app-${CACHE_VERSION}`
```

### 8.2 提示用户更新

```javascript
// main.js
let swRegistration

async function registerSW() {
  swRegistration = await navigator.serviceWorker.register('/sw.js')

  // 检测新版本
  swRegistration.addEventListener('updatefound', () => {
    const newSW = swRegistration.installing
    newSW.addEventListener('statechange', () => {
      if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
        // 新版本已安装，提示用户
        showUpdatePrompt()
      }
    })
  })
}

function showUpdatePrompt() {
  const banner = document.createElement('div')
  banner.className = 'update-banner'
  banner.innerHTML = `
    新版本已可用
    <button onclick="updateApp()">立即更新</button>
  `
  document.body.appendChild(banner)
}

async function updateApp() {
  if (swRegistration) {
    await swRegistration.update()
    window.location.reload()
  }
}
```

---

## 九、manifest.json 与安装

```json
// manifest.json
{
  "name": "我的应用",
  "short_name": "我的应用",
  "description": "这是一个 PWA 应用",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#409eff",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

```html
<!-- index.html -->
<link rel="manifest" href="/manifest.json" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/images/icon-192.png" />
```

### 监听安装事件

```javascript
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()  // 阻止自动弹窗
  installPrompt = event

  // 显示自定义安装按钮
  showInstallButton()
})

async function installApp() {
  if (!installPrompt) return

  installPrompt.prompt()
  const result = await installPrompt.userChoice

  if (result.outcome === 'accepted') {
    console.log('用户已安装')
  }

  installPrompt = null
}
```

---

## 十、调试与开发

### 10.1 Chrome DevTools

```
Application → Service Workers
  - 查看 SW 状态
  - 触发 update / stop / start
  - 模拟离线（Offline 复选框）

Application → Cache Storage
  - 查看缓存的请求和响应
  - 手动删除缓存

Application → Manifest
  - 查看 manifest 配置
```

### 10.2 开发技巧

```javascript
// 开发模式下跳过缓存
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  // 开发环境不走 SW
  self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request))
  })
}

// 或开发时在 DevTools 中勾选：
// "Update on reload" → 每次刷新时更新 SW
// "Bypass for network" → 绕过 SW 直接请求网络
```

### 10.3 清除缓存

```javascript
// 用户主动清除缓存
async function clearAppCache() {
  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))
  console.log('应用缓存已清除')
}
```

---

## 十一、性能建议

```javascript
// ✅ 只缓存同源请求
if (event.request.url.startsWith(self.location.origin)) {
  event.respondWith(cacheFirst(event.request))
}

// ❌ 不要缓存第三方的请求（除非需要离线使用）

// ✅ 使用 opaque 请求处理
// 第三方 CDN 资源可能不支持 CORS
// 谨慎缓存，注意错误处理
```

### 缓存容量建议

| 资源类型 | 建议缓存数量 | 说明 |
|---------|------------|------|
| HTML | 5-10 页 | 最近访问的页面 |
| JS/CSS | 20-30 个 | 核心库和页面脚本 |
| 图片 | 50-100 张 | 最近看到的图片 |
| API 数据 | 按需 | 关注存储配额 |

> PWA 的核心原则：**先离线能用，再考虑更新。** 不要为了离线功能把缓存策略设计得太复杂——从 Cache First + Network First 两种策略开始就够了。
