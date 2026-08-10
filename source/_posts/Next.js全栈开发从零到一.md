---
title: "Next.js 全栈开发从零到一：App Router 实战指南"
date: 2026-07-05
categories: "React"
description: "从项目初始化到生产部署，系统学习 Next.js App Router 的核心概念：服务端组件、数据获取、路由与 API 路由"
tags: ["React", "Node-js"]
copyright: true
---

## 前言

Next.js 是目前最流行的 React 全栈框架。从 v13 开始的 App Router 彻底改变了 React 应用的开发范式——**服务端组件**成为默认，数据获取逻辑大为简化。

本文将从零开始构建一个完整的博客项目，涵盖 App Router 的核心概念。

---

## 一、App Router vs Pages Router

| 特性 | Pages Router | App Router |
|------|-------------|------------|
| 组件类型 | 全是客户端组件 | 默认服务端组件 |
| 路由方式 | 文件系统 | 文件系统 + Layout 嵌套 |
| 数据获取 | getServerSideProps / getStaticProps | 直接 async 组件 |
| 布局 | 需要 _app.tsx 手动实现 | 内置 Layout 嵌套 |

**App Router 的优势：** 更少的数据传输、更小的 JS Bundle、更直观的布局嵌套。

---

## 二、项目初始化

```bash
npx create-next-app@latest my-app --typescript --tailwind --app
```

目录结构：

```
my-app/
├── app/
│   ├── layout.tsx      # 根布局
│   ├── page.tsx        # 首页
│   ├── about/
│   │   └── page.tsx    # /about 页面
│   └── blog/
│       ├── layout.tsx  # 博客布局
│       ├── page.tsx    # /blog 列表页
│       └── [slug]/
│           └── page.tsx # /blog/:slug 详情页
└── ...
```

---

## 三、服务端组件 vs 客户端组件

### 3.1 默认：服务端组件

```tsx
// app/page.tsx —— 默认是服务端组件
// 可以直接使用 async/await！
async function getPosts() {
  const res = await fetch('https://api.example.com/posts')
  return res.json()
}

export default async function Home() {
  const posts = await getPosts()
  return (
    <ul>
      {posts.map(post => <li key={post.id}>{post.title}</li>)}
    </ul>
  )
}
```

### 3.2 客户端组件

```tsx
'use client'  // 标记为客户端组件

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

**自动代码分割：** 只有标注了 `'use client'` 的组件的 JS 才会发送给浏览器。

---

## 四、数据获取模式

### 4.1 静态渲染（Static Rendering）

```tsx
// 默认 —— 构建时获取，结果可缓存
const data = await fetch(url)
// 或
const data = await fetch(url, { cache: 'force-cache' })
```

### 4.2 动态渲染（Dynamic Rendering）

```tsx
// 每次请求时获取
const data = await fetch(url, { cache: 'no-store' })
// 或
const data = await fetch(url, { next: { revalidate: 60 } })
// 增量静态生成（ISR）：每 60 秒重新生成
```

### 4.3 Server Actions

```tsx
// app/actions.ts
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title')
  await db.post.create({ data: { title } })
  revalidatePath('/posts')  // 重新验证缓存
}
```

在客户端组件中调用：

```tsx
'use client'

export function PostForm() {
  return (
    <form action={createPost}>
      <input name="title" />
      <button type="submit">创建</button>
    </form>
  )
}
```

---

## 五、路由与导航

### 5.1 动态路由

```
app/blog/[slug]/page.tsx
```

```tsx
export default async function BlogPost({
  params
}: {
  params: { slug: string }
}) {
  const post = await getPost(params.slug)
  return <article>{post.content}</article>
}
```

### 5.2 链接与导航

```tsx
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// 声明式导航
<Link href="/blog/hello-world">阅读</Link>

// 命令式导航（客户端组件中）
const router = useRouter()
router.push('/blog/hello-world')
```

---

## 六、API 路由（Route Handlers）

```tsx
// app/api/posts/route.ts
export async function GET(request: Request) {
  const posts = await db.post.findMany()
  return Response.json(posts)
}

export async function POST(request: Request) {
  const body = await request.json()
  const post = await db.post.create({ data: body })
  return Response.json(post, { status: 201 })
}
```

---

## 七、中间件

```tsx
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

---

## 八、部署

```bash
# 构建
npm run build

# 部署到 Vercel（推荐）
# 连接 GitHub 仓库即可自动部署

# 或 Docker 部署
npm run start
```

---

## 九、最佳实践

1. **尽可能使用服务端组件** —— 减少客户端 JS 体积
2. **数据获取放在离使用最近的组件中** —— 避免 prop drilling
3. **使用 React Suspense 处理加载状态**
4. **用 Server Actions 替代 API 路由处理表单**
5. **利用 ISR（revalidate）平衡实时性和性能**

---

## 十、总结

Next.js App Router 代表了 React 全栈开发的未来方向。服务端组件带来的性能提升、数据获取的简化、以及布局系统的灵活性，让它成为构建现代 Web 应用的绝佳选择。
