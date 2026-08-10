---
title: "你不知道的JavaScript（三十）：TC39 最新提案与 JavaScript 的未来"
date: 2026-06-28
categories: "你不知道的javascript"
description: "从 TC39 的提案流程到 Stage 3+ 的关键提案——Decorators、RegExp 增强、Iterator Helpers、Record & Tuple、Type Annotations，一窥 JavaScript 的未来"
tags: ["你不知道的javascript", "JavaScript", "ES6"]
copyright: true
---

## 前言

JavaScript 是一门"活"的语言——每年发布一个新版本。但 ECMAScript 的新特性从提出到落地，要经过漫长的**提案流程**。

> 你现在用的 `?.`（可选链）和 `??`（空值合并）——从提出到正式纳入标准用了 3 年。

本文带你了解 TC39 的工作机制，以及即将进入标准的**未来 JavaScript**。

---

## 一、TC39 提案流程

### 1.1 五个阶段

```
Stage 0: Strawman（稻草人）
  ↓ 由 TC39 成员提交任何想法
Stage 1: Proposal（提案）
  ↓ 描述问题 + 初步解决方案
Stage 2: Draft（草案）
  ↓ 有正式的语法和语义描述
Stage 3: Candidate（候选）
  ↓ 规范基本完成，等待实现和反馈
Stage 4: Finished（完成）
  ↓ 通过两次实现验证，纳入标准
```

**关键区别：** Stage 3 之前的提案**随时可能被修改或拒绝**。只有 Stage 4 的提案才确定进入下一个 ECMAScript 版本。

### 1.2 如何追踪提案

```js
// TC39 提案仓库：https://github.com/tc39/proposals

// Stage 3 以上的提案通常可以通过 Babel/Polyfill 使用
// Chrome/V8 的"实验性 JavaScript"也可以在 Flag 后开启

// chrome://flags/#enable-javascript-harmony
```

---

## 二、Stage 3 关键提案详解

### 2.1 Decorators（装饰器）

```js
// 装饰器提案（与 TypeScript 的装饰器不同！）
function logged(target, context) {
  const methodName = String(context.name)

  function replacementMethod(...args) {
    console.log(`调用 ${methodName}，参数:`, args)
    const result = target.call(this, ...args)
    console.log(`返回:`, result)
    return result
  }

  return replacementMethod
}

class Calculator {
  @logged
  add(a, b) {
    return a + b
  }
}

new Calculator().add(2, 3)
// 输出：
// 调用 add，参数: [2, 3]
// 返回: 5
```

**Stage 3 装饰器的关键变化：**
- 与 TypeScript 实验性装饰器**不兼容**
- 支持装饰类、方法、属性、访问器
- 不依赖 `[[Define]]` 语义，更安全

### 2.2 Temporal API

```js
// 替代 Date 的新时间 API
const { Temporal } = globalThis

// 创建日期 —— 不可变！
const date = Temporal.PlainDate.from('2026-06-28')
const time = Temporal.PlainTime.from('14:30:00')
const dateTime = Temporal.PlainDateTime.from('2026-06-28T14:30:00')

// 计算
const tomorrow = date.add({ days: 1 })
const lastMonth = date.subtract({ months: 1 })

// 时区处理
const zoned = Temporal.ZonedDateTime.from({
  timeZone: 'Asia/Shanghai',
  year: 2026,
  month: 6,
  day: 28,
  hour: 14,
})
console.log(zoned.toInstant().toString())
// "2026-06-28T06:00:00Z"（自动转换到 UTC）

// 时长计算
const duration = Temporal.Duration.from({ days: 3, hours: 5 })
console.log(duration.total('hours')) // 77
```

**Temporal 解决的 Date 痛点：**
- `Date` 是可变的（`setDate` 会修改原对象）
- `Date` 的月份从 0 开始（`getMonth()` 返回 0-11）
- `Date` 的时区支持非常弱
- 解析日期字符串的行为因浏览器而异

### 2.3 Record & Tuple

