---
title: "前端 CSS 单位完全指南：从 px、rem、vw 到容器查询"
date: 2026-06-25
categories: "css"
description: "全面梳理前端 CSS 单位体系，涵盖绝对单位、相对单位、视口单位、容器查询单位，以及响应式布局中的单位选型策略"
tags: ["css", "css常用单位"]
copyright: true
---

## 前言

CSS 单位看似简单，但选错了会导致布局崩塌、字体忽大忽小、滚动条溢出。

CSS 单位可以分为三大类：

| 类别 | 单位 | 说明 |
|------|------|------|
| **绝对单位** | `px`, `pt`, `cm`, `mm` | 固定大小，不随环境变化 |
| **相对单位** | `em`, `rem`, `%` | 相对于父元素或根元素 |
| **视口单位** | `vw`, `vh`, `vmin`, `vmax` | 相对于视口大小 |
| **容器单位** | `cqw`, `cqh`, `cqi`, `cqb` | 相对于容器查询的大小 |
| **其他** | `ch`, `ex`, `lh` | 相对于字符特性 |

---

## 一、绝对单位

### 1.1 px（像素）

`px` 是 CSS 中最常用的单位。它表示 CSS 像素，不是设备物理像素：

```css
.box {
  width: 200px;      /* 固定宽度 */
  font-size: 16px;   /* 基准字体大小 */
  border: 1px solid; /* 1px 边框 */
  margin: 8px;       /* 固定外边距 */
}
```

**1px 不等于 1 个物理像素**：
- 在 Retina 屏上，1 个 CSS px = 2 个或 3 个物理像素
- `window.devicePixelRatio` 可以查看当前设备的比例

**适用场景**：
- 边框 `border: 1px solid`
- 固定尺寸的小图标、头像
- 最小间距（如 `gap: 4px`）

### 1.2 其他绝对单位

```css
/* 很少使用，了解即可 */
.box {
  width: 1in;     /* 英寸 — 1in = 96px */
  height: 2cm;    /* 厘米 */
  margin: 10mm;   /* 毫米 */
  font-size: 12pt; /* 磅 — 1pt = 1/72 英寸 = 1.333px */
  padding: 1pc;   /* 派卡 — 1pc = 12pt = 16px */
}
```

**建议**：除了 `px`，其他绝对单位在前端开发中极少使用（除非制作打印样式）。

---

## 二、相对单位

### 2.1 em

`em` 相对于**当前元素或父元素的字体大小**：

```css
.parent {
  font-size: 16px;
}

.child {
  font-size: 1.5em;  /* = 16px × 1.5 = 24px */
  margin-bottom: 1em; /* = 当前字体大小 24px */
}
```

**em 的嵌套陷阱**：

```css
html { font-size: 16px; }

.level1 { font-size: 1.2em; } /* 16 × 1.2 = 19.2px */
.level2 { font-size: 1.2em; } /* 19.2 × 1.2 = 23.04px */
.level3 { font-size: 1.2em; } /* 23.04 × 1.2 = 27.65px */
```

嵌套越深，字体越大——这就是 **em 的复合效应**。有时这是你要的效果，但更多时候是 bug。

**使用建议**：`em` 更适合用于：
- 相对于当前字体大小的间距（`padding`、`margin`）
- 按钮内的图标大小

```css
.button {
  font-size: 14px;
  padding: 0.5em 1em;  /* 上下 7px，左右 14px */
}
.button .icon {
  width: 1em;           /* 与文字大小相同 = 14px */
  height: 1em;
}
```

### 2.2 rem（推荐）

`rem` 相对于**根元素（html）的字体大小**，不存在嵌套复合问题：

```css
/* 设置基准 */
html {
  font-size: 16px;
}

h1 {
  font-size: 2rem;     /* = 16 × 2 = 32px */
}

p {
  font-size: 1rem;     /* = 16px */
  margin-bottom: 1rem; /* = 16px */
}

.card {
  padding: 1.5rem;     /* = 24px */
  border-radius: 0.5rem; /* = 8px */
}
```

**rem 的响应式适配**：

```css
/* 媒体查询改变基准，所有 rem 单位自动缩放 */
html {
  font-size: 16px;
}

@media (max-width: 768px) {
  html {
    font-size: 14px;  /* 手机端缩小基准，所有 rem 等比例缩小 */
  }
}

@media (max-width: 480px) {
  html {
    font-size: 12px;
  }
}
```

