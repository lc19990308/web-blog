---
title: "Canvas 绘图完全指南：从基础到实战"
date: 2021-08-14 19:54:00
updated: 2026-06-23
categories: "JavaScript"
description: "系统掌握 Canvas 2D 绘图 API：绘制图形、路径、图片处理、动画循环，以及实际项目中的图表绘制与图像处理"
tags: "Canvas"
copyright: true
---

## 前言

Canvas 是 HTML5 提供的**位图绘图**技术，适合游戏、图表、图像处理、数据可视化等场景。与 SVG 不同，Canvas 是**像素级**操作，性能更高但不可缩放。

---

## 一、基础入门

### 1.1 创建 Canvas

```html
<canvas id="myCanvas" width="500" height="300"></canvas>
```

```javascript
const canvas = document.getElementById('myCanvas')
const ctx = canvas.getContext('2d')
```

**重要：** `width`/`height` 是画布的实际像素尺寸，不要用 CSS 控制。CSS 放大/缩小会导致模糊。

### 1.2 坐标系

```
(0,0) ────────── x →
  │
  │
  y
  ↓
```

---

## 二、绘制基础图形

### 2.1 矩形

```javascript
// 填充矩形
ctx.fillStyle = 'red'
ctx.fillRect(10, 10, 100, 50)  // (x, y, width, height)

// 描边矩形
ctx.strokeStyle = 'blue'
ctx.lineWidth = 2
ctx.strokeRect(130, 10, 100, 50)

// 清除区域
ctx.clearRect(50, 20, 40, 20)  // 擦除部分内容
```

### 2.2 路径绘图

```javascript
// 绘制三角形
ctx.beginPath()
ctx.moveTo(100, 100)     // 起点
ctx.lineTo(150, 50)      // 连线
ctx.lineTo(200, 100)     // 连线
ctx.closePath()           // 闭合路径
ctx.fillStyle = 'green'
ctx.fill()

// 绘制圆形
ctx.beginPath()
ctx.arc(150, 150, 50, 0, Math.PI * 2)  // (x, y, radius, startAngle, endAngle)
ctx.fillStyle = 'orange'
ctx.fill()

// 绘制圆角矩形
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.stroke()
}
```

---

## 三、样式与颜色

```javascript
// 填充与描边颜色
ctx.fillStyle = '#ff0000'           // 颜色名
ctx.fillStyle = 'rgb(255, 0, 0)'    // RGB
ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'  // 半透明
ctx.fillStyle = '#ff0000'           // 十六进制

// 渐变
const gradient = ctx.createLinearGradient(0, 0, 200, 0)
gradient.addColorStop(0, 'red')
gradient.addColorStop(1, 'blue')
ctx.fillStyle = gradient

// 阴影
ctx.shadowColor = 'rgba(0,0,0,0.3)'
ctx.shadowBlur = 10
ctx.shadowOffsetX = 2
ctx.shadowOffsetY = 2

// 线型
ctx.lineWidth = 3
ctx.lineCap = 'round'    // butt | round | square
ctx.lineJoin = 'round'   // miter | round | bevel
```

---

## 四、文字与图片

### 4.1 绘制文字

```javascript
ctx.font = '24px Arial'
ctx.fillStyle = '#333'
ctx.textAlign = 'center'    // left | center | right
ctx.textBaseline = 'middle' // top | middle | bottom

ctx.fillText('Hello Canvas', 250, 50)   // 实心文字
ctx.strokeText('Hello Canvas', 250, 100) // 空心文字
```

### 4.2 绘制图片

```javascript
const img = new Image()
img.src = 'photo.jpg'
img.onload = () => {
  // 原始大小
  ctx.drawImage(img, 0, 0)

  // 缩放
  ctx.drawImage(img, 0, 0, 200, 150)

  // 裁剪 + 缩放：(图片, 裁剪x, 裁剪y, 裁剪w, 裁剪h, 目标x, 目标y, 目标w, 目标h)
  ctx.drawImage(img, 50, 50, 100, 100, 0, 0, 200, 200)
}
```

