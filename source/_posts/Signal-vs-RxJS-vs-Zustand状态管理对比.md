---
title: "Signal vs RxJS vs Zustand：前端状态管理三兄弟对比"
date: 2026-07-16
categories: "状态管理"
description: "Signal（Preact Signals）、RxJS（响应式流）、Zustand（直观 Store）——三种不同的响应式范式，各自适合什么场景？"
tags: ["状态管理", "JavaScript"]
copyright: true
---

## 前言

如果你在选型状态管理方案，你可能会困惑：

- **RxJS**：概念多（Observable、Subject、Operator），但功能强大
- **Zustand**：简单直观，像 React useState 的全局版
- **Signal**：新兴范式，细粒度更新，性能最优

本文将从**设计哲学、API 风格、性能、适用场景**四个维度，帮你做出选择。

---

## 一、整体对比

| 维度 | Zustand | RxJS | Signal（Preact Signals） |
|------|---------|------|--------------------------|
| 核心理念 | 不可变 Store + selector | 响应式流（Stream） | 推拉结合的细粒度响应 |
| 学习曲线 | ⭐（低） | ⭐⭐⭐⭐⭐（高） | ⭐⭐（中低） |
| Bundle 大小 | 1KB | 30KB+ | 1.5KB |
| 性能 | 中（组件级重渲染） | 高（需手动优化） | 最高（细粒度更新） |
| 异步处理 | 手动 | ✅ 天然支持 | 需配合 |
| 框架绑定 | React | 独立框架 | 各框架适配 |

---

## 二、Zustand —— 最简单的手感

### 2.1 创建 Store

```ts
import { create } from 'zustand'

type Store = {
  count: number
  increment: () => void
  decrement: () => void
}

const useStore = create<Store>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 }))
}))
```

### 2.2 使用

```tsx
function Counter() {
  const count = useStore((state) => state.count)
  const increment = useStore((state) => state.increment)

  return <button onClick={increment}>{count}</button>
}
```

**优点：** 几乎没有心智负担，像 `useState` 的全局版。
**缺点：** 默认是组件级重渲染（Selector 只能在一定程度上优化）。

---

## 三、RxJS —— 流式编程的瑞士军刀

### 3.1 基础概念

```ts
import { Subject, fromEvent, debounceTime, switchMap, map } from 'rxjs'

// Subject —— 一个可订阅的事件源
const searchSubject = new Subject<string>()

// 管道操作
searchSubject.pipe(
  debounceTime(300),           // 防抖
  switchMap(query =>           // 切换：自动取消上一个请求
    fetch(`/api/search?q=${query}`).then(r => r.json())
  ),
  map(results => results.slice(0, 10))
).subscribe(results => {
  console.log(results)
})

// 推送事件
searchSubject.next('reac')
searchSubject.next('react')
```

### 3.2 React 中使用

```tsx
import { useObservable } from 'rxjs-hooks'

function SearchPage() {
  const searchTerm$ = useMemo(() => new Subject<string>(), [])

  const results = useObservable(
    () => searchTerm$.pipe(
      debounceTime(300),
      switchMap(query => fetch(`/api/search?q=${query}`).then(r => r.json()))
    ),
    []
  )

  return (
    <input onChange={e => searchTerm$.next(e.target.value)} />
  )
}
```

**优点：** 强大的操作符组合能力，天然处理异步和竞态。
**缺点：** 学习成本高，调试困难（大量的链式调用）。

---

## 四、Signal —— 新一代高性能方案

### 4.1 基础用法

```ts
import { signal, computed, effect } from '@preact/signals'

const count = signal(0)
const double = computed(() => count.value * 2)

effect(() => {
  console.log(`Count: ${count.value}, Double: ${double.value}`)
})

count.value = 5 // 自动触发 effect
```

### 4.2 React 中使用

```tsx
import { useSignal, useComputed } from '@preact/signals-react'

function Counter() {
  const count = useSignal(0)
  const double = useComputed(() => count.value * 2)

  return (
    <button onClick={() => count.value++}>
      Count: {count.value} (Double: {double})
    </button>
  )
}
```

**优点：**
- 细粒度更新：只更新实际变化的 DOM 节点
- 无依赖收集开销：编译时/运行时自动追踪
- 性能最好

**缺点：**
- 生态较新
- 与 React 的并发模式（Concurrent Mode）还在磨合

---

## 五、选型指南

### 选择 Zustand 当……

- 团队 React 经验有限，想要最小的学习成本
- 状态结构简单，不需要复杂的响应式操作
- 应用规模不大，性能不是瓶颈

### 选择 RxJS 当……

- 需要处理复杂的异步流（实时数据、WebSocket、事件组合）
- 项目中已经有 RxJS（Angular 项目几乎必用）
- 团队熟悉函数式编程和响应式编程范式

### 选择 Signal 当……

- 追求极致的渲染性能
- 新建项目，无历史包袱
- 喜欢"自动追踪"的直观体验
- 在 SolidJS、Angular 或 Preact 项目中使用

---

## 六、总结

没有"最好"的状态管理方案，只有"最适合"的：

```
复杂异步流  →  RxJS
简单全局态  →  Zustand
极致性能    →  Signal
```

如果你还在犹豫：**Zustand 是最安全的起点**——学习成本低、生态稳定、迁移成本小。