**实际经验**：
- 字体大小用 `rem`（方便整体缩放）
- 组件内间距用 `rem` 或 `em`
- 边框用 `px`

### 2.3 百分比（%）

百分比相对于**父元素的同属性值**：

```css
.parent {
  width: 800px;
  font-size: 20px;
}

.child {
  width: 50%;          /* = 400px（相对于父宽度） */
  font-size: 80%;      /* = 16px（相对于父字体大小） */
  padding-bottom: 25%; /* = 200px（相对于父宽度！） */
}
```

**关键细节**：
- `width: 50%` → 父元素宽度的 50%
- `height: 50%` → 父元素**必须有显式高度**才生效
- `padding/margin` 的百分比 → **相对于父元素宽度**（不是高度！）
- `font-size: 80%` → 相对于父元素字体大小

**宽高比占位技巧**：

```css
/* 保持 16:9 比例 */
.video-container {
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 9/16 = 0.5625 */
  position: relative;
}

.video-container iframe {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: 100%;
}
```

---

## 三、视口单位

视口单位相对于**浏览器视口**（viewport）的大小：

| 单位 | 含义 |
|------|------|
| `1vw` | 视口宽度的 1% |
| `1vh` | 视口高度的 1% |
| `1vmin` | min(1vw, 1vh) |
| `1vmax` | max(1vw, 1vh) |

### 3.1 全屏布局

```css
.hero {
  width: 100vw;   /* 全屏宽度 */
  height: 100vh;  /* 全屏高度 */
  display: flex;
  align-items: center;
  justify-content: center;
}

.fullscreen-section {
  min-height: 100vh; /* 至少占满一屏 */
}
```

### 3.2 响应式字体

```css
/* 随着视口变化平滑缩放 */
.hero-title {
  font-size: calc(24px + 2vw);
  /* 最小 24px，视口越宽字体越大 */
}

/* clamp 实现的范围控制（推荐） */
.hero-title {
  font-size: clamp(1.5rem, 4vw, 3rem);
  /* 最小 1.5rem，首选 4vw，最大 3rem */
}

.body-text {
  font-size: clamp(14px, 1.5vw, 18px);
}
```

### 3.3 100vw 的问题

```css
/* ❌ 100vw 忽略滚动条宽度，会导致水平溢出 */
.full-width {
  width: 100vw;
}

/* ✅ 修复 */
.full-width {
  width: 100%;
  /* 或 */
  width: calc(100vw - 17px); /* 手动减去滚动条（不推荐） */
}
```

### 3.4 dvh / svh / lvh（动态视口单位）

移动浏览器地址栏隐藏/显示时，`100vh` 的值会变化。新单位解决这个问题：

| 单位 | 含义 |
|------|------|
| `100dvh` | 动态视口高度（随地址栏变化） |
| `100svh` | 最小视口高度（地址栏展开时） |
| `100lvh` | 最大视口高度（地址栏收起时） |

```css
/* 移动端全屏推荐使用 dvh */
.mobile-fullscreen {
  height: 100dvh;
}
```

---

## 四、容器查询单位（CSS 2025）

容器查询让组件可以**根据自身容器的大小**响应，而不是视口：

```css
/* 定义容器 */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* 根据容器宽度响应 */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}

@container card (max-width: 399px) {
  .card {
    display: flex;
    flex-direction: column;
  }
}
```

### 4.1 容器查询单位

| 单位 | 含义 |
|------|------|
| `1cqw` | 容器宽度的 1% |
| `1cqh` | 容器高度的 1% |
| `1cqi` | 容器内联尺寸的 1% |
| `1cqb` | 容器块向尺寸的 1% |
| `1cqmin` | min(1cqw, 1cqh) |
| `1cqmax` | max(1cqw, 1cqh) |

```css
.card {
  container-type: inline-size;
}

.card-title {
  /* 根据容器宽度缩放字体 */
  font-size: clamp(1rem, 5cqi, 2rem);
}

.card-actions {
  /* 容器窄时垂直排列，宽时水平排列 */
  flex-direction: column;
  gap: 1cqw;
}

@container (min-width: 300px) {
  .card-actions {
    flex-direction: row;
  }
}
```

---

## 五、其他特殊单位

### 5.1 ch — 字符宽度

`1ch` 等于当前字体中字符 `0` 的宽度：

