---
title: "跨域与 CORS 完全解析：从同源策略到代理配置"
date: 2026-06-25
categories: "浏览器"
description: "深入浏览器同源策略与跨域资源共享（CORS）机制，涵盖简单请求/预检请求、各种跨域解决方案、常见错误排查与代理配置"
tags: ["浏览器", "网络协议"]
copyright: true
---

## 前言

```
Access to fetch at 'https://api.example.com/data' from origin 'http://localhost:3000'
has been blocked by CORS policy.
```

这是前端开发者最常见的报错之一。

CORS 本身并不复杂，但很多开发者只知其然而不知其所以然。本文从底层原理到各种场景的解决方案，完整覆盖跨域问题。

---

## 一、同源策略

### 1.1 什么是同源？

浏览器的**同源策略**限制了一个源的文档或脚本如何与另一个源的资源进行交互。

"同源"指**协议 + 域名 + 端口**三者完全一致：

| URL | 与 `https://example.com/page` 是否同源 |
|-----|--------------------------------------|
| `https://example.com/other` | ✅ 同源（路径不同） |
| `https://example.com:443/page` | ✅ 同源（默认端口 443） |
| `http://example.com/page` | ❌ 协议不同（http vs https） |
| `https://api.example.com/page` | ❌ 子域名不同 |
| `https://example.com:8080/page` | ❌ 端口不同 |

### 1.2 非同源的限制

```
1. Cookie / localStorage / IndexedDB 不可读取
2. DOM 不可操作（iframe 跨域）
3. AJAX 请求会被拦截（响应能收到，但 JS 不能读取）
```

**注意**：同源策略限制的是 JS 读取响应，**请求还是会发出去的**。这也是 CSRF 攻击能发生的原因。

---

## 二、CORS 的工作原理

CORS（Cross-Origin Resource Sharing）是浏览器和服务器的"协议"——服务器通过 HTTP 头告诉浏览器："这个跨域请求是允许的"。

### 2.1 简单请求

满足以下所有条件的请求是"简单请求"：

```
1. 方法：GET、HEAD、POST 之一
2. 请求头只包含安全字段（Accept、Accept-Language、Content-Language、Content-Type）
3. Content-Type 必须是：text/plain、multipart/form-data、application/x-www-form-urlencoded
```

简单请求的流程：

```http
# 浏览器自动添加 Origin 头
GET /api/data HTTP/1.1
Origin: https://my-app.com

# 服务器返回允许的源
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://my-app.com
# 或 *（允许所有源）

# 浏览器检查响应头，允许则返回给 JS，否则阻断
```

### 2.2 预检请求（Preflight）

不满足简单条件的请求，浏览器会先发一个 **OPTIONS 请求**：

```javascript
// 以下请求会触发预检
fetch('https://api.example.com/data', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-Custom-Header': 'custom',
  },
})
```

浏览器先发 OPTIONS：

```http
OPTIONS /data HTTP/1.1
Origin: https://my-app.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: content-type, x-custom-header

# 服务器返回
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://my-app.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: content-type, x-custom-header
Access-Control-Max-Age: 86400   # 预检结果缓存 1 天
```

预检通过后，才发起真正的请求。

### 2.3 响应头详解

```http
Access-Control-Allow-Origin: https://my-app.com
# 允许的源（不能同时写多个！需要动态判断）

Access-Control-Allow-Origin: *
# 允许所有源（不能带凭据）

Access-Control-Allow-Methods: GET, POST, PUT, DELETE
# 允许的方法

Access-Control-Allow-Headers: Content-Type, Authorization
# 允许的自定义请求头

Access-Control-Expose-Headers: X-Total-Count, X-RateLimit
# 暴露给 JS 的非默认响应头

Access-Control-Allow-Credentials: true
# 允许携带 Cookie（Allow-Origin 不能是 *）

Access-Control-Max-Age: 86400
# 预检结果缓存时间（秒）
```

---

## 三、跨域解决方案

### 3.1 后端配置 CORS（推荐）

**Express**：

```javascript
const express = require('express')
const app = express()

app.use((req, res, next) => {
  const allowedOrigins = [
    'https://my-app.com',
    'https://staging.my-app.com',
  ]

  const origin = req.headers.origin
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Max-Age', '86400')

  // 预检请求直接返回 204
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }

  next()
})
```

**Nginx**：

```nginx
server {
    location /api/ {
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin $http_origin;
            add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, OPTIONS';
            add_header Access-Control-Allow-Headers 'Content-Type, Authorization';
            add_header Access-Control-Max-Age 86400;
            return 204;
        }

        add_header Access-Control-Allow-Origin $http_origin;
        add_header Access-Control-Allow-Credentials true;

        proxy_pass http://backend:3000;
    }
}
```

### 3.2 开发环境代理（Vite）

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://api.example.com',
        changeOrigin: true,       // 修改请求的 Origin 头
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/uploads': {
        target: 'https://cdn.example.com',
        changeOrigin: true,
      },
    },
  },
})
```

**原理**：开发环境下，浏览器请求同源的 `/api/xxx`，Vite Dev Server 收到后转发到目标服务器，再把响应返回给浏览器。浏览器始终认为请求是同源的。

### 3.3 JSONP（仅 GET，已过时）

```html
<script>
function handleResponse(data) {
  console.log('跨域数据:', data)
}
</script>
<!-- 利用 <script> 不受跨域限制的特性 -->
<script src="https://api.example.com/data?callback=handleResponse"></script>
```

```javascript
// 服务器返回：
handleResponse({ name: 'LC', age: 25 })
```

**限制**：只支持 GET，有安全风险。

### 3.4 WebSocket（天然跨域）

WebSocket 不受同源策略限制：

```javascript
const ws = new WebSocket('wss://api.example.com/socket')
ws.onmessage = (event) => {
  console.log('收到数据:', event.data)
}
```

---

## 四、带凭据的请求（Cookie / Authorization）

### 4.1 credentials: include

当跨域请求需要携带 Cookie 或 HTTP Basic Auth 时：

```javascript
// 前端
fetch('https://api.example.com/user', {
  credentials: 'include',  // 携带 Cookie
})

