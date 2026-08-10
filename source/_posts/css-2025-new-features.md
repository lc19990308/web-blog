---
title: "CSS 2025 新特性全景：has()、View Transitions、CSS Layers、Scroll-Driven Animations"
date: 2026-06-25
categories: "css"
description: "四大 CSS 重磅新特性的原理与实战，涵盖 :has() 选择器、View Transitions API、@layer 层级管理、以及滚动驱动动画"
tags: ["css"]
copyright: true
---

## 前言

CSS 在 2023-2025 年迎来了近年来最密集的更新。四个重量级特性正在改变前端开发者写 CSS 的方式：

- **`:has()`** — 父级选择器，终于可以根据子元素状态选择父元素
- **View Transitions API** — 原生页面过渡动画
- **`@layer`** — 显式控制样式层叠优先级
- **Scroll-Driven Animations** — 纯 CSS 滚动驱动动画

本文逐一实战讲解，附完整可运行示例。

---

## 一、:has() — 终于有了父级选择器

### 1.1 基础语法

`:has()` 是一个 **关系伪类**，它选择**包含指定子元素或后继元素的父元素**：

```css
/* 选择包含 <img> 的 <article> */
article:has(img) {
  display: grid;
  grid-template-columns: 1fr 2fr;
}

/* 选择包含 class="error" 元素的表单组 */
.form-group:has(.error) input {
  border-color: red;
}
```

### 1.2 实战场景

**场景一：表单验证样式**

以前我们只能用 JS 加类名，现在纯 CSS 搞定：

```css
/* 输入框校验状态 */
.input-group:has(input:valid)::after {
  content: '✓';
  color: green;
}

.input-group:has(input:invalid:not(:placeholder-shown))::after {
  content: '✗';
  color: red;
}
```

**场景二：卡片选中状态高亮**

```css
.card-list {
  display: flex;
  gap: 16px;
}

.card:has(input:checked) {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64,158,255,0.3);
  background: #f0f9ff;
}
```

**场景三：根据相邻元素调整布局**

```css
/* 选择 <h2> 后面紧跟着 <p> 的 h2 */
h2:has(+ p) {
  margin-bottom: 8px;
}

/* 选择包含两个以上子元素的父容器 */
.card:has(> :nth-child(2)) {
  grid-column: span 2;
}
```

### 1.3 性能注意事项

`:has()` 的 **计算成本较高**，因为浏览器需要扫描子元素来确定匹配。建议：

```css
/* ❌ 不推荐：深层嵌套的 :has() */
body:has(div:has(span:has(.icon))) { }

/* ✅ 推荐：尽量浅层，限制后代选择器深度 */
.card:has(.icon) { }  /* 直接后代选择 > 更高效 */
```

---

## 二、View Transitions API — 原生页面过渡

### 2.1 原理

View Transitions 是浏览器原生的**页面状态切换动画机制**。它快照当前的页面状态（`old`），切换到新状态（`new`），然后插值生成过渡动画：

```css
/* 基础用法：页面导航过渡 */
::view-transition-old(root) {
  animation: 300ms ease-out both fade-out;
}

::view-transition-new(root) {
  animation: 300ms ease-in both fade-in;
}

@keyframes fade-out {
  to { opacity: 0; transform: scale(0.95); }
}

@keyframes fade-in {
  from { opacity: 0; transform: scale(1.05); }
}
```

### 2.2 实战：列表到详情页过渡

HTML：

```html
<div class="gallery">
  <div class="card" style="view-transition-name: card-1">
    <img src="photo1.jpg" />
    <h3>照片 1</h3>
  </div>
  <div class="card" style="view-transition-name: card-2">
    <img src="photo2.jpg" />
    <h3>照片 2</h3>
  </div>
</div>
```

CSS：

