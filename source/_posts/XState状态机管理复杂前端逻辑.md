---
title: "XState 入门：用状态机管理复杂前端逻辑"
date: 2024-02-22
categories: "状态管理"
description: "当加载、错误、重试和多步骤操作互相影响时，用状态机明确合法状态和事件。本文以 XState v5 的 actor 与 snapshot 模型实现一个可重试的数据请求。"
tags: ["状态管理"]
copyright: true
---

## 布尔变量何时开始失控

一个页面只有“加载中”时，`isLoading` 足够。等到它同时要处理首次加载、成功、空数据、失败、重试和取消，多个布尔变量很容易制造不该出现的组合：`isLoading` 与 `isSuccess` 同时为真，或错误提示没有随着重试清掉。

状态机把问题换成两个更具体的问题：系统当前处于什么状态？它在这个状态下允许接收什么事件？这会让非法组合变成模型里根本不存在的路径。

状态机不适合替换所有组件状态。输入框内容、折叠开关和一次性的局部视觉状态仍可以用 `ref`。当状态之间有明确顺序、异步操作或多个入口会改变同一流程时，状态机才开始划算。

## 先把流程画成事件

以下请求只有四个稳定状态：

```text
idle -- FETCH --> loading -- done --> success
                     |                  |
                     +-- error --> failure -- RETRY --> loading
```

这里的 `FETCH`、`RETRY` 是外部事件；请求成功和失败是 actor 的完成结果。先写出这些边界，再写代码，通常能发现遗漏的取消、返回或权限失效路径。

## 用 XState v5 建模异步请求

XState v5 使用 actor 承担异步工作，界面读取 actor 的 `snapshot`。下面的机器只允许在 `idle` 或 `failure` 时进入加载，成功后不会因为某个遗留布尔值继续展示加载态。

```ts
import { assign, fromPromise, setup } from 'xstate'

type User = { id: string; name: string }

export const usersMachine = setup({
  types: {
    context: {} as { users: User[]; error: string | null },
    events: {} as { type: 'FETCH' } | { type: 'RETRY' },
  },
  actors: {
    loadUsers: fromPromise(async () => {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('读取用户失败')
      return (await response.json()) as User[]
    }),
  },
}).createMachine({
  id: 'users',
  initial: 'idle',
  context: { users: [], error: null },
  states: {
    idle: { on: { FETCH: 'loading' } },
    loading: {
      invoke: {
        src: 'loadUsers',
        onDone: {
          target: 'success',
          actions: assign({
            users: ({ event }) => event.output,
            error: () => null,
          }),
        },
        onError: {
          target: 'failure',
          actions: assign({ error: ({ event }) => String(event.error) }),
        },
      },
    },
    success: { on: { FETCH: 'loading' } },
    failure: { on: { RETRY: 'loading' } },
  },
})
```

机器本身不绑定 Vue，因此可以在测试里直接向 actor 发送事件，断言每次转换后的 snapshot。复杂流程不必靠点击 UI 才能验证。

## 在 Vue 3 中订阅快照

安装 `xstate` 和 `@xstate/vue` 后，`useMachine` 会在组件卸载时停止 actor。模板读取的是当前快照，而不是 v4 中常见的 `state` 对象。

```vue
<script setup lang="ts">
import { useMachine } from '@xstate/vue'
import { usersMachine } from '@/machines/users'

const { snapshot, send } = useMachine(usersMachine)
</script>

<template>
  <section>
    <button
      v-if="snapshot.matches('idle')"
      type="button"
      @click="send({ type: 'FETCH' })"
    >
      读取用户
    </button>

    <p v-else-if="snapshot.matches('loading')">正在读取…</p>

    <div v-else-if="snapshot.matches('failure')">
      <p>{{ snapshot.context.error }}</p>
      <button type="button" @click="send({ type: 'RETRY' })">重试</button>
    </div>

    <ul v-else>
      <li v-for="user in snapshot.context.users" :key="user.id">
        {{ user.name }}
      </li>
    </ul>
  </section>
</template>
```

如果请求需要取消、超时或并发刷新，应把这些事件显式写进机器。不要在组件外另塞一个 `isLoading` 来绕过模型，那会重新引入两套事实来源。

## 把机器当成可审查的业务规则

状态机最实用的地方不在术语，而在代码审查时可以直接问：这个事件从哪些状态进入？失败后还能重试吗？新请求到来时旧请求怎么处理？

可以从以下场景开始验证：

- 初始状态只能发送 `FETCH`，不能直接显示成功数据。
- 请求成功后再次刷新是否会保留旧数据，产品要有明确选择。
- `failure` 的错误信息是否会在下一次成功时清除。
- 组件卸载或路由离开时，正在运行的 actor 是否应停止。

流程复杂并不一定需要状态机，但当“允许什么发生”已经比“存一个值”更重要时，状态图会比一组相互牵制的布尔变量可靠。

**推荐阅读：** [Stately XState 文档](https://stately.ai/docs/xstate)
