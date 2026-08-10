---
title: "Vue3 组合式 API 深度剖析：从 setup 到源码"
date: 2026-07-01
categories: "Vue3"
description: "深入 Vue3 Composition API 的设计哲学、核心 API 用法、常见陷阱与源码级别的响应式原理分析"
tags: ["Vue3", "JavaScript"]
copyright: true
---

## 前言

Vue 3 的组合式 API（Composition API）是 Vue 历史上最大的一次 API 变革。它不仅仅是语法糖，而是一种全新的代码组织范式。

本文将从**设计理念 → 核心 API → 常见陷阱 → 源码分析**四个维度，带你彻底掌握组合式 API。

---

## 一、为什么要有组合式 API？

### 1.1 Options API 的痛点

在 Vue 2 中，一个复杂的组件可能会有：

-   `data` 中分散的响应式数据
-   `computed` 中的衍生状态
-   `methods` 中的业务方法
-   `watch` 中的副作用监听

同一个关注点的逻辑被拆散在不同的选项中，当组件超过 500 行时，理解和维护变得极其困难。

### 1.2 Composition API 的解决方案

通过将相关逻辑聚合在自定义 `useXxx` 函数中，实现**按功能组织代码**：

```vue
<script setup>
// 用户管理相关
const { user, fetchUser } = useUser()
// 权限控制相关
const { permissions, checkPermission } = usePermission()
// 日志上报相关
const { report } = useLogger()
</script>
```

每个关注点独立成函数，跨组件复用也变得自然。

---

## 二、核心 API 详解

### 2.1 ref 与 reactive

```ts
import { ref, reactive } from 'vue'

// ref —— 适用于基本类型 + 对象（带 .value）
const count = ref(0)
count.value++

// reactive —— 仅适用于对象（自动深层响应）
const state = reactive({ count: 0 })
state.count++
```

**核心区别：**

| API | 支持类型 | 访问方式 | 响应式原理 |
|-----|---------|---------|-----------|
| `ref` | 任意 | `.value` | `RefImpl` 类 + getter/setter |
| `reactive` | 对象/数组 | 直接属性 | `Proxy` 代理 |

### 2.2 computed

```ts
const doubled = computed(() => count.value * 2)

// 可写计算属性
const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set: (val) => {
    [firstName.value, lastName.value] = val.split(' ')
  }
})
```

### 2.3 watch 与 watchEffect

```ts
// watch —— 需要明确的监听源
watch(count, (newVal, oldVal) => {
  console.log(`count 从 ${oldVal} 变为 ${newVal}`)
})

// watchEffect —— 自动追踪依赖
watchEffect(() => {
  console.log(`count 现在是 ${count.value}`)
})
```

**区别：** `watch` 可以访问旧值、懒执行；`watchEffect` 自动追踪、立即执行。

---

## 三、常见陷阱与最佳实践

### 陷阱 1：reactive 解构丢失响应性

```ts
// ❌ 错误
const { count } = state // count 变成普通值

// ✅ 正确
const count = computed(() => state.count)
// 或使用 toRefs
const { count } = toRefs(state)
```

### 陷阱 2：ref 在 reactive 中的自动解包

```ts
const count = ref(0)
const state = reactive({ count })
state.count // 0 —— 自动解包，不需要 .value
```

### 陷阱 3：watchEffect 的异步问题

```ts
// ❌ watchEffect 不会追踪异步回调中的依赖
watchEffect(async () => {
  const data = await fetch(`/api/user/${userId.value}`)
  // userId 的变化不会触发重新执行
})

// ✅ 改用 watch
watch(userId, async (id) => {
  const data = await fetch(`/api/user/${id}`)
})
```

---

## 四、源码级别的响应式原理

### 4.1 reactive —— Proxy 代理

Vue 3 使用 `Proxy` 拦截对象操作：

```ts
function reactive(target) {
  if (target?.[ReactiveFlags.IS_REACTIVE]) return target
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      track(target, key)    // 依赖收集
      return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver)
      trigger(target, key)  // 触发更新
      return result
    }
  })
  return proxy
}
```

### 4.2 ref —— RefImpl 类

```ts
class RefImpl<T> {
  private _value: T
  public dep?: Dep

  constructor(value: T) {
    this._value = toReactive(value)
  }

  get value() {
    trackRefValue(this) // 收集依赖
    return this._value
  }

  set value(newVal) {
    if (hasChanged(newVal, this._value)) {
      this._value = toReactive(newVal)
      triggerRefValue(this) // 触发更新
    }
  }
}
```

当 `ref` 包裹对象时，内部调用 `toReactive` → 实际还是交给 `reactive` 处理。

---

## 五、最佳实践总结

1. **默认用 `ref`** —— 语义统一，心智负担最低
2. **用 `reactive` 管理对象常量** —— 不需要解构的深层对象
3. **用 `computed` 描述衍生状态** —— 不要手动缓存
4. **优先 `watchEffect`** —— 依赖自动推断，代码更简洁
5. **`watch` 处理异步和事务逻辑** —— 需要旧值或精确控制时使用
6. **把逻辑提取为 `useXxx`** —— 当超过 15 行时就应该拆分

---

## 六、总结

组合式 API 不是对 Options API 的简单替代，而是对 Vue 开发范式的全面升级。它让逻辑复用变得天然，让代码组织变得灵活，让 TypeScript 支持变得流畅。

理解其背后 `Proxy` + 依赖收集的响应式原理，能让你在使用中更加自信，遇到 Bug 时也能快速定位。