```css
/* 点击卡片放大到全屏的过渡 */
.card {
  cursor: pointer;
  view-transition-name: var(--card-name);
}

/* 旧视图缩小 */
::view-transition-old(.card-1) {
  animation: 300ms ease-in both shrink;
}

/* 新视图放大 */
::view-transition-new(.card-1) {
  animation: 300ms ease-out both expand;
}

@keyframes shrink {
  to { opacity: 0; transform: scale(0.8); }
}

@keyframes expand {
  from { opacity: 0.3; transform: scale(1.2); }
}
```

### 2.3 MPA 跨页面过渡

2025 年 View Transitions 已支持跨文档（MPA 多页应用）：

```css
/* 跨页面过渡动画 */
@view-transition {
  navigation: auto;
}

/* 从列表页到详情页 */
html:active-view-transition-type(forwards) {
  &::view-transition-old(root) {
    animation: 300ms slide-left-out;
  }
  &::view-transition-new(root) {
    animation: 300ms slide-left-in;
  }
}
```

---

## 三、@layer — 样式层叠控制

### 3.1 问题背景

传统 CSS 的层叠优先级取决于**顺序**和**选择器权重**，难以控制第三方库的样式优先级：

```css
/* 第三方 UI 库的样式 */
.button { background: blue; }

/* 想覆盖它的样式，但必须提高权重或用 !important */
.my-app .button { background: red; }  /* 依赖权重 */
```

### 3.2 @layer 解决方案

`@layer` 让开发者显式声明层叠顺序：

```css
/* 定义层叠顺序：越靠后优先级越高 */
@layer reset, base, components, utilities;

/* 在各自层中定义样式 */
@layer reset {
  * { margin: 0; padding: 0; box-sizing: border-box; }
}

@layer base {
  body { font-family: system-ui, sans-serif; line-height: 1.6; }
}

@layer components {
  .button {
    padding: 8px 16px;
    background: #409eff;
    color: white;
    border-radius: 6px;
  }
}

@layer utilities {
  .mt-4 { margin-top: 16px; }
  .text-center { text-align: center; }
}
```

### 3.3 覆盖第三方库样式

```css
/* 将第三方样式放入低优先级层 */
@layer vendor {
  @import 'element-plus/dist/index.css';
}

/* 自己的样式放在更高优先级层 */
@layer app {
  .el-button {
    border-radius: 8px;  /* 覆盖 Element Plus 的圆角 */
  }
}
```

**效果**：`app` 层的样式永远高于 `vendor` 层，无需担心选择器权重问题。

### 3.4 嵌套层

```css
@layer components {
  @layer button {
    .btn { padding: 8px 16px; }
  }

  @layer card {
    .card { padding: 16px; border-radius: 8px; }
  }
}

/* 嵌套层中使用点语法引用 */
@layer components.button {
  .btn-primary { background: #409eff; }
}
```

---

## 四、Scroll-Driven Animations — 滚动驱动动画

### 4.1 基础概念

以前实现滚动动画需要 Intersection Observer + JS 或 ScrollTrigger 等库。现在纯 CSS 即可实现：

```css
/* 基础用法：滚动进度条 */
@keyframes progress {
  from { width: 0%; }
  to { width: 100%; }
}

.progress-bar {
  animation: progress linear;
  animation-timeline: scroll(root);  /* 监听根元素的滚动 */
}

/* 滚动触发范围：从滚动容器 0% 到 100% */
```

**`animation-timeline`** 属性有以下几个值：
- `scroll()` — 滚动进度（0-100%）
- `view()` — 元素在视口中的可见度（0-100%）
- 或一个 `ScrollTimeline` 实例名称

### 4.2 实战：滚动驱动的视差效果

```css
.parallax-section {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
}

.parallax-title {
  animation: parallax-fade linear;
  animation-timeline: view();
  animation-range: entry 0% exit 100%;
}

@keyframes parallax-fade {
  entry 0% {
    opacity: 0;
    transform: translateY(100px);
  }
  entry 100% {
    opacity: 1;
    transform: translateY(0);
  }
  exit 0% {
    opacity: 1;
    transform: translateY(0);
  }
  exit 100% {
    opacity: 0;
    transform: translateY(-100px);
  }
}
```

