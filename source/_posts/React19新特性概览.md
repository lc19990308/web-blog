---
title: "React 19 实战：Actions、use() 与乐观更新的边界"
date: 2025-02-20
categories: "React"
description: "React 19 的 use()、Actions、useActionState 和 useOptimistic 能减少表单与异步状态样板代码，但它们依赖 Suspense、Transition 和真实状态的正确配合。"
tags: ["React"]
copyright: true
---

React 19 把异步数据和表单提交的常见模式收进了框架 API。它们能减少手写 pending 状态和临时 UI 的代码，但不会替代数据缓存、错误处理或服务端框架的约定。

升级前确认项目的 React、React DOM、测试工具和框架适配版本一致。下面的例子只讨论客户端组件能够直接验证的行为。

## `use()` 读取 Promise 需要 Suspense

`use()` 可以在渲染期间读取 Promise。Promise 尚未完成时，组件会挂起，因此外层必须有 `<Suspense>` 提供回退 UI。

```jsx
import { Suspense, use } from 'react'

function Comments({ commentsPromise }) {
  const comments = use(commentsPromise)
  return <ul>{comments.map((item) => <li key={item.id}>{item.text}</li>)}</ul>
}

export function CommentsPanel({ commentsPromise }) {
  return (
    <Suspense fallback={<p>正在加载评论…</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  )
}
```

不要在客户端组件的每次渲染中临时创建一个新的请求 Promise，否则组件可能反复挂起。数据请求、缓存和重试策略仍应由框架或明确的数据层负责。

## `useActionState` 管理表单 Action 的结果

表单可以把 Action 直接交给 `action` 属性。回调第一个参数是上一次状态，第二个参数才是 `FormData`。

```jsx
import { useActionState } from 'react'

async function saveName(_previousState, formData) {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { message: '姓名不能为空。' }

  const response = await fetch('/api/profile', {
    method: 'POST',
    body: JSON.stringify({ name }),
    headers: { 'Content-Type': 'application/json' }
  })

  return response.ok
    ? { message: '已保存。' }
    : { message: '保存失败，请稍后重试。' }
}

function UpdateName() {
  const [state, formAction, isPending] = useActionState(saveName, { message: null })

  return (
    <form action={formAction}>
      <label>
        姓名 <input name="name" required />
      </label>
      <button disabled={isPending}>{isPending ? '提交中…' : '保存'}</button>
      <p role="status">{state.message}</p>
    </form>
  )
}
```

`isPending` 只描述这个 Action 的进行状态。网络错误、权限错误和字段级错误仍应按产品需求返回或上报。

## 乐观更新必须同时维护真实状态

`useOptimistic` 展示的是 Action 进行中的临时状态。调用更新函数需要位于 Action 或 Transition 中；请求成功后还要把服务器确认的值写回真实状态，否则临时值会在 Action 完成后消失。

```jsx
import { startTransition, useOptimistic, useState } from 'react'

function LikeButton({ initialLikes, postId }) {
  const [likes, setLikes] = useState(initialLikes)
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    likes,
    (currentLikes, delta) => currentLikes + delta
  )

  function handleLike() {
    startTransition(async () => {
      addOptimisticLike(1)

      try {
        const response = await fetch(`/api/posts/${postId}/like`, { method: 'POST' })
        if (!response.ok) throw new Error('like failed')
        const { likes: nextLikes } = await response.json()
        setLikes(nextLikes)
      } catch {
        // 未更新真实状态，Transition 结束后会回到原来的 likes。
      }
    })
  }

  return <button onClick={handleLike}>赞 {optimisticLikes}</button>
}
```

这个例子只处理单次点击。并发提交、重复点击、离线重试和服务端幂等性仍需要 API 设计配合。

## `ref` 可以作为普通 prop

React 19 中函数组件可以直接接收 `ref`，不再需要为了透传而包一层 `forwardRef`：

```jsx
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />
}
```

服务端组件和 Server Actions 的部署则依赖框架是否支持对应的 React 19 能力。它们不是把任意 SPA 改成全栈应用的一条导入语句。

参考：[React 19 发布说明](https://react.dev/blog/2024/12/05/react-19)、[useActionState](https://react.dev/reference/react/useActionState) 与 [useOptimistic](https://react.dev/reference/react/useOptimistic)。
