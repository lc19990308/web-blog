---
title: "Vue 3.5 响应式原理深度剖析：从源码看响应式演进"
date: 2026-06-25
categories: "vue3"
description: "深入 Vue 3.5 响应式系统源码，剖析 Proxy/Ref/Reactive 的实现原理、响应式链路追踪机制，以及相比 3.0-3.4 的性能优化演进"
tags: ["vue3", "JavaScript"]
copyright: true
---

## 前言

Vue 3 的响应式系统经历了数个大版本的迭代。从 3.0 的 `Proxy` 基础实现，到 3.4 的 `响应式优化`，再到 **3.5 对响应式链路的全面重构**，每一次演进都在提升性能和开发体验。

本文将深入 Vue 3.5 的响应式源码，剖析三个核心问题：
1. **响应式数据如何被追踪？**
2. **依赖收集和派发更新的链路是怎样的？**
3. **3.5 相比之前版本做了哪些关键优化？**

---

## 一、响应式核心：Proxy + Reflect

### 1.1 基础原理

Vue 3 的核心响应式基于 **Proxy**（代理）和 **Reflect**（反射）：

```javascript
// 简化版 reactive 实现
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      // 依赖收集：谁在读取这个值？
      track(target, key)
      return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver)
      // 派发更新：值变了，通知订阅者
      trigger(target, key)
      return result
    }
  })
}
```

**为什么要用 `Reflect` 而不是直接 `target[key]`？**

关键在 **`this` 指向**。当对象继承时，`Reflect.get` 能正确传递 `receiver`（调用者），保证 `this` 指向正确：

```javascript
const parent = { get foo() { return this.bar }, bar: 1 }
const child = { bar: 2 }
Object.setPrototypeOf(child, parent)

child.foo // 2 — 正确，this 指向 child
```

### 1.2 Proxy 的局限性

Vue 3 的 Reactive 基于 Proxy，但 Proxy 有局限性：
- **原始类型（string/number/boolean）不能代理** → 需用 `ref()`
- **深层响应式需要递归代理** → 性能开销
- **数组索引和 length 变更的特殊处理** → 额外复杂度

---

## 二、依赖收集系统：track 与 trigger

### 2.1 三层数据结构

Vue 的依赖收集维护了一个三层嵌套的 Map 结构：

```
targetMap (WeakMap)
  └── target (对象) → depsMap (Map)
        └── key (属性名) → dep (Set)
              └── effect (副作用函数)
```

```javascript
// 核心数据结构
const targetMap = new WeakMap() // 弱引用，对象可被 GC

function track(target, key) {
  if (!activeEffect) return // 没有活跃的 effect，跳过

  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))

  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))

  // 将当前活跃的 effect 添加进依赖
  dep.add(activeEffect)
  activeEffect.deps.push(dep) // 双向关联，便于 cleanup
}
```

**为什么用 WeakMap？** — 当响应式对象不再被引用时，WeakMap 的键（对象）可以被垃圾回收，避免内存泄漏。而 Map 的键是强引用，对象不会被回收。

### 2.2 effect 的 cleanup 机制

每次 effect 重新运行前，会清空旧的依赖关系，重新收集：

```javascript
function cleanup(effect) {
  const { deps } = effect
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect)
  }
  deps.length = 0
}

function runEffect(effect) {
  cleanup(effect)
  activeEffect = effect
  effect.fn() // 重新执行，触发 track 重新收集
  activeEffect = null
}
```

这种 **先清空再收集** 的机制保证了依赖是精确的、不会残留。

---

## 三、reactive 实现细节

### 3.1 深层响应式

Vue 3 的 `reactive()` 在读取时按需递归代理，而不是在初始化时全量递归：

```javascript
function createReactiveObject(target) {
  // 已经代理过的，返回已有代理
  if (target[ReactiveFlags.IS_REACTIVE]) return target

  const proxy = new Proxy(target, baseHandlers)

  // 标记已代理
  proxy[ReactiveFlags.IS_REACTIVE] = true

  return proxy
}

// getter 中按需递归
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    const value = Reflect.get(target, key, receiver)

    // 只对对象类型递归
    if (!shallow && isObject(value)) {
      return isReadonly ? readonly(value) : reactive(value)
    }

    return value
  }
}
```

### 3.2 reactive 的缓存

Vue 3.5 使用 **全局缓存** 避免重复代理：

```javascript
const reactiveMap = new WeakMap() // 原始对象 → 代理对象

function reactive(target) {
  // 命中缓存
  const existingProxy = reactiveMap.get(target)
  if (existingProxy) return existingProxy

  // 已代理过的，不重复代理
  if (target[ReactiveFlags.IS_REACTIVE]) return target

  const proxy = new Proxy(target, mutableHandlers)
  reactiveMap.set(target, proxy)
  return proxy
}
```

---

## 四、ref 的底层实现

### 4.1 为什么需要 ref？

原始类型（number、string、boolean）无法被 Proxy 代理，所以 Vue 用 **ref** 包装它们：

```javascript
function ref(value) {
  return createRef(value, false)
}

function createRef(rawValue, shallow) {
  // 已包装过的 ref 直接返回
  if (isRef(rawValue)) return rawValue

  return new RefImpl(rawValue, shallow)
}

class RefImpl {
  constructor(value, __v_isShallow) {
    this.__v_isShallow = __v_isShallow
    this.dep = undefined // 依赖集合
    this.__v_isRef = true
    this._rawValue = toRaw(value)
    this._value = toReactive(value) // 如果值是对象，转为 reactive
  }

  get value() {
    trackRefValue(this) // 读取时收集依赖
    return this._value
  }

  set value(newVal) {
    if (hasChanged(toRaw(newVal), this._rawValue)) {
      this._rawValue = toRaw(newVal)
      this._value = toReactive(newVal)
      triggerRefValue(this) // 设置时触发更新
    }
  }
}
```

