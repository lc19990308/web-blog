---
title: "Data URL 与 Base64：原理、优缺点与最佳实践"
date: 2022-12-06 09:50:00
updated: 2026-06-23
categories: "JavaScript"
description: "理解 Data URL 的工作原理、base64 编解码、在前端性能优化中的使用场景与注意事项"
tags: "性能优化"
copyright: true
---

## 前言

```html
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAkCAYAAABIdFAMAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAHhJREFUeNo8yjsJAAAMA7H+07oHY4M7d4ATz4iUf19mZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZs3cAAQYA1GgfUyF1YwAAAABJRU5ErkJggg==" alt="red dot">
```

这种以 `data:` 开头的 URL 就是 **Data URL**——将图片等资源直接内嵌到 HTML/ CSS 中，而非通过 HTTP 请求加载。

---

## 一、什么是 Data URL

### 1.1 语法结构

```
data:[<mediatype>][;base64],<data>
```

| 部分 | 说明 | 示例 |
|------|------|------|
| `data:` | 协议前缀 | 固定 |
| `mediatype` | MIME 类型 | `image/png`、`text/plain` |
| `;base64` | 编码方式 | 不写则默认 URL 编码 |
| `data` | 实际数据 | base64 字符串 |

```html
<!-- 普通文本 -->
<img src="data:text/plain,Hello%20World">

<!-- HTML 片段 -->
<iframe src="data:text/html,<h1>Hello</h1>"></iframe>

<!-- Base64 编码的图片 -->
<img src="data:image/png;base64,iVBOR...">
```

### 1.2 与 HTTP URL 的对比

```html
<!-- HTTP URL：需要额外请求 -->
<img src="images/logo.png" />

<!-- Data URL：无需请求，直接内嵌 -->
<img src="data:image/png;base64,iVBOR..." />
```

---

## 二、优点与缺点

### 2.1 优点

```markdown
| 优点 | 说明 |
|------|------|
| 减少 HTTP 请求 | 内嵌在 HTML 中，无需额外加载 |
| 不受跨域限制 | 本身就是数据，不涉及 CORS |
| 可独立使用 | 复制 HTML 就能携带图片（如邮件）|
```

### 2.2 缺点

```markdown
| 缺点 | 说明 |
|------|------|
| 体积增大约 33% | Base64 编码后比原文件大 1/3 |
| 无法缓存 | 内嵌在 HTML 中，HTML 变了就得重新加载 |
| 阻塞渲染 | 大图片内嵌会增加 HTML 体积，延迟首屏 |
| 难以维护 | 又长又臭的字符串不可读 |
```

---

## 三、何时使用 Data URL

```javascript
// ✅ 适合使用 Data URL 的场景

// 1. 小图标（< 10KB）
// 2. CSS 中无法避免的图片（data-uri）
// 3. 邮件中的图片（独立 HTML）
// 4. 动态生成的 Canvas 内容

// ❌ 不适合的场景

// 1. 大图片（> 10KB）→ 应使用 HTTP URL
// 2. 需要缓存的图片 → HTTP URL 可被浏览器缓存
// 3. 经常变化的图片 → 每次都要重新生成
```

### 推荐策略

```javascript
// Webpack/Vite 自动处理：小于 8KB 的图片自动转为 Data URL
// vite.config.js
{
  build: {
    assetsInlineLimit: 8 * 1024,  // 8KB 以下内联
  }
}

// webpack.config.js
{
  test: /\.(png|jpg)$/,
  type: 'asset',
  parser: {
    dataUrlCondition: { maxSize: 8 * 1024 },
  },
}
```

---

## 四、Base64 编解码

```javascript
// 浏览器中转换

// 文本 → Base64
const text = 'Hello World'
const encoded = btoa(text)                // 'SGVsbG8gV29ybGQ='
const decoded = atob(encoded)             // 'Hello World'

// 注意：btoa/atob 不支持中文
const chinese = '你好'
// btoa(chinese) → 报错！需要先 encodeURIComponent
const safeEncoded = btoa(encodeURIComponent(chinese))
const safeDecoded = decodeURIComponent(atob(safeEncoded))
```

### 图片转 Base64

```javascript
// 将图片文件转为 Base64 Data URL
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)  // data:image/...;base64,...
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 使用
const input = document.querySelector('input[type="file"]')
input.addEventListener('change', async () => {
  const dataUrl = await fileToDataUrl(input.files[0])
  preview.src = dataUrl
  console.log('Base64 长度:', dataUrl.length, '字符')
})
```

### Canvas 导出为 Data URL

```javascript
const canvas = document.getElementById('myCanvas')
const dataUrl = canvas.toDataURL('image/png', 0.8)  // 0.8 为 JPEG 质量
// 可以用于：
// 1. 图片预览
// 2. 上传到服务器（转为 Blob）
// 3. 保存到本地

// Data URL → Blob（用于上传）
function dataUrlToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const bytes = atob(data)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i)
  }
  return new Blob([arr], { type: mime })
}
```

---

## 五、性能分析

### Data URL vs HTTP URL

| 场景 | Data URL | HTTP URL |
|------|----------|----------|
| 请求次数 | **0** 次 | 1 次 |
| 文件大小 | **+33%**（base64 开销）| 原始大小 |
| 缓存 | ❌ 每次都下载 | ✅ 强缓存 |
| 首屏 | 首屏 HTML 变大 | 首屏 HTML 小 |
| 小图标（< 8KB） | ✅ 推荐 | 多一次请求不划算 |
| 大图片 | ❌ 不推荐 | ✅ 推荐 |

**结论：** 小图（< 8KB）用 Data URL，大图用 HTTP URL。现代打包工具会自动帮你做这个决策。

---

## 总结

```javascript
// Data URL 核心：
// 优点：减少请求
// 缺点：体积增大 33%、不可缓存

// 最佳实践：
// 小图（< 8KB）→ Data URL（构建工具自动处理）
// 大图（> 8KB）→ HTTP URL（可缓存、可 CDN）
// 特殊场景 → 邮件、Canvas 导出、文件预览
```

**推荐阅读：**
- [MDN: Data URLs](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Basics_of_HTTP/Data_URLs)
- [Base64 编码原理](https://developer.mozilla.org/zh-CN/docs/Glossary/Base64)