```css
/* 限制文本宽度为 60 个字符（阅读体验最佳） */
.article {
  max-width: 60ch;
}

/* 等宽字体下，ch 特别有用 */
.code-block {
  font-family: 'Fira Code', monospace;
  max-width: 80ch;
}

/* 输入框宽度根据字符数 */
input[name="phone"] {
  width: 11ch; /* 11 位手机号 */
}
```

### 5.2 ex — 字符 x 高度

`1ex` 等于当前字体中字符 `x` 的高度（约等于小写字母高度）：

```css
/* 让图标与文字垂直居中 */
.icon {
  width: 1ex;
  height: 1ex;
  vertical-align: middle;
}
```

### 5.3 lh — 行高

`1lh` 等于当前元素的行高：

```css
.text-line {
  line-height: 1.5;
  margin-bottom: 1lh; /* 等于一行的高度 */
}
```

---

## 六、单位选型决策树

```
这个值是做什么的？
├── 边框、阴影、最小间距 → px
├── 字体大小
│   ├── 需要响应式缩放 → rem + clamp()
│   ├── 相对于父元素 → em
│   └── 固定大小 → px
├── 宽度
│   ├── 相对于父容器 → %
│   ├── 相对于视口 → vw
│   ├── 相对于容器 → cqw
│   └── 相对于字符 → ch（文本）
├── 高度
│   ├── 全屏 → 100vh / 100dvh
│   ├── 相对于父容器 → %（父必须有高度）
│   └── 内容自适应 → auto（默认）
└── 间距（padding/margin）
    ├── 相对于字体 → em（组件内）
    ├── 相对于基准 → rem（全局统一）
    └── 固定值 → px
```

---

## 七、移动端适配方案

### 7.1 rem 方案（经典）

```css
/* 配合 JS 动态设置 html font-size */
html {
  font-size: calc(100vw / 375 * 16);
  /* 以 375px 设计稿为基准，16px = 1rem */
}
```

```javascript
// 动态设置
function setRem() {
  const width = document.documentElement.clientWidth
  const baseWidth = 375
  const baseFontSize = 16
  document.documentElement.style.fontSize =
    (width / baseWidth * baseFontSize) + 'px'
}
setRem()
window.addEventListener('resize', setRem)
```

### 7.2 clamp + vw 方案（现代）

```css
/* 不需要 JS，纯 CSS 就能实现等比例缩放 */
html {
  font-size: clamp(12px, calc(100vw / 375 * 16), 20px);
}

/* 使用范例 */
.card {
  width: 327px;                   /* 固定值 */
  width: calc(327 / 375 * 100vw); /* 等比例 */
  width: clamp(280px, 87.2vw, 480px); /* 带范围控制 */
}
```

---

## 八、面试题

```css
/* 1. 以下两个元素宽度分别是多少？ */
.parent {
  width: 200px;
  font-size: 20px;
}
.child-em {
  width: 10em;    /* ? */
}
.child-rem {
  width: 10rem;   /* ? */
}

/* 答案：
   .child-em: 10 × 20px = 200px（相对于父字体）
   .child-rem: 10 × 16px = 160px（相对于根字体）
*/
```

```css
/* 2. body 的高度是多少？ */
body {
  height: 50%;
}
/* 答案：0px（因为 html 没有显式高度，50% 无效）*/
```

```css
/* 3. padding-bottom: 50% 相对于什么？ */
.card {
  width: 300px;
  height: 200px;
  padding-bottom: 50%; /* ? */
}
/* 答案：150px（相对于父元素宽度 300px）*/
```

---

## 总结

| 单位 | 相对于 | 推荐场景 |
|------|--------|---------|
| `px` | 绝对 | 边框、最小间距、固定尺寸 |
| `%` | 父元素 | 布局宽度、响应式比例 |
| `em` | 父字体 | 组件内间距、图标大小 |
| `rem` | 根字体 | 全局字体、统一间距 |
| `vw/vh` | 视口 | 全屏布局、响应式字体 |
| `dvh/svh/lvh` | 动态视口 | 移动端全屏 |
| `ch` | 字符 0 宽度 | 文本宽度控制 |
| `cqw/cqi` | 容器 | 组件级响应式 |

> 核心原则：用 `rem` 做全局尺度，用 `px` 做固定细节，用 `%` 做流式布局，用 `clamp()` 做范围可控的响应式值。
