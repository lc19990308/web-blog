---
title: "CSS Container Queries 实战：容器查询改写响应式"
date: 2025-06-12
categories: "CSS"
description: "Container Queries 是 CSS 近年来最重要的新特性之一——让组件根据自身容器尺寸而非视口尺寸响应。本文从基础到实战全面覆盖"
tags: "CSS"
copyright: true
---

## 前言

传统响应式设计依赖于**视口宽度**（`@media`）。但问题是：**同一个组件在不同位置宽度不同，却只有一套样式**。

Container Queries 解决了这个问题——**组件根据自身容器的宽度调整样式**。

---

## 一、Container Queries vs Media Queries

```css
/* ❌ 媒体查询——基于视口宽度 */
@media (max-width: 768px) {
  .card { flex-direction: column; }
}

/* ✅ 容器查询——基于父容器宽度 */
@container (max-width: 400px) {
  .card { flex-direction: column; }
}
```

在宽屏侧边栏中，即使视口是 1920px，如果容器只有 300px 宽，组件也能正确显示"窄版"样式。

---

## 二、基本用法

```css
/* 1. 定义容器 */
.card-container {
  container-type: inline-size;  /* 基于容器宽度 */
  container-name: card;         /* 容器名称（可选） */
}

/* 2. 在容器内使用查询 */
@container card (max-width: 400px) {
  .card { flex-direction: column; }
  .card__image { width: 100%; }
  .card__title { font-size: 1rem; }
}

@container card (min-width: 600px) {
  .card { flex-direction: row; }
  .card__image { width: 200px; }
}
```

---

## 三、实战：自适应组件

```vue
<template>
  <!-- 容器 -->
  <div class="card-container">
    <div class="card">
      <img class="card__image" src="photo.jpg" />
      <div class="card__body">
        <h2 class="card__title">标题</h2>
        <p class="card__desc">描述文字...</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-container {
  container-type: inline-size;
}

.card { display: flex; gap: 16px; }

/* 窄容器：垂直排列 */
@container (max-width: 400px) {
  .card { flex-direction: column; }
  .card__image { width: 100%; }
}

/* 宽容器：水平排列 */
@container (min-width: 601px) {
  .card { flex-direction: row; }
  .card__image { width: 200px; }
}
</style>
```

---

## 四、浏览器支持

2025 年所有现代浏览器均已支持 Container Queries，可安全使用。

---

**推荐阅读：** [MDN: CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
