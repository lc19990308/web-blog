---
title: "React Hooks 从入门到原理：彻底搞懂 useState 与 useEffect"
date: 2026-07-02
categories: "React"
description: "从 useState 到 useEffect，再到自定义 Hooks，最后深入 React 源码理解 Hooks 的完整运行机制"
tags: ["React", "JavaScript"]
copyright: true
---

## 前言

Hooks 的出现标志着 React 从"类组件时代"进入"函数组件时代"。但很多开发者只会用，不理解其背后的**链表机制**、**闭包陷阱**和**调度原理**。

本文将带你在**会用**的基础上，彻底**搞懂** Hooks。

---

## 一、为什么需要 Hooks？

### 类组件的问题

-   **生命周期逻辑分散**：`componentDidMount` 和 `componentDidUpdate` 中混入无关代码
-   **this 指向困扰**：需要手动 bind 或使用箭头函数
-   **状态逻辑难以复用**：高阶组件和 Render Props 导致"包装地狱"

### Hooks 的优势

-   按逻辑组织代码，而非生命周期
-   无 class，无 this
-   自定义 Hooks 让状态逻辑复用变得自然

---

## 二、useState 详解

### 2.1 基本用法

```tsx
const [count, setCount] = useState(0)
```

### 2.2 更新方式的区别

```tsx
// 直接传值
setCount(count + 1)

// 函数式更新：依赖旧值
setCount(prev => prev + 1)
```

**为什么需要函数式更新？** 在多次调用时：

```tsx
// ❌ 三次都是拿同一个 count 值
setCount(count + 1)
setCount(count + 1)
setCount(count + 1) // 结果：+1 不是 +3

// ✅ 函数式更新
setCount(prev => prev + 1)
setCount(prev => prev + 1)
setCount(prev => prev + 1) // 结果：+3
```

### 2.3 惰性初始化

```tsx
// ❌ 每次渲染都执行一次 expensive 计算
const [state, setState] = useState(expensiveComputation())

// ✅ 只在初次渲染时执行
const [state, setState] = useState(() => expensiveComputation())
```

---

## 三、useEffect 详解

### 3.1 依赖数组机制

```tsx
// 每次渲染后执行
useEffect(() => { /* ... */ })

// 只执行一次（挂载 + 卸载）
useEffect(() => {
  return () => cleanup()
}, [])

// 依赖变化时执行
useEffect(() => {
  fetchData(id)
}, [id])
```

### 3.2 闭包陷阱

```tsx
function Counter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      // ❌ count 永远为 0 —— 闭包捕获了初始值
      console.log(count)
    }, 1000)
    return () => clearInterval(timer)
  }, []) // 依赖数组为空
}
```

**解决方案：**

```tsx
// 方案 A：加入依赖
useEffect(() => {
  const timer = setInterval(() => console.log(count), 1000)
  return () => clearInterval(timer)
}, [count])

// 方案 B：使用 ref 保持最新值
const countRef = useRef(count)
countRef.current = count

useEffect(() => {
  const timer = setInterval(() => console.log(countRef.current), 1000)
  return () => clearInterval(timer)
}, [])
```

---

## 四、useRef 与 useMemo

### 4.1 useRef 的本质

`useRef` 返回一个在组件的整个生命周期内保持不变的 `{ current: value }` 对象。

```tsx
// 1. 保存 DOM 引用
const inputRef = useRef<HTMLInputElement>(null)
<input ref={inputRef} />

// 2. 保存可变值（不触发重渲染）
const renderCount = useRef(0)
renderCount.current++

// 3. 保存上一次的值
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()
  useEffect(() => { ref.current = value })
  return ref.current
}
```

### 4.2 useMemo 与 useCallback

```tsx
// 缓存计算结果
const sortedList = useMemo(() => {
  return list.sort((a, b) => a - b)
}, [list])

// 缓存函数引用
const handleClick = useCallback(() => {
  doSomething(id)
}, [id])
```

**原则：** 不用过度优化。只在以下情况使用：
-   计算成本明确很高（O(n²) 以上）
-   作为 `useEffect` 或子组件 `React.memo` 的依赖

---

## 五、Hooks 底层原理（Fiber 链表）

React 内部用**链表**来管理 Hooks：

```ts
// 简化版 Hook 节点结构
type Hook = {
  memoizedState: any      // 当前值
  baseState: any          // 基础值
  baseQueue: Update | null // 更新队列
  queue: UpdateQueue | null
  next: Hook | null        // 指向下一个 Hook
}
```

**关键机制：**

1. **挂载阶段（mount）**：依次创建 Hook 节点，串联成链表
2. **更新阶段（update）**：按**相同顺序**从链表中取出 Hook 节点
3. **为什么不能用在条件/循环中**：顺序必须一致，否则链表错位

```tsx
// ❌ 违反 Hooks 规则
if (condition) {
  useState(0) // 本次渲染少了一个 Hook，链表错位！
}
```

---

## 六、自定义 Hooks 实战

```ts
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setData(data)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [url])

  return { data, loading }
}
```

---

## 七、总结

| Hook | 用途 | 原理 |
|------|------|------|
| `useState` | 状态管理 | Fiber 链表上的 memoizedState |
| `useEffect` | 副作用 | commit 阶段异步执行 |
| `useRef` | 持久引用 | 整个生命周期不变的对象 |
| `useMemo` | 缓存计算 | 依赖不变则跳过计算 |
| `useCallback` | 缓存函数 | 相当于 `useMemo(() => fn, deps)` |
| `useReducer` | 复杂状态 | 类 Redux 的 dispatch 模式 |

Hooks 的核心一句话总结：**以固定的顺序在 Fiber 节点上维护一条单向链表，每次渲染按顺序读取**。
