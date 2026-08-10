---
title: "你不知道的JavaScript（二十二）：内存管理与 V8 垃圾回收机制"
date: 2026-06-27
categories: "你不知道的javascript"
description: "JS 开发者眼中的「自动内存管理」并非魔法——V8 的分代垃圾回收、标记-清除、增量标记、内存泄漏模式与 WeakRef 的正确用法"
tags: ["你不知道的javascript", "JavaScript", "浏览器"]
copyright: true
---

## 前言

JavaScript 是"自动垃圾回收"的语言——分配内存简单，但回收呢？

> "只要我不主动释放内存，JS 引擎会自动帮我收。"

这句话**既对也不对**。理解 V8 的 GC 机制，不仅能防止内存泄漏，还能写出对 GC 更友好的高性能代码。

---

## 一、V8 的分代垃圾回收

### 1.1 代际假说

V8 基于一个经验观察：**大多数对象的生命周期很短**。

```
新建对象 → 大部分很快就死掉了
             ↕
        少数活下来的 → 进入老生代，活得久
```

基于此，V8 将堆内存分为两代：

```
┌───────────────────────┐
│   新生代（Young Gen）  │ ← 新对象存放处 (~16MB)
│  ┌─────────────────┐  │
│  │ From 空间        │  │
│  │ To 空间（空闲）   │  │
│  └─────────────────┘  │
├───────────────────────┤
│   老生代（Old Gen）    │ ← 存活对象晋升处 (数百 MB~GB)
│                       │
└───────────────────────┘
```

### 2.2 Scavenge 算法

新生代使用 Scavenge（Cheney 算法）：

```
1. 在 From 空间中分配新对象
2. From 空间快满时 → 标记存活对象
3. 将存活对象复制到 To 空间
4. 交换 From 和 To 角色
5. 原 From 空间被整体回收
```

**特点：** 只复制存活对象（少则快），适合新生代（大部分对象已死亡）。

**晋升条件：** 如果一个对象经过了两次 Scavenge 仍然存活，或 To 空间已使用超过 25%，则晋升到老生代。

---

## 二、老生代垃圾回收

### 2.1 标记-清除（Mark-Sweep）

```
阶段 1：标记（Mark）
  从根对象（全局对象、当前执行上下文等）出发，深度遍历所有可达对象并标记

阶段 2：清除（Sweep）
  遍历堆，回收所有未被标记的对象

阶段 3：整理（Compact，可选）
  将存活对象移到一起，减少内存碎片
```

```js
// 根对象有哪些？
global / window    ← 全局对象
当前函数的局部变量  ← 调用栈
正在执行中的 Promise、定时器回调等
```

### 2.2 三色标记法（Tri-color Marking）

为了避免"标记过程中对象引用关系变化"的问题，V8 使用三色标记：

| 颜色 | 含义 | 处理 |
|------|------|------|
| 白色 | 未被访问 | 最终被回收 |
| 灰色 | 已访问自身，未访问其引用 | 需要继续遍历 |
| 黑色 | 自身和其引用都已访问 | 安全存活 |

**并发标记的问题：** 如果标记过程中 JS 改变了引用，可能导致"黑色对象引用白色对象"——V8 用**写屏障（Write Barrier）**来检测这种情况。

---

## 三、增量标记与并发标记

### 3.1 全停顿（Stop The World）的问题

早期的 GC 会暂停 JS 执行，老生代如果有 100MB 活跃对象，一次 GC 可能暂停 **100ms+**——用户会感受到卡顿。

### 3.2 增量标记（Incremental Marking）

```
传统 GC： [JS 执行] [  GC...100ms  ] [JS 执行]
                   ↑ 暂停

增量标记： [JS 执行] [GC:5ms] [JS 执行] [GC:5ms] ...
                    ↑ 几乎无感
```

将一次完整的 GC 拆分为多个 5ms 的片段，穿插在 JS 执行间隙中。

### 3.3 并发标记（Concurrent Marking）

V8 的最新改进——标记阶段在**后台线程**中执行，完全不阻塞主线程：

```
主线程：     [JS 执行]   ← 完全不受影响
GC 线程：    [标记...标记...标记...]
```

V8 通过**写屏障**来同步主线程与 GC 线程之间的引用变化。

---

## 四、常见内存泄漏模式

### 4.1 意外的全局变量

```js
function leak() {
  leaked = '全局变量'  // 没声明，变成全局变量
}
leak()  // leaked 永远无法回收
```

**修复：** 严格模式 `'use strict'` 让未声明变量报错。

### 4.2 闭包的不当使用

```js
function createLeak() {
  const hugeData = new Array(1000000).fill('x')
  return function() {
    console.log('small')  // 只用了这个函数，但 hugeData 被闭包捕获
  }
}
```

**修复：** 只捕获需要的变量，或手动置为 `null`。

### 4.3 事件监听器未清理

```js
class Component {
  mount() {
    window.addEventListener('resize', this.handleResize)
  }
  // ❌ 没有 unmount，组件销毁后监听器仍然存活
}
```

### 4.4 定时器

```js
const intervalId = setInterval(() => {
  // 引用了大量 DOM 元素
}, 1000)
// ❌ clearInterval 从未被调用
```

---

## 五、WeakRef 与 FinalizationRegistry

### 5.1 WeakRef —— 不阻止 GC 的引用

```js
let obj = { data: '重要内容' }
const weakRef = new WeakRef(obj)

// 之后某时
const deref = weakRef.deref()
if (deref) {
  console.log('对象仍然存活', deref)
} else {
  console.log('对象已被 GC 回收')
}

obj = null  // 现在这个对象可以被回收了
```

**使用场景：** 缓存映射——当内存紧张时自动释放。

### 5.2 FinalizationRegistry —— 监听 GC

```js
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`${heldValue} 被回收了`)
})

let obj = { data: 'test' }
registry.register(obj, '缓存数据')

obj = null
// 下次 GC 时，控制台会输出："缓存数据 被回收了"
```

**注意：** GC 时机不可预测，不要依赖 FinalizationRegistry 做关键逻辑。

---

## 六、编写对 GC 友好的代码

```js
// ❌ 避免
function process() {
  const arr = []
  for (let i = 0; i < 1000; i++) {
    arr.push({ data: 'x'.repeat(100) })
  }
  // 每次都分配新数组
}

// ✅ 推荐：复用对象，减少分配
const buffer = { data: '' }
function process() {
  for (let i = 0; i < 1000; i++) {
    buffer.data = 'x'.repeat(100)  // 复用
  }
}
```

**原则：**
1. 避免在热路径中创建大量临时对象
2. 及时清理事件监听和定时器
3. 使用 WeakMap/WeakSet 做对象关联数据
4. 对性能关键场景，考虑对象池模式

---

## 七、总结

| 概念 | 一句话 |
|------|--------|
| 新生代 | 新对象存放处，Scavenge 快速回收 |
| 老生代 | 存活对象的久居区，标记-清除 |
| 增量标记 | GC 分片执行，避免长时间暂停 |
| 并发标记 | 后台线程做标记，不阻塞主线程 |
| 写屏障 | 拦截引用变化，保证 GC 正确性 |
| WeakRef | 不阻止 GC 的引用，适合缓存 |

理解 GC 机制，不是为了手动管理内存（JS 也不需要），而是**写出让 GC 更容易处理的代码**。
