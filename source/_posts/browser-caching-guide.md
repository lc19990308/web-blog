---
title: "浏览器缓存策略完全指南：强缓存、协商缓存与 CDN 实战"
date: 2026-06-25
categories: "浏览器"
description: "深入浏览器缓存机制，详解强缓存（Expires/Cache-Control）与协商缓存（Last-Modified/ETag）的原理、配置策略、CDN 缓存联动及常见问题排查"
tags: ["浏览器", "性能优化"]
copyright: true
---

## 前言

浏览器缓存是前端性能优化中**投入产出比最高**的手段之一。合理配置缓存能让页面加载时间从秒级降到毫秒级。

但缓存也是"双刃剑"——配得太强，更新后用户看不到新内容；配得太弱，每次请求都回源，浪费带宽。

本文从底层协议到实战配置，完整覆盖浏览器缓存的方方面面。

---

## 一、缓存的位置

浏览器缓存按优先级从高到低：

```
Memory Cache（内存缓存）
  → Service Worker Cache
    → Disk Cache（磁盘缓存）
      → Push Cache（推送缓存）
        → 网络请求
```

### 1.1 Memory Cache

存储在内存中，读取最快，但**进程关闭后释放**：

```javascript
// 放在 <script> 中的 JS、CSS 资源
// 浏览器会缓存到内存
// 刷新页面时命中内存缓存（Network 面板显示 "(from memory cache)"）
```

**特点**：极快、进程级生命周期、通常缓存小而常用的资源。

### 1.2 Disk Cache

存储在磁盘中，**跨会话持久化**：

```javascript
// 图片、字体等大文件
// 关闭页面重新打开仍命中（Network 面板显示 "(from disk cache)"）
```

**特点**：持久化、速度中等（访问磁盘）、通常缓存大文件。

### 1.3 Service Worker Cache

PWA 的核心，可编程控制缓存策略：

```javascript
// Service Worker 中的缓存
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request)
    })
  )
})
```

**特点**：完全可控，支持离线，优先级高于 Disk Cache。

---

## 二、强缓存（200 from cache）

强缓存是指**浏览器直接使用本地缓存，不向服务器发请求**。

控制强缓存有两个 HTTP 头：

### 2.1 Expires（HTTP/1.0）

```http
Expires: Thu, 25 Jun 2027 15:00:00 GMT
```

**问题**：依赖客户端时间——用户改了系统时间就不可靠了。

```javascript
// Expires 的问题
const serverTime = '2027-06-25T15:00:00Z'
const userTime = new Date('2020-01-01') // 用户改了时间

// 浏览器判定：Expires 时间 > 本地时间 → 命中缓存
// 但 Server 时间实际上是过去的！
```

### 2.2 Cache-Control（HTTP/1.1，推荐）

```http
Cache-Control: max-age=31536000
```

```http
# 组合指令
Cache-Control: public, max-age=3600, s-maxage=3600
Cache-Control: private, max-age=0, must-revalidate
```

**常用指令**：

| 指令 | 含义 |
|------|------|
| `max-age=3600` | 缓存 1 小时（单位：秒） |
| `s-maxage=3600` | CDN/代理缓存时间（覆盖 max-age） |
| `public` | 任何中间节点都可缓存 |
| `private` | 仅浏览器可缓存（CDN 不可缓存） |
| `no-cache` | 不直接使用缓存，每次询问服务器 |
| `no-store` | 完全不缓存（敏感数据） |
| `must-revalidate` | 过期后必须回源验证 |
| `immutable` | 内容永不改变（配合 max-age） |

### 2.3 Expires vs Cache-Control

```http
Expires: Thu, 25 Jun 2027 15:00:00 GMT
Cache-Control: max-age=31536000
```

**两个同时存在时，Cache-Control 优先级更高**。

---

## 三、协商缓存（304 Not Modified）

协商缓存是浏览器**向服务器询问"资源是否变了"**，没变返回 304 继续用缓存。

### 3.1 Last-Modified / If-Modified-Since

```http
# 第一次请求，服务器返回
Last-Modified: Wed, 25 Jun 2025 10:00:00 GMT

# 后续请求，浏览器发送
If-Modified-Since: Wed, 25 Jun 2025 10:00:00 GMT

# 服务器判定未修改，返回 304 Not Modified
# 浏览器继续使用缓存
```

**问题**：
- 精确到秒，1 秒内的多次修改无法识别
- 编辑文件的修改时间但内容没变，也会触发重新下载

### 3.2 ETag / If-None-Match（推荐）

```http
# 第一次请求，服务器返回（基于内容生成 Hash）
ETag: "abc123def456"

# 后续请求，浏览器发送
If-None-Match: "abc123def456"

# 服务器比较 Hash，未变返回 304
```

**ETag 的生成方式**：
- 文件内容的 Hash（Nginx：`etag on`）
- 文件的 inode + size + mtime（默认）

**强验证器 vs 弱验证器**：

```http
ETag: "abc123"          # 强验证器（内容精确对比）
ETag: W/"abc123"        # 弱验证器（允许语义等价）
```

### 3.3 Cache-Control: no-cache + ETag（最佳组合）