// 或 XMLHttpRequest
const xhr = new XMLHttpRequest()
xhr.withCredentials = true
xhr.open('GET', 'https://api.example.com/user')
```

**服务器三要素**：

```http
Access-Control-Allow-Origin: https://my-app.com   # 不能是 *
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: Set-Cookie
```

### 4.2 常见问题

```javascript
// ❌ 错误1：Allow-Origin 用 *
Access-Control-Allow-Origin: *
// 当 credentials: include 时，浏览器会拒绝

// ❌ 错误2：前端忘了 credentials
fetch('https://api.example.com/user')
// 浏览器不会发送 Cookie

// ❌ 错误3：多个 Origin
Access-Control-Allow-Origin: https://a.com, https://b.com
// 只能写一个！需用动态逻辑判断
```

---

## 五、常见 CORS 错误与排查

### 5.1 错误信息分析

```
# 错误1：缺少 Access-Control-Allow-Origin
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present

# 错误2：凭据模式下 Origin 不能是 *
Response to preflight request doesn't pass access control check:
The value of 'Access-Control-Allow-Origin' in the response must not be the wildcard '*'

# 错误3：请求头不在允许列表
Request header field authorization is not allowed by
Access-Control-Allow-Headers in preflight response

# 错误4：方法不允许
Method PUT is not allowed by Access-Control-Allow-Methods in preflight response
```

### 5.2 排查步骤

```
1. 打开 DevTools → Network → 确认请求是否发出
2. 查看请求头：Origin 是否正确
3. 查看响应头：是否有 Access-Control-Allow-Origin
4. 如果有 OPTIONS 请求：检查预检响应头
5. 如果是 credentials: include：确认 Allow-Origin 不是 *
6. 如果使用自定义头：确认在 Allow-Headers 中
```

### 5.3 调试工具

```bash
# 用 curl 模拟跨域请求
curl -H "Origin: https://my-app.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS \
  -v https://api.example.com/data

# 查看响应头
curl -I -H "Origin: https://my-app.com" \
  https://api.example.com/data
```

---

## 六、其他跨域场景

### 6.1 iframe 跨域通信

```javascript
// 父页面
const iframe = document.getElementById('my-iframe')
iframe.contentWindow.postMessage({ type: 'greeting', data: 'hello' }, 'https://child.com')

// 子页面
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://parent.com') return // 重要：验证来源
  console.log('收到:', event.data)
  event.source.postMessage({ type: 'response', data: 'hi' }, event.origin)
})
```

### 6.2 跨域图片

```html
<!-- 图片默认可以跨域加载 -->
<img src="https://cdn.example.com/photo.jpg" crossorigin="anonymous" />
```

```javascript
// 读取 Canvas 中的跨域图片需要 CORS
const img = new Image()
img.crossOrigin = 'anonymous'
img.src = 'https://cdn.example.com/photo.jpg'
img.onload = () => {
  canvas.drawImage(img, 0, 0)
  canvas.toDataURL() // 需要 CORS
}
```

### 6.3 跨域字体

```css
/* 字体文件也需要 CORS */
@font-face {
  font-family: 'CustomFont';
  src: url('https://cdn.example.com/font.woff2') format('woff2');
}
```

---

## 七、CORS 流程速查图

```
浏览器请求 → 判断是否跨域
  ├── 同源 → 正常请求
  └── 跨域
      ├── 简单请求（GET/POST + 安全头）
      │   └── 发送请求 + Origin → 检查响应头 Allow-Origin
      │       ├── 通过 → JS 获取响应
      │       └── 不通过 → CORS 报错
      └── 非简单请求（PUT/DELETE + 自定义头）
          ├── 先 OPTIONS 预检
          │   ├── 返回 2xx + 允许头 → 发真实请求
          │   └── 返回错误 → 阻断，CORS 报错
          └── 真实请求 → 检查 Allow-Origin
```

---

## 八、安全注意事项

```javascript
// ⚠️ 不要这样做：反射 Origin
const origin = req.headers.origin
res.setHeader('Access-Control-Allow-Origin', origin)
// 攻击者可以伪造 Origin 头，绕过限制

// ✅ 正确做法：白名单校验
const allowedOrigins = ['https://my-app.com', 'https://admin.my-app.com']
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin)
}
```

```javascript
// ⚠️ 不要在 CORS 白名单中放危险的网站
// 如果允许了 https://evil.com，那 evil.com 的 JS 就能读取你的 API
```

---

## 总结

| 方案 | 适用场景 | 复杂度 |
|------|---------|--------|
| **后端 CORS 头** | 正规跨域请求 | ⭐⭐ |
| **开发代理** | 开发阶段 | ⭐ |
| **生产 Nginx 代理** | 同域代理后端 | ⭐ |
| **postMessage** | iframe 通信 | ⭐⭐⭐ |
| **WebSocket** | 实时通信 | ⭐ |
| **JSONP** | 仅支持 GET 的旧接口 | ⭐（不推荐） |

> CORS 的错误信息看似复杂，但排查思路很简单：先看请求头 Origin 对不对，再看响应头 Allow-Origin 是否匹配，最后检查 credentials 和预检配置。