```js
// 深度不可变的数据结构
// 使用 #[] 和 #{} 创建

// Tuple —— 不可变数组
const tuple = #[1, 2, 3]
console.log(tuple[0]) // 1
// tuple[0] = 42 // ❌ TypeError

// 可以用展开运算符合并
const merged = #[...tuple, 4, 5] // #[1, 2, 3, 4, 5]

// Record —— 不可变对象
const record = #{ x: 1, y: 2 }
console.log(record.x) // 1
// record.x = 3 // ❌ TypeError

// Record 的相等性比较是基于值的！
const a = #{ x: 1, y: 2 }
const b = #{ y: 2, x: 1 }
console.log(a === b) // true（值相等）
```

**这对状态管理的影响：** 如果 Record & Tuple 普及，Redux/Zustand 的性能优化可能会被语言特性取代。

### 2.4 RegExp 增强

```js
// 正则表达式的 `v` 标志（Unicode 属性增强）
// 比 `u` 标志更强大的 Unicode 支持

// 字符类并集与差集
/[\p{Decimal_Number}--[0-9]]/v  // 匹配非 ASCII 的数字字符

// 案例：匹配中文数字
const chineseNums = /[\p{Script=Han}--[^一二三四五六七八九十]]/v

// 多字符串匹配
const pattern = /^(?<word>hello|world)$/v
```

### 2.5 Promise.withResolvers

```js
// 在函数外部直接 resolve/reject Promise
// 无需手动将 resolve 函数通过参数传递

// 之前需要这样包装：
function defer() {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// 现在：
const { promise, resolve, reject } = Promise.withResolvers()

// 使用：
resolve('done')
await promise // "done"
```

---

## 三、Stage 2 值得关注的提案

### 3.1 Type Annotations

```js
// 在 JavaScript 中使用 TypeScript 类型注释！
// 注意：这仅是"类型注释"，不做类型检查

function greet(name: string, age: number): string {
  return `Hello, ${name}, you are ${age}`
}

// 运行时完全不处理类型——只是注释
// 可以被 IDE 和工具使用
```

**核心思想：** 让 JavaScript 原生支持类型注释语法，**不引入新的类型检查器**。

### 3.2 Immutable Array Methods

```js
// 数组的新方法——返回新数组，不修改原数组

const arr = [3, 1, 2, 0, 5]

// toSorted —— 排序，返回新数组
const sorted = arr.toSorted() // [0, 1, 2, 3, 5]

// toReversed —— 反转，返回新数组
const reversed = arr.toReversed() // [5, 0, 2, 1, 3]

// toSpliced —— 拼接，返回新数组
const spliced = arr.toSpliced(1, 2, 10, 20) // [3, 10, 20, 0, 5]

// with —— 替换指定索引的元素
const withReplaced = arr.with(2, 100) // [3, 1, 100, 0, 5]
```

---

## 四、JavaScript 演化的趋势

```
过去的 JS： "玩具语言"
     ↓   ES6（类、箭头函数、Promise、模块）
现在的 JS： "全栈语言"
     ↓   ES2020-2025（可选链、空值合并、Temporal、Decorators）
未来的 JS： "系统语言"
         ← 类型注解、共享内存、不可变数据结构、模式匹配
```

**核心理念：** TC39 不再满足于"修补"JavaScript，而是在**保留向后兼容**的同时，把 JavaScript 推向系统级编程的能力。

---

## 五、如何提前使用这些特性

```bash
# 使用 Babel 编译 Stage 3+ 特性
npm install --save-dev @babel/preset-env

# 配置目标，Babel 会根据目标浏览器自动包含需要的 polyfill
```

```json
// babel.config.json
{
  "presets": [
    ["@babel/preset-env", {
      "targets": "> 0.25%, not dead",
      "shippedProposals": true // 包含 Stage 4 提案
    }]
  ]
}
```

---

## 六、总结

| Stage | 提案 | 影响 |
|-------|------|------|
| 4（已纳入） | 可选链、空值合并、Promise.allSettled | ✅ 已在 ES2020-2021 |
| 3（候选） | Decorators、Temporal、Record & Tuple | 🚀 即将到来 |
| 2（草案） | Type Annotations | 🔮 未来方向 |
| 1（提案） | Pattern Matching、Pipeline Operator | 💡 探索中 |

**保持关注：** TC39 的提案反映了 JavaScript 社区的集体智慧——即使某些提案最终被拒绝，其背后的思考也能帮你更深入地理解语言设计的权衡。