```http
# 服务器返回
Cache-Control: no-cache
ETag: "v1.2.3"

# 浏览器行为：每次请求都带上 If-None-Match
# 服务器返回 304 或 200 + 新资源

# 效果：确保资源始终最新，避免不必要的下载
```

---

## 四、完整缓存策略

### 4.1 资源类型与策略

```http
# 1. 静态资源（JS/CSS/图片/字体）
# 哈希化文件名，长期缓存
# 文件变化 → 文件名变化 → 缓存自动失效
Cache-Control: public, max-age=31536000, immutable

# 2. API 响应
# 不缓存或短时间缓存
Cache-Control: private, max-age=60

# 3. HTML 页面
# 每次请求都验证
Cache-Control: no-cache

# 4. 用户敏感数据
# 完全不缓存
Cache-Control: no-store, private
```

### 4.2 Webpack / Vite 生产配置

```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // 生成哈希文件名，实现缓存自动失效
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },
})
```

```nginx
# Nginx 配置示例
location /assets/ {
  # 哈希化的静态资源，一年缓存
  add_header Cache-Control "public, max-age=31536000, immutable";
}

location /api/ {
  # API 不缓存
  add_header Cache-Control "no-store, private";
}

location / {
  # HTML 每次验证
  add_header Cache-Control "no-cache";
}
```

### 4.3 更新后用户如何看到新内容？

```html
<!-- 方案1：文件名哈希（推荐） -->
<script src="/assets/app.a1b2c3d4.js"></script>
<!-- 新版本 → /assets/app.e5f6g7h8.js -->

<!-- 方案2：URL 参数版本号 -->
<script src="/js/app.js?v=2.0.0"></script>

<!-- 方案3：Service Worker 主动更新 -->
<script>
  navigator.serviceWorker.register('/sw.js')
  // sw.js 中监听更新事件，提示用户刷新
</script>
```

---

## 五、CDN 缓存

### 5.1 CDN 缓存头

```http
# 浏览器缓存 1 小时
Cache-Control: max-age=3600

# CDN 缓存 1 天（s-maxage 覆盖 max-age）
Cache-Control: public, max-age=3600, s-maxage=86400
```

### 5.2 CDN 缓存刷新

```bash
# CDN 资源更新后需要手动或自动刷新

# 阿里云 CDN
cdn refresh --paths /assets/app.a1b2c3d4.js

# AWS CloudFront
aws cloudfront create-invalidation \
  --distribution-id EXAMPLE \
  --paths "/assets/*"
```

**最佳实践**：使用文件名哈希后，实际上很少需要刷新 CDN——文件名变了就是新请求。

---

## 六、缓存实战排查

### 6.1 在 Chrome DevTools 中查看

```
Network 面板：
  200 (from disk cache)  → 强缓存命中
  304 Not Modified       → 协商缓存命中
  200                    → 网络请求

Application 面板 → Storage → Cache Storage
```

### 6.2 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| 用户看到旧页面 | HTML 被强缓存 | HTML 用 `no-cache` |
| 更新后样式错乱 | CSS 文件名没变 | 加内容 Hash |
| 304 请求仍然很多 | 协商缓存也要发请求 | 改用 `max-age` 强缓存 |
| 刷新页面没变 | F5 会检查缓存，但地址栏回车不会 | 用 `immutable` 标记 |
| CDN 缓存新版本 | CDN 没有主动刷新 | `s-maxage` 设置较短 |

### 6.3 强制刷新

```bash
# 用户侧
Ctrl + Shift + R    # 强制刷新
Ctrl + F5           # 绕开缓存
DevTools → Network → Disable Cache

# 开发者侧
# 在 URL 后加 ?t=时间戳（仅调试用）
<script src="/js/app.js?t=1625097600000"></script>
```

---

## 七、HTTP 缓存流程总结

```
浏览器发起请求
  │
  ├── Service Worker 有缓存？
  │   ├── 是 → 返回缓存（可自定义策略）
  │   └── 否 → 继续
  │
  ├── 强缓存是否有效（max-age / Expires）？
  │   ├── 有效 → 直接使用本地缓存（200 from cache）
  │   └── 过期 → 继续
  │
  ├── 协商缓存（Last-Modified / ETag）
  │   ├── 服务器返回 304 → 使用本地缓存
  │   └── 服务器返回 200 + 新资源
  │
  └── 更新本地缓存
```

---

## 八、推荐配置速查表

| 资源类型 | Cache-Control | 备注 |
|---------|---------------|------|
| HTML 页面 | `no-cache` | 每次验证 |
| JS/CSS（哈希名） | `public, max-age=31536000, immutable` | 一年不变 |
| 图片/字体 | `public, max-age=31536000` | 一年缓存 |
| API（动态数据） | `private, max-age=60` | 1 分钟 |
| API（用户信息） | `no-store` | 不缓存 |
| 第三方 CDN | 保持原样 | 不可控 |
| Fallback 页面 | `public, max-age=0, must-revalidate` | 立即验证 |

> 缓存策略的核心原则：**不变的内容永远缓存（文件名哈希），变化的内容随时验证（ETag/no-cache），敏感数据完全不存（no-store）**。