**效果**：标题在进入视口时从下往上淡入，离开时向上淡出。

### 4.3 实战：自动播放的轮播图

```css
.carousel-track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  animation: auto-scroll linear;
  animation-timeline: scroll(self);  /* 监听自身的滚动 */
}

.carousel-item {
  scroll-snap-align: start;
  min-width: 100%;
}

/* 滚动指示器（类似进度条） */
.carousel-indicator {
  height: 4px;
  background: #409eff;
  animation: progress linear;
  animation-timeline: scroll(self of .carousel-track);
}
```

### 4.4 animation-range 控制

```css
/* 控制动画作用的滚动范围 */
.element {
  animation: fade-in linear;
  animation-timeline: view();
  animation-range: contain 0% contain 100%;  /* 元素完全在视口内时动画 */
}

/* 不同的范围单位 */
animation-range: entry 0% exit 100%;      /* 进入视口到完全离开 */
animation-range: contain 0% contain 100%; /* 完全在视口内时 */
animation-range: cover 0% cover 100%;     /* 从开始进入到最后离开 */
```

---

## 五、综合实战：一个沉浸式落地页

结合以上四个特性，实现一个高交互性的落地页：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <style>
    /* 1. @layer 管理样式优先级 */
    @layer base, components, effects;

    @layer base {
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: system-ui; background: #0a0a1a; color: #fff; }
      section { height: 100vh; display: flex; align-items: center; justify-content: center; }
    }

    @layer components {
      .hero-title { font-size: clamp(2rem, 6vw, 6rem); text-align: center; }
      .card { padding: 2rem; background: rgba(255,255,255,0.05); border-radius: 1rem; backdrop-filter: blur(10px); }

      /* 3. :has() 实现卡片交互 */
      .card:has(:hover) { background: rgba(255,255,255,0.1); transform: translateY(-4px); }
      .card:hover { border-color: #60a5fa; }
    }

    @layer effects {
      /* 4. 滚动驱动动画 */
      .card {
        animation: card-enter linear;
        animation-timeline: view();
        animation-range: entry 0% entry 100%;
      }

      @keyframes card-enter {
        entry 0% { opacity: 0; transform: translateY(60px) scale(0.9); }
        entry 100% { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* 5. View Transitions 页面切换 */
      ::view-transition-old(root) {
        animation: 400ms ease-out both fade-scale-out;
      }
      ::view-transition-new(root) {
        animation: 400ms ease-in both fade-scale-in;
      }

      @keyframes fade-scale-out {
        to { opacity: 0; transform: scale(0.95); }
      }
      @keyframes fade-scale-in {
        from { opacity: 0; transform: scale(1.05); }
      }
    }
  </style>
</head>
<body>
  <!-- 实际内容 -->
  <section class="hero">
    <h1 class="hero-title">CSS 2025</h1>
  </section>
</body>
</html>
```

---

## 总结

| 特性 | 核心能力 | 兼容性状态（2025） |
|------|---------|-----------------|
| **`:has()`** | 父级选择器、状态驱动样式 | 全面支持 |
| **View Transitions** | 原生页面过渡动画 | Chrome/Edge 全量，Safari 部分 |
| **`@layer`** | 显式层叠优先级控制 | 全面支持 |
| **Scroll-Driven Animations** | 纯 CSS 滚动驱动动画 | Chrome/Edge 全量 |

这四个特性让 CSS 从**声明式样式语言**向**交互式样式平台**迈出了一大步。`:has()` 解决了选择器的能力缺口，View Transitions 提供了原生级过渡，`@layer` 解决了样式冲突管理，Scroll-Driven Animations 把动画控制权交给了滚动容器。

> 建议在实际项目中使用 @layer 重构样式组织方式，然后逐步引入 :has() 和 Scroll-Driven Animations 增强交互体验。
