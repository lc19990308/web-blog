---
title: "你不知道的JavaScript（二十八）：SharedArrayBuffer 与 Atomics——浏览器的共享内存与多线程"
date: 2026-06-28
categories: "你不知道的javascript"
description: "SharedArrayBuffer 让 Web Worker 之间共享同一块内存，Atomics 保证线程安全——JavaScript 终于有了真正意义上的多线程编程能力"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

JavaScript 是单线程的——这句话**不再完全正确**。Web Workers 提供了多线程能力，但 Worker 之间的通信一直靠 `postMessage`（克隆数据）：

> 传递 100MB 的数据 → 克隆 → 双倍内存。

`SharedArrayBuffer` 打破了这一限制——多个 Worker 可以**共享同一块内存**，不再需要拷贝。

---

## 一、SharedArrayBuffer 是什么？

### 1.1 基本概念

```js
// 普通 ArrayBuffer —— 不可共享
const buf = new ArrayBuffer(1024)   // 分配 1KB

// 共享 ArrayBuffer —— 可被多个线程共享
const sharedBuf = new SharedArrayBuffer(1024)
```

**区别：**

| 特性 | ArrayBuffer | SharedArrayBuffer |
|------|-------------|-------------------|
| 多线程共享 | ❌ | ✅ |
| 传输方式 | 可转移（转移后原对象失效） | 直接共享 |
| 数据拷贝 | postMessage 需要拷贝 | postMessage 传递引用 |
| 安全性 | 天生线程安全 | ❌ 需要 Atomics |

### 1.2 如何使用

```js
// main.js
const sharedBuffer = new SharedArrayBuffer(4) // 4 bytes
const sharedArray = new Int32Array(sharedBuffer)

const worker = new Worker('worker.js')
worker.postMessage(sharedBuffer) // 传递共享内存引用

// 写入数据
sharedArray[0] = 42

// worker.js
self.onmessage = (e) => {
  const sharedBuffer = e.data
  const sharedArray = new Int32Array(sharedBuffer)
  console.log(sharedArray[0]) // 42 —— 直接读取，无需拷贝
}
```

---

## 二、为什么需要 Atomics？

### 2.1 并发读写的问题

```js
// 两个 Worker 同时执行
// Worker A
sharedArray[0] += 1

// Worker B
sharedArray[0] += 1
```

**看起来是两次 +1，但实际可能只有一次！**

原因——`sharedArray[0] += 1` 在底层是三步操作：

```
1. 读取 sharedArray[0] 的值      ← 读
2. 将值加 1                      ← 计算
3. 将结果写回 sharedArray[0]    ← 写
```

当两个线程同时执行这三步时：

```
时间线：
Worker A: 读(0) → 计算(1)           → 写(1)
Worker B:           读(0) → 计算(1) → 写(1)
               ↑ 两次都读到 0，结果只加了 1！
```

这就是**竞争条件**。Atomics 提供了**原子操作**来解决这个问题。

---

## 三、Atomics API

### 3.1 原子加/减

```js
// Atomics.add 保证"读-计算-写"三步不可中断
Atomics.add(sharedArray, 0, 1) // 线程安全地 sharedArray[0] += 1
Atomics.sub(sharedArray, 0, 1) // 线程安全地 sharedArray[0] -= 1
```

### 3.2 原子比较交换

```js
// 经典 CAS（Compare And Swap）
const oldValue = Atomics.compareExchange(
  sharedArray,  // 数组
  0,            // 索引
  10,           // 期望的旧值
  20            // 要设置的新值
)
// 如果 sharedArray[0] === 10，则设为 20，返回 10
// 如果 sharedArray[0] !== 10，则不修改，返回当前值
```

### 3.3 原子加载和存储

```js
Atomics.store(sharedArray, 0, 100) // 写入
const val = Atomics.load(sharedArray, 0) // 读取
```

### 3.4 原子交换

```js
Atomics.exchange(sharedArray, 0, 50) // 设为 50 并返回旧值
```

---

## 四、线程同步：Atomics.wait 和 notify

### 4.1 等待通知模式

```js
// Worker A —— 等待任务
console.log('Worker A 等待任务...')
Atomics.wait(sharedArray, 0, 0) // 阻塞直到 sharedArray[0] !== 0
console.log('收到任务:', Atomics.load(sharedArray, 0))

// Worker B —— 发送任务
Atomics.store(sharedArray, 0, 1)
Atomics.notify(sharedArray, 0, 1) // 唤醒等待的 Worker A
```

**这是 JavaScript 中第一个真正的线程阻塞机制！**

### 4.2 注意事项

- `Atomics.wait` 只能在 **Web Worker** 中使用（主线程调用会抛异常）
- `Atomics.wait` 是**阻塞**的——在等待期间 Worker 不能做任何其他事情
- 唤醒时要确保条件确实满足，避免**虚假唤醒**

---

## 五、实战：多线程并行计算

```js
// main.js
const NUM_ELEMENTS = 1_000_000
const NUM_WORKERS = 4
const CHUNK_SIZE = Math.ceil(NUM_ELEMENTS / NUM_WORKERS)

const sharedBuffer = new SharedArrayBuffer(NUM_ELEMENTS * 4) // Int32Array
const data = new Int32Array(sharedBuffer)

// 填充数据
for (let i = 0; i < NUM_ELEMENTS; i++) {
  data[i] = Math.random() * 100
}

// 用于汇总结果的共享内存
const resultBuffer = new SharedArrayBuffer(4)
const result = new Int32Array(resultBuffer)
result[0] = 0

const workers = []
for (let i = 0; i < NUM_WORKERS; i++) {
  const worker = new Worker('sum-worker.js')
  worker.postMessage({
    buffer: sharedBuffer,
    resultBuffer: resultBuffer,
    start: i * CHUNK_SIZE,
    end: Math.min((i + 1) * CHUNK_SIZE, NUM_ELEMENTS)
  })
  workers.push(worker)
}

// 等待所有 Worker 完成
Atomics.wait(result, 0, 0) // 使用一个同步标记
```

```js
// sum-worker.js
self.onmessage = (e) => {
  const { buffer, resultBuffer, start, end } = e.data
  const data = new Int32Array(buffer)
  const result = new Int32Array(resultBuffer)

  let sum = 0
  for (let i = start; i < end; i++) {
    sum += data[i]
  }

  // 原子累加
  Atomics.add(result, 0, sum)

  // 通知主线程
  Atomics.notify(result, 0, 1)
}
```

---

## 六、安全限制

由于 Spectre 漏洞，SharedArrayBuffer 需要特定的 HTTP 头才能使用：

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

否则 `new SharedArrayBuffer()` 会抛出错误。

---

## 七、总结

| API | 用途 |
|------|------|
| `SharedArrayBuffer` | 分配线程间共享的内存 |
| `Atomics.add/sub` | 原子加减 |
| `Atomics.compareExchange` | CAS 操作 |
| `Atomics.load/store` | 安全读取/写入 |
| `Atomics.wait/notify` | 线程同步（阻塞/唤醒） |
| `Atomics.and/or/xor` | 原子位运算 |

**一句话：** SharedArrayBuffer + Atomics 让 JavaScript 拥有了真正意义上的**多线程共享内存编程**能力。虽然日常业务中很少直接使用，但它是 WebAssembly 高性能计算、图像处理、数据并行分析的关键基础设施。
