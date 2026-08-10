---
title: "Nuxt 3 实战入门：从 Vue 到全栈框架"
date: 2025-01-15
categories: "Vue3"
description: "Nuxt 3 是 Vue 的全栈框架，支持 SSR/SSG/ISR。本文从项目初始化到页面路由、数据获取、部署，快速上手 Nuxt 3"
tags: "Vue3"
copyright: true
---

## 前言

Nuxt 3 是 Vue 生态中最受欢迎的全栈框架，它解决了传统 SPA 的几个痛点：

```markdown
SPA 的问题：
- 首屏加载慢（先下载 JS 再渲染）
- SEO 差（爬虫看不到内容）
- 服务端渲染配置复杂

Nuxt 3 的方案：
- 默认 SSR（首屏直出 HTML）
- 可选 SSG（静态生成）
- 约定式路由（无需配置）
- 自动导入（不用手动 import）
```

---

## 一、快速开始

```bash
npx nuxi init my-nuxt-app
cd my-nuxt-app
npm install
npm run dev
```

### 目录结构

```
my-nuxt-app/
├── pages/        # 页面（自动生成路由）
├── components/   # 组件（自动导入）
├── composables/  # 组合式函数（自动导入）
├── server/       # API 接口（后端）
├── layouts/      # 布局
├── middleware/   # 路由中间件
├── app.vue       # 入口
└── nuxt.config.ts # 配置
```

---

## 二、路由

Nuxt 3 约定式路由：`pages/` 下的文件结构自动映射为路由。

```vue
pages/
├── index.vue          → /
├── about.vue          → /about
├── blog/
│   ├── index.vue      → /blog
│   └── [id].vue       → /blog/:id
└── admin/
    └── dashboard.vue  → /admin/dashboard
```

```vue
<!-- pages/blog/[id].vue —— 动态路由 -->
<script setup>
const route = useRoute()
const { data: post } = await useFetch(`/api/posts/${route.params.id}`)
</script>

<template>
  <article>
    <h1>{{ post.title }}</h1>
    <div>{{ post.content }}</div>
  </article>
</template>
```

---

## 三、数据获取

```vue
<script setup>
// SSR 时在服务端请求，CSR 时在客户端请求
const { data: posts, pending, error } = await useFetch('/api/posts')

// 只会在客户端请求（如需要浏览器 API）
const { data } = await useFetch('/api/user', {
  lazy: true,  // 不阻塞页面渲染
})

// 只在服务端执行（适合 SSG）
const { data } = await useAsyncData('home', () => queryContent('/'))
</script>
```

---

## 四、服务端 API

```javascript
// server/api/posts.js —— Nuxt 自动创建 /api/posts 接口
export default defineEventHandler(async (event) => {
  const posts = await getPostsFromDatabase()
  return posts
})

// server/api/posts/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  return await getPostById(id)
})
```

---

## 五、部署

```bash
# 静态生成（适合博客、文档）
npm run generate
# 输出到 dist/，可部署到 GitHub Pages / Vercel / Netlify

# 服务端渲染（需要 Node 服务）
npm run build
node .output/server/index.mjs
```

**推荐阅读：** [Nuxt 3 官方文档](https://nuxt.com/)
