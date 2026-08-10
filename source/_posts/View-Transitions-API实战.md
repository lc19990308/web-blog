---
title: "View Transitions API：原生页面过渡动画"
date: 2025-09-10
categories: "CSS"
description: "View Transitions API 是实现 SPA 路由动效的浏览器原生方案，无需三方库。本文覆盖基础用法、SPA 集成、自定义动画"
tags: "CSS"
copyright: true
---

## 前言

SPA 应用中实现页面切换动画，通常需要三方库（如 Vue 的 `<Transition>`）或手写复杂逻辑。

**View Transitions API** 是浏览器原生方案——一行代码实现平滑页面过渡。

---

## 一、基础用法

```javascript
// 在不支持 View Transitions API 的浏览器中，这行代码就是普通的 document.startViewTransition
document.startViewTransition(() => {
  updatePageContent()  // 更新 DOM
})
```

浏览器会自动：
1. 截取当前页面快照
2. 执行 DOM 更新
3. 截取新页面快照
4. 执行默认交叉淡入淡出动画

---

## 二、自定义动画

```css
/* 定义旧页面退出动画 */
::view-transition-old(root) {
  animation: 0.3s ease-out both slide-out;
}

/* 定义新页面进入动画 */
::view-transition-new(root) {
  animation: 0.3s ease-in both slide-in;
}

@keyframes slide-out {
  to { transform: translateX(-100%); opacity: 0; }
}

@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
}
```

---

## 三、为特定元素添加动画

```css
/* 给页面标题添加专属过渡 */
.post-title {
  view-transition-name: post-title;
}

::view-transition-old(post-title) {
  animation: 0.3s ease-out both fade-out;
}

::view-transition-new(post-title) {
  animation: 0.3s ease-in both fade-in;
}
```

---

## 四、Vue Router 集成

```javascript
// router/index.js
const router = createRouter({ ... })

router.beforeEach((to, from) => {
  // 使用 View Transitions API 包裹路由跳转
  if (document.startViewTransition) {
    return new Promise((resolve) => {
      document.startViewTransition(() => {
        resolve()
      })
    })
  }
})
```

---

**推荐阅读：**
- [MDN: View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [Chrome 开发者文档](https://developer.chrome.com/docs/web-platform/view-transitions/)