### 4.3 导出图片

```javascript
// Canvas → Data URL
const dataUrl = canvas.toDataURL('image/png')

// Canvas → Blob（用于上传）
canvas.toBlob((blob) => {
  const formData = new FormData()
  formData.append('image', blob, 'canvas.png')
  fetch('/upload', { method: 'POST', body: formData })
}, 'image/png', 0.8)
```

---

## 五、动画

### 5.1 基础动画循环

```javascript
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

let x = 0
let speed = 2

function animate() {
  // 1. 清空画布
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 2. 更新状态
  x += speed
  if (x > canvas.width) x = 0

  // 3. 绘制
  ctx.beginPath()
  ctx.arc(x, 150, 20, 0, Math.PI * 2)
  ctx.fillStyle = 'blue'
  ctx.fill()

  // 4. 请求下一帧
  requestAnimationFrame(animate)
}

animate()
```

**为什么不直接用 `setInterval`？**
- `requestAnimationFrame` 在页面不可见时自动暂停
- 与屏幕刷新率同步（通常 60fps），更省资源
- 更流畅、更省电

### 5.2 FPS 控制

```javascript
let lastTime = 0
const FPS = 30
const interval = 1000 / FPS

function animate(timestamp) {
  const delta = timestamp - lastTime

  if (delta >= interval) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // ... 绘制逻辑
    lastTime = timestamp
  }

  requestAnimationFrame(animate)
}

requestAnimationFrame(animate)
```

---

## 六、实战：简单绘图板

```javascript
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
let isDrawing = false

canvas.addEventListener('mousedown', (e) => {
  isDrawing = true
  ctx.beginPath()
  ctx.moveTo(e.offsetX, e.offsetY)
})

canvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return
  ctx.lineTo(e.offsetX, e.offsetY)
  ctx.stroke()
})

canvas.addEventListener('mouseup', () => {
  isDrawing = false
})

// 清空
document.getElementById('clearBtn').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
})

// 改颜色
document.getElementById('colorPicker').addEventListener('input', (e) => {
  ctx.strokeStyle = e.target.value
})
```

---

## 七、Canvas vs SVG

| 特性 | Canvas | SVG |
|------|--------|-----|
| **类型** | 位图（像素） | 矢量（形状） |
| **性能** | 大量元素时更优 | 少量元素时更优 |
| **缩放** | 放大模糊 | 无限清晰 |
| **事件** | ❌ 手动计算坐标 | ✅ 每个元素可绑定事件 |
| **适用** | 游戏、图表、图像处理 | 图标、Logo、交互式图形 |

**选型：**
- 需要操作每个图形（拖拽、点击）→ SVG
- 大量图形（粒子、游戏）→ Canvas
- 数据可视化 → 推荐 ECharts / D3.js（封装好了 Canvas 或 SVG）

---

## 总结

```javascript
// Canvas 核心流程：
// 1. 获取画布 const ctx = canvas.getContext('2d')
// 2. 设置样式 ctx.fillStyle / ctx.strokeStyle
// 3. 绘制路径 ctx.beginPath() → xxx → ctx.fill()/stroke()
// 4. 动画用 requestAnimationFrame

// 常用 API 速查：
ctx.fillRect(x, y, w, h)      // 填充矩形
ctx.strokeRect(x, y, w, h)    // 描边矩形
ctx.clearRect(x, y, w, h)     // 清除区域
ctx.beginPath() / closePath() // 路径开始/结束
ctx.moveTo(x, y) / lineTo()   // 直线
ctx.arc(x, y, r, start, end)  // 圆弧
ctx.fillText() / strokeText() // 文字
ctx.drawImage(img, ...)       // 图片
ctx.toDataURL() / toBlob()    // 导出
```

**推荐阅读：**
- [MDN: Canvas](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API)
- [MDN: Canvas Tutorial](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API/Tutorial)
