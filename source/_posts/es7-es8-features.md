---
title: "ES7 与 ES8 补全：指数运算符、尾逗号、SharedArrayBuffer 与 Atomics"
date: 2026-06-25
categories: "ES6"
description: "补齐 ES2016（ES7）和 ES2017（ES8）中尚未覆盖的特性：指数运算符 **、尾逗号语法、SharedArrayBuffer 与 Atomics 并发原语"
tags: ["ES6", "JavaScript"]
copyright: true
---

## 前言

ES2016（ES7）和 ES2017（ES8）的大多数特性已在之前各篇中覆盖：

| 已覆盖 | 所在文章 |
|--------|---------|
| `Array.prototype.includes`（ES7） | ES6+ 新增数组方法 |
| `Async/Await`（ES8） | YDKJS 17 |
| `Object.values/entries`（ES8） | ES6 对象增强 |
| `Object.getOwnPropertyDescriptors`（ES8） | ES6 对象增强 |
| `String.padStart/padEnd`（ES8） | ES6 模板字符串与字符串方法 |

本文补齐剩下的三个特性。

---

## 一、指数运算符 `**`（ES2016）

### 1.1 基础

```javascript
// ES7 引入了 Math.pow 的语法糖
2 ** 3    // 8（2 的 3 次方）
2 ** 4    // 16
3 ** 2    // 9

// 等价于
Math.pow(2, 3)  // 8
```

### 1.2 指数赋值 `**=`

```javascript
let x = 2
x **= 3  // x = 2 ** 3 = 8

let y = 5
y **= 2  // y = 25
```

### 1.3 优先级

```javascript
// `**` 的优先级高于 `*` 和 `/`
2 * 3 ** 2     // 2 * 9 = 18（先计算指数）
(2 * 3) ** 2   // 6 ** 2 = 36

// 结合性：右结合
2 ** 3 ** 2    // 2 ** (3 ** 2) = 2 ** 9 = 512
(2 ** 3) ** 2  // 8 ** 2 = 64
```

### 1.4 与 Math.pow 的区别

```javascript
// 结果相同
2 ** 3           // 8
Math.pow(2, 3)   // 8

// 指数运算符支持 BigInt
2n ** 3n         // 8n
Math.pow(2n, 3n) // ❌ TypeError（Math.pow 不支持 BigInt）

// `**` 更简洁，链式调用更清晰
2 ** 3 ** 4                    // 2 ** (3 ** 4) = 2 ** 81
Math.pow(2, Math.pow(3, 4))    // 同上，但可读性差
```

---

## 二、尾逗号（Trailing Commas，ES2017）

函数参数列表和调用中允许尾逗号：

### 2.1 函数参数

```javascript
// ES2017 之前 —— 参数列表最后一个参数不能加逗号
function foo(a, b) {}     // ✅
// function foo(a, b,) {} // ❌ SyntaxError

// ES2017 之后 —— 允许
function foo(a, b,) {}    // ✅

foo(1, 2,)                // ✅ 调用时也可以
```

### 2.2 为什么要有尾逗号？

```javascript
// 主要目的：减少 git diff
// 不加尾逗号时，加一行会导致上一行也变红

// 没有尾逗号
const obj = {
  a: 1,
  b: 2,   // ← 加新属性时这里要加逗号
  c: 3    // ← 这行没有逗号
}

// 有尾逗号
const obj = {
  a: 1,
  b: 2,
  c: 3,   // ← 加新属性时这行不需要改
  d: 4,   // ← 只加这行，前两行 diff 无变化
}
```

```diff
# 无尾逗号时的 diff
 const obj = {
   a: 1,
-  b: 2          # 这行变了（加了逗号）
+  b: 2,
+  c: 3          # 新行
 }

# 有尾逗号时的 diff
 const obj = {
   a: 1,
   b: 2,
+  c: 3,         # 只加了这一行，diff 更干净
 }
```

### 2.3 哪些地方可以用尾逗号

```javascript
// ✅ 对象字面量
const obj = { a: 1, b: 2, }

// ✅ 数组
const arr = [1, 2, 3,]

// ✅ 函数参数（ES2017）
function foo(a, b,) {}
const bar = (a, b,) => {}
foo(1, 2,)

// ✅ 解构
const [a, b,] = [1, 2, 3]
const { x, y, } = { x: 1, y: 2 }

// ✅ import/export
import { a, b, } from './module'
export { a, b, }

// ❌ JSON（不允许）
JSON.parse('{"a":1,"b":2,}')  // SyntaxError
```

---

## 三、SharedArrayBuffer 与 Atomics（ES2017）

用于**多线程共享内存**（配合 Web Worker）。这个特性比较进阶，日常前端开发很少用到。

### 3.1 SharedArrayBuffer

