---
title: "Signal 响应式原理与前端的信号时代"
date: 2026-07-06
categories: "状态管理"
description: "深入解析 Signal 响应式编程的思想，对比 Vue ref、SolidJS、Angular Signal、Preact Signals 等不同实现，以及在前端的实际应用"
tags: ["状态管理", "JavaScript"]
copyright: true
---

## 前言

"Signal"（信号）正在成为前端响应式编程的新范式。从 SolidJS 的走红，到 Angular 16+ 引入 Signals，再到 Preact Signals、Vue 的 ref——Signal 模式正从各个框架中涌现。

本文将深入 Signal 的原理、实现与最佳实践。

---

## 一、什么是 Signal？

### 1.1 定义

Signal 是一个**可以随时间变化的值**，当它变化时，所有依赖它的计算和副作用会自动更新。

```ts
// 以 Preact Signals 为例
import { signal, computed, effect } from '@preact/signals'

const count = signal(0)           // 创建一个信号
const double = computed(() => count.value * 2) // 派生信号

effect(() => {
  console.log(`Count is ${count.value}`) // 当 count 变化时自动重运行
})

count.value = 1 // 自动触发 effect 重新执行
```

### 1.2 Signal vs 传统状态管理

| 特性 | Signal | Redux/Zustand | useState |
|------|--------|---------------|----------|
| 细粒度更新 | ✅ 精确更新 | ❌ 组件级重渲染 | ❌ 组件级重渲染 |
| 无依赖 | ✅ | ❌ Provider/Context | ❌ 闭包依赖 |
| 性能 | 最优 | 中 | 中 |
| 学习成本 | 低 | 高 | 低 |

---

## 二、Signal 的核心原理

### 2.1 三个基本概念

**1. 信号源（Source）**—— 可读可写的值
**2. 派生信号（Derived）**—— 自动计算的衍生值
**3. 副作用（Effect）**—— 响应变化的操作

### 2.2 依赖追踪的简化实现

```ts
// 当前的 effect 上下文
let currentEffect: (() => void) | null = null

class Signal<T> {
  private _value: T
  private subscribers = new Set<() => void>()

  constructor(value: T) {
    this._value = value
  }

  get value(): T {
    // 依赖收集：当 effect 中读取 value 时，注册订阅
    if (currentEffect) {
      this.subscribers.add(currentEffect)
    }
    return this._value
  }

  set value(newVal: T) {
    if (newVal !== this._value) {
      this._value = newVal
      // 触发更新：通知所有订阅者
      this.subscribers.forEach(fn => fn())
    }
  }
}

function effect(fn: () => void) {
  const wrapper = () => {
    currentEffect = wrapper
    fn()
    currentEffect = null
  }
  wrapper() // 立即执行，触发依赖收集
}
```

**核心就是四个字：** 推拉结合（Push-Pull）。

-   **Set 时 Push**：向所有订阅者推送"值变了"的通知
-   **Get 时 Pull**：在 effect/computed 中读取值时，自动注册订阅

---

## 三、各框架中的 Signal

### 3.1 SolidJS —— Signal 框架的先驱

```tsx
import { createSignal, createMemo, createEffect } from 'solid-js'

const [count, setCount] = createSignal(0)
const double = createMemo(() => count() * 2)

createEffect(() => {
  console.log(count()) // 自动追踪
})

return <div>{count()}</div> // 细粒度更新
```

SolidJS 没有虚拟 DOM——Signal 直接驱动真实 DOM 更新。

### 3.2 Angular Signals（v16+）

```ts
import { signal, computed, effect } from '@angular/core'

const count = signal(0)
const double = computed(() => count() * 2)

effect(() => {
  console.log(`Count: ${count()}`)
})

// 模板中自动解包
// <div>{{ count() }}</div>
```

### 3.3 Preact Signals

```tsx
import { signal } from '@preact/signals'

const count = signal(0)

// 在 JSX 中直接使用 .value
return <div>{count.value}</div>
```

### 3.4 Vue 的 ref 本质也是 Signal

```ts
import { ref, computed, watchEffect } from 'vue'

const count = ref(0)
const double = computed(() => count.value * 2)

watchEffect(() => {
  console.log(count.value)
})
```

Vue 3 的响应式系统本质上就是 Signal 模式的一种实现。

---

## 四、Signal 的优势场景

### 4.1 高性能列表

当列表中的一项变化时，Signal 可以只更新对应的 DOM 节点，而不是重新渲染整个列表。

### 4.2 跨组件状态

```ts
// store.ts
import { signal } from '@preact/signals'

export const user = signal(null)
export const theme = signal('light')

// 任意组件中
import { user, theme } from './store'
// 读取或修改都能自动响应
```

### 4.3 与不可变数据的配合

Signal 的 `.value` 赋值本身就是不可变操作——天然适合与 Immer 等工具配合。

---

## 五、Signal 的局限性

1. **调试相对困难** —— 隐式的依赖追踪让调用栈不那么直观
2. **与外部系统集成** —— 需要手动 bridge
3. **生态还在发展** —— React 官方尚未采纳 Signal（但社区已有 `useSignal`）

---

## 六、总结

Signal 不是银弹，但它提供了一种**更接近底层思维的响应式范式**——精确、高效、直观。从 SolidJS 到 Angular 再到 Preact，Signal 正在成为前端响应式编程的事实标准。

选择 Signal 的场景：
-   需要高性能细粒度更新
-   追求简洁的状态管理
-   新建项目，无历史包袱
