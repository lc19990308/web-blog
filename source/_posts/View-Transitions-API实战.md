---
title: "View Transitions API：原生页面过渡动画"
date: 2025-09-10
categories: "CSS"
description: "View Transitions API 能在 DOM 更新前后生成页面快照，为 SPA 路由提供原生过渡。本文说明降级策略、Vue Router 的正确包裹方式和动画边界。"
tags: "CSS"
copyright: true
---

## 过渡动画包住的是 DOM 更新

View Transitions API 的流程很直接：浏览器截取旧页面快照，执行一次 DOM 更新，再截取新快照并在两张快照间播放动画。它很适合 SPA 的路由切换和局部布局变化，因为动画不必等每个组件自己协调离场和入场。

但它不是路由库，也不是兼容性保证。调用前要准备普通更新路径，并尊重用户的“减少动态效果”偏好。动画失败不应该阻止页面跳转。

```ts
function updateWithTransition(update: () => void | Promise<void>) {
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  if (!document.startViewTransition || reduceMotion) {
    return Promise.resolve(update())
  }

  return document.startViewTransition(
    () => Promise.resolve(update()),
  ).finished
}
```

在不支持 API 的浏览器中，这段代码仍会执行 `update`。这才是渐进增强，而不是把功能建立在一次特性检测失败上。

## 从默认淡入淡出开始

不写 CSS 时，浏览器会使用默认的交叉淡入淡出。下面是一个有方向感、但不侵占内容本身的页面级动画：

```css
::view-transition-old(root) {
  animation: 220ms ease-out both page-leave;
}

::view-transition-new(root) {
  animation: 260ms ease-in both page-enter;
}

@keyframes page-leave {
  to {
    opacity: 0;
    transform: translateX(-2%);
  }
}

@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateX(2%);
  }
}
```

不要给每个元素都加动画。快照包含整个页面，过多的大面积 transform 会拖慢低性能设备，也会掩盖用户正在找的信息。标题、封面图这类具有连续身份的元素才值得单独指定名称。

```css
.post-title {
  view-transition-name: post-title;
}

::view-transition-old(post-title),
::view-transition-new(post-title) {
  animation-duration: 180ms;
}
```

同一时刻可见的元素不能重复使用同一个 `view-transition-name`，否则过渡可能被跳过。列表项需要为每一项生成唯一名称，或只给当前焦点项命名。

## 在 Vue Router 中等待渲染完成

把 `startViewTransition` 放进 `beforeEach` 并不能包住新页面 DOM，因为那时导航尚未完成。应由触发导航的代码调用路由跳转，并在回调里等 Vue 刷新 DOM。

```vue
<script setup lang="ts">
import { nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

async function navigate(to: string) {
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches

  if (!document.startViewTransition || reduceMotion) {
    await router.push(to)
    return
  }

  document.startViewTransition(async () => {
    await router.push(to)
    await nextTick()
  })
}
</script>

<template>
  <a href="/articles" @click.prevent="navigate('/articles')">文章列表</a>
</template>
```

这段代码适合主动发起的导航。浏览器后退、编程式跳转或全局导航策略应由应用统一封装，避免有些入口有过渡、有些入口没有。路由异步守卫失败时也要让链接保留可访问的 `href`，不能为了动画损失基本导航。

## 边界比动效更重要

视图过渡把旧页和新页短暂叠在一起。弹窗、固定头部、视频和懒加载图片容易出现闪烁或意外遮盖，应逐个验证。页面中存在敏感信息时，也要确认快照不会在跳转期间暴露给不该看到的视图。

上线前至少检查：

- API 不存在、用户开启减少动态效果时，导航仍然即时可用。
- 慢网络、路由懒加载和请求失败时，没有停在一张旧快照上。
- 键盘焦点会跟随新页面的主标题或首个可操作元素，而不是留在不可见的旧元素。
- 移动端、低性能设备和带固定导航的页面没有明显掉帧或遮挡。

先让信息架构和导航本身清楚，再让过渡动画帮助用户感知位置变化。API 的意义不在“多一个炫酷效果”，而在于用更少的协调代码获得可降级的连续感。

**推荐阅读：** [MDN：View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