**关键细节**：`toReactive` 会将对象类型的 ref 值自动转为 `reactive`，所以 `ref({ count: 0 })` 内部实际上是一个 reactive 对象。

### 4.2 shallowRef

```javascript
function shallowRef(value) {
  return createRef(value, true)
}
// 与 ref 的区别：传入的对象不会被 reactive 包裹
```

---

## 五、computed 的实现

`computed` 本质是一个 **惰性求值的 effect**：

```javascript
class ComputedRefImpl {
  constructor(getter) {
    this._value = undefined
    this._dirty = true // 脏标记

    this.effect = new ReactiveEffect(getter, () => {
      // 调度器：依赖变化时标记脏
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this) // 通知 computed 的订阅者
      }
    })
  }

  get value() {
    trackRefValue(this) // 收集对 computed 的依赖

    if (this._dirty) {
      this._dirty = false
      this._value = this.effect.run() // 重新求值
    }

    return this._value
  }
}
```

**脏标记机制（_dirty）**：
- 首次读取时计算值，`_dirty = false`
- 依赖发生变化时，调度器将 `_dirty` 置为 `true`，但**不重新求值**
- 下次读取时发现 `_dirty === true`，重新计算
- 这实现了**惰性求值**：只有用到 computed 时才重新计算

---

## 六、Vue 3.5 的响应式优化演进

### 6.1 Vue 3.0 → 3.2：基础 Proxy 实现

- 3.0：首次引入 Proxy 响应式
- 3.2：`ref` 解包优化、`defineComponent` 类型增强

### 6.2 Vue 3.3 → 3.4：响应式性能优化

- 3.3：`defineModel`、泛型组件
- 3.4：响应式**运算量减少**，避免不必要的嵌套响应式转换

### 6.3 Vue 3.5 关键优化

**1. 响应式链路追踪优化**

3.5 优化了依赖收集的执行路径，减少了不必要的函数调用：

```javascript
// 3.4 及之前：每次 track 都执行完整的 Map 查找
// 3.5：在热点路径上做了缓存和短路判断
function track(target, type, key) {
  // 3.5 新增：快速跳过没有 activeEffect 的情况
  if (!shouldTrack || !activeEffect) return

  // 3.5 优化：使用箭头函数减少闭包开销
  // ... 内部实现更紧凑
}
```

**2. `reactive` 在大数据量场景的初始化性能提升**

对大数组和深层对象做了优化，减少初始化的递归次数。

**3. 内存占用降低**

通过更精细的 WeakMap 管理和 dep 集合的复用，减少了整体内存占用。

**4. watch 回调优化**

```javascript
// 3.5 watch 深层监听更高效
watch(obj, (newVal, oldVal) => {
  console.log('对象变化了')
})
// 3.5 内部使用更高效的遍历方式，减少深层遍历开销
```

---

## 七、实战：手写简化版响应式系统

结合以上知识，实现一个微型响应式系统：

```javascript
// reactive.js — 微型响应式系统

let activeEffect = null
const targetMap = new WeakMap()

function reactive(target) {
  if (typeof target !== 'object' || target === null) return target

  return new Proxy(target, {
    get(target, key, receiver) {
      track(target, key)
      const value = Reflect.get(target, key, receiver)
      // 深层递归
      if (typeof value === 'object' && value !== null) {
        return reactive(value)
      }
      return value
    },
    set(target, key, value, receiver) {
      const oldValue = target[key]
      const result = Reflect.set(target, key, value, receiver)
      if (oldValue !== value) {
        trigger(target, key)
      }
      return result
    }
  })
}

function track(target, key) {
  if (!activeEffect) return

  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))

  let dep = depsMap.get(key)
  if (!dep) depsMap.set(key, (dep = new Set()))

  dep.add(activeEffect)
}

function trigger(target, key) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  const dep = depsMap.get(key)
  if (dep) {
    dep.forEach(effect => effect())
  }
}

function watchEffect(fn) {
  const effect = () => {
    activeEffect = effect
    fn()
    activeEffect = null
  }
  effect()
  return () => {
    // 清理
    targetMap.forEach(depsMap => {
      depsMap.forEach(dep => dep.delete(effect))
    })
  }
}

// 使用示例
const state = reactive({ count: 0, name: 'Vue' })

watchEffect(() => {
  console.log(`count: ${state.count}`)
})
// 输出: count: 0

state.count++  // 输出: count: 1
state.name = 'Vue 3.5'  // 不触发（未读取 name）
```

---

## 总结

1. **Vue 3 响应式核心**是 `Proxy + Reflect + WeakMap` 三层依赖追踪结构
2. **reactive** 处理对象，按需深层递归；**ref** 包装原始类型，内部用 `toReactive` 统一
3. **computed** 基于脏标记实现惰性求值，只有被读取时才重新计算
4. **Vue 3.5** 在响应式链路追踪、大数据量初始化和内存占用上做了优化
5. 理解响应式原理能帮助写出更高效的 Vue 代码，避免常见的响应式丢失陷阱

> 建议阅读 Vue 3.5 源码入口 `packages/reactivity/src/` 深入理解。
