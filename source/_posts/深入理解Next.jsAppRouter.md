---
title: "深入理解 Next.js App Router：服务端组件、流式渲染与缓存策略"
date: 2026-07-18
categories: "React"
description: "Next.js App Router 的核心机制深度解析——RSC Payload、Streaming SSR、数据缓存策略，帮你真正理解它在做什么"
tags: ["React", "Node-js"]
copyright: true
---

## 前言

Next.js App Router 引入的不仅是新的路由方式，更是一整套**服务端优先的渲染架构**。不理解背后的机制，你会在实际开发中遇到各种"奇怪"的问题：

- "为什么我的组件不更新？"
- "为什么客户端拿不到服务端的数据？"
- "为什么页面渲染了两次？"

本文将从**底层机制**出发，帮你彻底搞懂 App Router。

---

## 一、RSC 与服务端组件

### 1.1 什么是 RSC？

RSC（React Server Components）是一种新的组件类型——它在**服务端渲染**，生成一种叫做 **RSC Payload** 的特殊数据结构，然后发送给客户端。

```
服务端 React 组件
       ↓ 渲染
RSC Payload（一种特殊 JSON，包含虚拟 DOM 描述）
       ↓ 传输
客户端 React 使用 RSC Payload 更新 DOM
```

### 1.2 RSC Payload 长什么样？

```ts
// 服务端组件渲染后的 RSC Payload（简化）
{
  type: 'div',
  props: {
    children: [
      { type: 'h1', props: { children: 'Hello Next.js' } },
      // 客户端组件的"占位符"
      { type: Symbol('client.component'), props: {
        id: 'Counter',
        // 客户端组件的 props 序列化后嵌入
        props: JSON.stringify({ initialCount: 0 })
      }}
    ]
  }
}
```

**关键理解：** 服务端组件的代码永远不会发送到浏览器！只有渲染结果（RSC Payload）会。

### 1.3 为什么服务端组件不能有状态？

```tsx
// ❌ 服务端组件不支持 useState
export default async function Page() {
  const [count, setCount] = useState(0) // 编译错误！
  return <div>{count}</div>
}
```

因为服务端组件在服务端运行，渲染完成后就销毁了。`useState` 的"状态"无处保存。

---

## 二、Streaming SSR（流式渲染）

### 2.1 传统 SSR 的问题

```
请求 → 加载全部数据 → 渲染全部 HTML → 发送到浏览器
                                                    ← 用户等待所有数据就绪才能看到页面
```

### 2.2 Streaming SSR

```
请求 → 立刻发送 Suspense 边界（Loading UI） →
  → 数据 1 就绪 → 流式发送数据 1 的 HTML →
  → 数据 2 就绪 → 流式发送数据 2 的 HTML →
```

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react'
import { UserProfile, RecentOrders, Loading } from './components'

export default function Dashboard() {
  return (
    <div>
      <h1>仪表盘</h1>
      <Suspense fallback={<Loading />}>
        {/* 每个组件独立获取数据，独立流式传输 */}
        <UserProfile />
      </Suspense>
      <Suspense fallback={<Loading />}>
        <RecentOrders />
      </Suspense>
    </div>
  )
}
```

**效果：** 先展示用户头像骨架，订单数据就绪后自动注入——用户不需要等待所有数据。

---

## 三、缓存策略

### 3.1 三层缓存

```
┌─────────────┐
│ Request Memoization │ ← 同一请求内的 fetch 去重（每个请求自动）
├─────────────┤
│ Data Cache  │ ← 跨请求的持久化数据缓存（需配置）
├─────────────┤
│ Full Route Cache │ ← 静态路由的全页面缓存（构建时）
└─────────────┘
```

### 3.2 Request Memoization（请求记忆化）

```tsx
// 在同一个组件树中，相同的 URL 和 options 只请求一次
async function getPost(id: string) {
  const res = await fetch(`/api/posts/${id}`)
  return res.json()
}

async function Page({ params }: { params: { id: string } }) {
  const post = await getPost(params.id)     // 首次请求
  const author = post.author
  const related = await getPost(params.id)  // 命中缓存！不发送网络请求
  // ...
}
```

### 3.3 数据缓存和重新验证

```tsx
// 时间触发的重新验证
fetch(url, { next: { revalidate: 60 } })  // 每 60 秒重新验证

// 按需重新验证
import { revalidatePath, revalidateTag } from 'next/cache'

// 重新验证某个路径
revalidatePath('/blog')

// 重新验证带 tag 的请求
fetch(url, { next: { tags: ['posts'] } })
revalidateTag('posts')
```

---

## 四、客户端组件插入

```tsx
// app/layout.tsx —— 服务端组件
import { Nav } from './nav'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <Nav />              {/* Nav 是客户端组件 */}
        <main>{children}</main>
      </body>
    </html>
  )
}
```

```tsx
// nav.tsx —— 客户端组件（渲染后插入服务端输出的 HTML 中）
'use client'

import { useState } from 'react'

export function Nav() {
  const [open, setOpen] = useState(false)
  return (
    <nav>
      <button onClick={() => setOpen(!open)}>菜单</button>
      {open && <Menu />}
    </nav>
  )
}
```

**混合渲染：** 服务端发来的 HTML 中，客户端组件的位置是一个"占位符"。浏览器加载 JS 后，React 在客户端"激活"（hydrate）这些组件。

---

## 五、常见问题

### Q: 为什么页面刷新后数据丢失？

如果你在客户端组件中用 `useEffect` 获取数据，刷新后会重新获取——因为只在客户端运行。改成在服务端组件中获取即可。

### Q: 客户端组件中如何访问服务端数据？

```tsx
// 服务端组件 → 把数据作为 props 传给客户端组件
async function Page() {
  const data = await getData()
  return <ClientComponent data={data} />
}

// 客户端组件接收 props
'use client'
function ClientComponent({ data }: { data: DataType }) {
  return <div>{data.title}</div>
}
```

---

## 六、总结

| 概念 | 一句话理解 |
|------|-----------|
| RSC Payload | 服务端组件的序列化输出，而非 HTML |
| Streaming | 数据就绪一部分就发送一部分 |
| Request Memoization | 同次渲染中相同请求自动去重 |
| Dynamic Rendering | 每次请求都重新生成 |
| Static Rendering | 构建时生成并缓存 |
| ISR | 静态页面按时间重新生成 |

理解这些底层机制，你就能准确判断"这个数据应该在哪里获取"、"这个组件应该是服务端还是客户端"。
