---
title: "Nuxt 3 实战入门：从 Vue 到全栈框架"
date: 2025-01-15
categories: "Vue3"
description: "从 Vue SPA 迁移到 Nuxt 3 时，先分清渲染方式、数据边界与部署形态。本文用一个文章页说明路由、数据请求、服务端接口和静态部署。"
tags: "Vue3"
copyright: true
---

## 先决定页面在哪儿渲染

Nuxt 3 不是给 Vue 加一层目录约定。它把 Vue 页面放进一个同时能在服务端和浏览器运行的运行时里，因此首要问题不是“要不要用 SSR”，而是页面的数据来自哪里、页面要部署到哪里。

一个内容型页面通常有三种选择：

- **SSR**：每次请求由服务端渲染 HTML。内容随请求变化、需要读取登录态时适合它。
- **预渲染**：构建时生成 HTML，适合文档和很少变化的博客。它可以部署到纯静态托管。
- **客户端请求**：页面先呈现壳，再由浏览器读取只和当前用户有关的数据，例如通知、草稿或本地偏好。

这三种方式可以共存在一个项目里。不要把 Nuxt 当成“所有页面都必须 SSR”的框架，也不要在静态托管上期待 `server/api` 仍能处理运行时请求。

## 建一个可运行的最小项目

```bash
npm create nuxt@latest my-nuxt-app
cd my-nuxt-app
npm install
npm run dev
```

最常用的目录并不多：

```text
my-nuxt-app/
├── pages/        # 文件系统路由
├── components/   # Vue 组件，可自动导入
├── composables/  # 可复用的组合式逻辑
├── server/api/   # Nitro 服务端接口
├── layouts/      # 页面布局
├── middleware/   # 路由中间件
├── app.vue       # 应用入口
└── nuxt.config.ts
```

`pages/` 的文件名就是路由。`pages/index.vue` 对应 `/`，`pages/posts/[id].vue` 对应 `/posts/:id`。这层约定能减少样板配置，但路由参数仍然是不可信的外部输入，服务端需要校验它。

## 用 `useFetch` 读取文章

下面是一张文章详情页。把请求放在 `setup` 顶层并 `await`，Nuxt 会在首次服务端渲染时取数，再把结果放进 payload；浏览器接管页面时会复用这份数据，而不是立刻再请求一次。

```vue
<!-- pages/posts/[id].vue -->
<script setup>
const route = useRoute()

const { data: post, status, error } = await useFetch(
  () => `/api/posts/${route.params.id}`,
)
</script>

<template>
  <main>
    <p v-if="status === 'pending'">正在读取文章…</p>
    <p v-else-if="error">文章暂时无法读取。</p>
    <article v-else-if="post">
      <h1>{{ post.title }}</h1>
      <div>{{ post.content }}</div>
    </article>
  </main>
</template>
```

动态 URL 会随路由参数变化重新请求。只有在确实依赖浏览器 API 或登录后的私有数据时，才把请求限制在客户端：

```vue
<script setup>
const { data: profile } = await useFetch('/api/me', {
  server: false,
  lazy: true,
  default: () => null,
})
</script>
```

`server: false` 的含义是首个 HTML 不带这份数据，不能拿它渲染首屏必须出现的内容。`lazy: true` 则让路由导航不等待请求完成，页面要给 `pending` 和错误状态留位置。

## 服务端接口只做服务端该做的事

`server/api/posts/[id].get.ts` 会映射为 `GET /api/posts/:id`。它适合封装数据库、私有令牌或后端聚合，不等于把数据库查询直接暴露给浏览器。

```ts
// server/api/posts/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id || !/^[a-z0-9-]+$/i.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid post id' })
  }

  const post = await getPostById(id)

  if (!post) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' })
  }

  return post
})
```

真实项目还应在这一层做鉴权、输入校验、超时和可观察性处理。组件只负责展示状态，不要把数据库凭据或第三方密钥放进 `runtimeConfig.public`。

## 部署前先选运行形态

需要按请求渲染时，构建产物包含服务端入口：

```bash
npm run build
node .output/server/index.mjs
```

纯静态站点则生成可直接托管的文件：

```bash
npm run generate
# 静态文件位于 .output/public
```

部署到 GitHub Pages 这类静态平台时，还要配置仓库子路径，并确认所有需要的内容能在构建阶段预渲染：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    baseURL: '/my-repository/',
  },
})
```

静态托管不会启动 `server/api`。如果页面必须在访问时查询数据，应把接口放到独立后端或选择支持 Nuxt 服务端运行时的平台。

## 上线前检查

- 用无痕窗口访问文章页，确认首屏 HTML 已含关键正文。
- 观察浏览器网络面板，确认同一份首屏数据没有在 hydration 后重复请求。
- 静态构建后直接预览 `.output/public`，检查子路径、404 页和资源地址。
- 把私有配置留在服务端运行时配置中，不提交到仓库，也不输出给浏览器。

Nuxt 的价值在于让这些选择落在同一套 Vue 开发体验里。页面越重要，越值得先把它的渲染时机和数据责任划清楚。

**推荐阅读：** [Nuxt 数据获取文档](https://nuxt.com/docs/3.x/getting-started/data-fetching)