普通 `ArrayBuffer` 在不同 Worker 间传递时会复制。`SharedArrayBuffer` 是**共享**的——多个 Worker 读写同一块内存：

```javascript
// 主线程
const sharedBuffer = new SharedArrayBuffer(4)  // 4 字节共享内存
const sharedArray = new Int32Array(sharedBuffer)

// 启动 Worker
const worker = new Worker('worker.js')
worker.postMessage(sharedBuffer)  // 传递的是共享引用，不是复制

// 主线程修改
sharedArray[0] = 42

// Worker 也能看到修改
```

```javascript
// worker.js
self.onmessage = (event) => {
  const sharedArray = new Int32Array(event.data)
  console.log(sharedArray[0])  // 42（主线程写的值）
  sharedArray[1] = 100  // 主线程也能看到
}
```

### 3.2 Atomics —— 安全读写共享内存

共享内存的问题：两个线程同时读写同一个位置，会出现**竞态条件**。

```javascript
// 没有同步的并发访问（可能出问题）
sharedArray[0]++  // 读取 → 加 1 → 写入（三步操作不是原子性的）
// 如果两个 Worker 同时执行这行，结果可能不是预期的 +2
```

`Atomics` 提供**原子操作**：

```javascript
// Atomics.add —— 原子加
Atomics.add(sharedArray, 0, 1)  // 线程安全地 +1

// Atomics.load —— 原子读
Atomics.load(sharedArray, 0)

// Atomics.store —— 原子写
Atomics.store(sharedArray, 0, 42)

// Atomics.exchange —— 原子交换
const oldValue = Atomics.exchange(sharedArray, 0, 100)

// Atomics.compareExchange —— 条件交换
Atomics.compareExchange(sharedArray, 0, 42, 100)
// 只有当前值 === 42 时，才写入 100
```

### 3.3 Atomics 的等待/通知机制

```javascript
// Worker A —— 等待条件
Atomics.wait(sharedArray, 0, 0)
// 阻塞直到 sharedArray[0] 不再是 0

// Worker B —— 通知等待者
Atomics.store(sharedArray, 0, 1)
Atomics.notify(sharedArray, 0, 1)  // 唤醒 Worker A
```

### 3.4 安全要求

```javascript
// 使用 SharedArrayBuffer 需要在 HTTP 响应头中设置
// Cross-Origin-Opener-Policy: same-origin
// Cross-Origin-Embedder-Policy: require-corp

// 否则会报错：
// "SharedArrayBuffer is not defined"
// 或
// "The SharedArrayBuffer object can only be shared with same-origin contexts"
```

### 3.5 实际应用场景

```javascript
// 1. 音视频处理 —— 多个 Worker 并行处理帧
// 2. 大数组并行计算 —— 分割数据到多个 Worker
// 3. 游戏引擎 —— Entity 状态共享
// 4. Canvas 像素操作

// 简单示例：并行求和
// 主线程
function parallelSum(array) {
  const numWorkers = navigator.hardwareConcurrency || 4
  const chunkSize = Math.ceil(array.length / numWorkers)
  const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)
  const result = new Int32Array(sharedBuffer)
  result[0] = 0
  let completed = 0

  return new Promise((resolve) => {
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker('sum-worker.js')
      const start = i * chunkSize
      const chunk = array.slice(start, start + chunkSize)
      worker.postMessage({ chunk, sharedBuffer })
      worker.onmessage = () => {
        completed++
        if (completed === numWorkers) resolve(result[0])
      }
    }
  })
}
```

---

## 四、ES7 / ES8 特性一览

| 版本 | 特性 | 状态 |
|------|------|------|
| **ES2016** | `Array.prototype.includes` | ✅ 已覆盖 |
| **(ES7)** | **指数运算符 `**`** | **✅ 本篇** |
| **ES2017** | `async/await` | ✅ YDKJS 17 |
| **(ES8)** | `Object.values / entries` | ✅ 对象增强篇 |
| | `Object.getOwnPropertyDescriptors` | ✅ 对象增强篇 |
| | `String.padStart / padEnd` | ✅ 字符串篇 |
| | **函数参数尾逗号** | **✅ 本篇** |
| | **SharedArrayBuffer / Atomics** | **✅ 本篇** |

---

## 总结

```javascript
// ES7（2016）—— 两个特性
arr.includes(NaN)     // 数组包含判断
2 ** 10               // 指数运算符（比 Math.pow 更简洁）

// ES8（2017）—— 六个特性
async function getData() { return await fetch(url) }
Object.values(obj)
Object.entries(obj)
str.padStart(5, '0')
function foo(a, b,) {}  // 尾逗号
new SharedArrayBuffer(4) // 共享内存（进阶）
```

> 日常开发中指数运算符 `**` 和尾逗号属于高频使用的小特性。SharedArrayBuffer 属于进阶内容，遇到并行计算场景时再深入了解即可。
