---
title: "XState 入门：用状态机管理复杂前端逻辑"
date: 2024-02-22
categories: "状态管理"
description: "XState 是 JavaScript 的状态机库，适合管理复杂交互流程（多步骤表单、加载/空/错误状态切换）。本文从有限状态机概念到 XState 实战"
tags: ["状态管理"]
copyright: true
---

## 前言

随着前端交互越来越复杂，用布尔变量组合管理状态变得难以维护：

```javascript
const isLoading = ref(false)
const isError = ref(false)
const isEmpty = ref(false)
const isSuccess = ref(false)
// 组合爆炸——有些组合是非法状态！
// isLoading && isSuccess 不应该同时为 true
```

**有限状态机（Finite State Machine）** 规定了状态之间的合法转换，杜绝非法状态。

---

## 一、核心概念

```javascript
import { createMachine } from 'xstate'

const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',     // 初始状态
  states: {
    idle: { on: { FETCH: 'loading' } },
    loading: {
      on: {
        RESOLVE: 'success',
        REJECT: 'error',
      },
    },
    success: { on: { FETCH: 'loading' } },
    error: { on: { FETCH: 'loading' } },
  },
})
```

```
          FETCH           RESOLVE
  idle ──────► loading ────────► success
                │                  │
          REJECT │                  │ FETCH
                ▼                  │
              error ◄──────────────┘
                │
                └──── FETCH ──────► loading
```

**核心价值：** 不可能出现 `isLoading && isSuccess`——状态机保证了这一点。

---

## 二、Vue 3 集成

```vue
<script setup>
import { useMachine } from '@xstate/vue'
import { createMachine } from 'xstate'

const machine = createMachine({
  initial: 'idle',
  states: {
    idle: { on: { FETCH: 'loading' } },
    loading: {
      invoke: {
        src: 'fetchData',
        onDone: { target: 'success', actions: 'assignData' },
        onError: { target: 'error' },
      },
    },
    success: {},
    error: { on: { RETRY: 'loading' } },
  },
})

const { state, send } = useMachine(machine, {
  services: {
    fetchData: () => fetch('/api/data').then(r => r.json()),
  },
})
</script>

<template>
  <div>
    <p v-if="state.matches('idle')">
      <button @click="send('FETCH')">加载数据</button>
    </p>
    <p v-if="state.matches('loading')">加载中...</p>
    <p v-if="state.matches('error')">
      出错了！<button @click="send('RETRY')">重试</button>
    </p>
    <div v-if="state.matches('success')">
      数据加载成功！
    </div>
  </div>
</template>
```

4 个状态，没有任何非法组合，转换路径一目了然。

---

**推荐阅读：** [XState 官方文档](https://xstate.js.org/docs/)
