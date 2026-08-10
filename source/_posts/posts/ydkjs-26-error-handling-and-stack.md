---
title: "你不知道的JavaScript（二十六）：错误处理与堆栈追踪——Error 对象的全部秘密"
date: 2026-06-28
categories: "你不知道的javascript"
description: "从 Error 对象的底层结构、堆栈追踪的生成机制、到自定义错误类型、异步错误处理与 Source Map——深度理解 JavaScript 的错误系统"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

> "JavaScript 的错误对象不就是 `new Error('something went wrong')` 吗？"

对，但它背后有**堆栈追踪**的生成机制、**调用帧**的组织方式、**Source Map** 的映射原理，以及 `Error.cause`、`AggregateError` 等现代特性。

---

## 一、Error 对象的内部结构

### 1.1 标准属性

```js
try {
  throw new Error('出错了')
} catch (err) {
  console.log(err.name)    // "Error"
  console.log(err.message) // "出错了"
  console.log(err.stack)   // 堆栈追踪（非标准但所有引擎都实现）
}
```

### 1.2 stack 的格式

```
Error: 出错了
    at Object.<anonymous> (/app/index.js:3:9)
    at Module._compile (internal/modules/cjs/loader.js:1063:30)
    at Object.Module._extensions (internal/modules/cjs/loader.js:1092:10)
```

每一行的格式：`at 函数名 (文件路径:行号:列号)`

### 1.3 V8 的 Stack Trace API

```js
// 准备一个 Error 但不抛出
const err = new Error('debug')
console.log(err.stack)

// V8 在创建 Error 对象时立即捕获堆栈
// 因此可以在任何位置 new Error() 来获取调用栈快照
function getCurrentStack() {
  return new Error('stack trace').stack
}
```

---

## 二、V8 如何生成堆栈追踪

### 2.1 堆栈的构建时机

```js
function a() {
  const err = new Error()  // ← 此时 V8 抓取调用栈
  b(err)
}
function b(err) {
  console.log(err.stack)
}
a()
```

V8 内部维护了一个**调用帧（Frame）链表**。当 `new Error()` 被调用时，V8 遍历当前调用帧链表，将每个帧的函数名、文件名、行号、列号序列化为字符串。

### 2.2 为什么堆栈只有"创建"时的信息？

```js
function a() {
  const err = new Error()
  // a 执行完毕，从调用栈弹出
}
a()
throw err  // 虽然是在 a 之外抛出，但堆栈仍然包含 a
```

**因为堆栈在 `new Error()` 创建时就已经确定了。**

---

## 三、自定义错误类型

```js
class ValidationError extends Error {
  constructor(message, field) {
    super(message)
    this.name = 'ValidationError'
    this.field = field

    // 确保堆栈正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError)
    }
  }
}

class NetworkError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.name = 'NetworkError'
    this.statusCode = statusCode
  }
}

// 使用
try {
  throw new ValidationError('邮箱格式不正确', 'email')
} catch (err) {
  if (err instanceof ValidationError) {
    console.log(`字段 ${err.field}: ${err.message}`)
  } else if (err instanceof NetworkError) {
    console.log(`HTTP ${err.statusCode}: ${err.message}`)
  }
}
```

### Error.captureStackTrace 的作用

```js
function validate(data) {
  const err = new ValidationError('无效数据', 'name')

  // 默认堆栈会包含 validate 函数自身
  // Error.captureStackTrace(this, ValidationError)
  // 会从堆栈中去除 ValidationError 构造函数，让堆栈从调用方开始

  throw err
}
```

---

## 四、Error Cause（ES2022）

```js
// 串联错误 —— 保留原始错误信息
async function fetchData(id) {
  try {
    const res = await fetch(`/api/data/${id}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (cause) {
    throw new Error('获取数据失败', { cause })
  }
}

try {
  await fetchData(42)
} catch (err) {
  console.log(err.message) // "获取数据失败"
  console.log(err.cause)   // 原始 Error: "HTTP 404"
}
```

**在没有 `cause` 之前：** 开发者用 `err.message += '\ncaused by: ' + cause.message`，丢失了原始堆栈和类型。

---

## 五、AggregateError

```js
// 同时处理多个错误
const promises = [
  Promise.resolve('ok'),
  Promise.reject(new Error('失败1')),
  Promise.reject(new Error('失败2')),
]

try {
  await Promise.allSettled(promises)
  // 或者
  await Promise.any(promises) // 全部失败时抛出 AggregateError
} catch (err) {
  if (err instanceof AggregateError) {
    for (const e of err.errors) {
      console.error(e.message) // "失败1", "失败2"
    }
  }
}
```

**适用场景：** 批量验证、并行任务的错误汇总。

---

## 六、异步错误处理

### 6.1 回调中的堆栈断裂

```js
function a() {
  setTimeout(() => {
    b()  // 此时 a 早已执行完毕
  }, 100)
}
function b() {
  throw new Error('出错')
}
a()
// 堆栈只有 b，没有 a！因为 setTimeout 断开了调用链
```

### 6.2 async/await 恢复堆栈

```js
async function a() {
  await new Promise(r => setTimeout(r, 100))
  b()
}
function b() {
  throw new Error('出错')
}
a().catch(err => console.log(err.stack))
// 堆栈包含 a → b（async 函数恢复了调用链）
```

**为什么？** V8 在 async 函数中保留了**异步堆栈（Async Stack Trace）**——代价是额外的内存开销。

---

## 七、Source Map 与生产环境调试

```js
// 生产环境的 minified 代码：
// function a(){throw new Error("err")}
// 堆栈显示：
// Error: err at a (app.min.js:1:25)

// Source Map 映射后：
// Error: err at a (src/index.ts:15:3)
```

Source Map 的工作原理：

```
.map 文件包含：
{
  "sources": ["src/index.ts"],
  "mappings": "AAAA,SAASA,CAAC,CAAC;AACT,MAAM,IAAIC..."
}
// mappings 使用 VLQ 编码，记录生成代码位置 → 源码位置的对应关系
```

---

## 八、生产环境的错误处理实践

```js
// 全局错误捕获
window.onerror = (message, source, line, col, error) => {
  // 上报到 Sentry / 自有监控平台
  reportError({
    message,
    stack: error?.stack,
    url: source,
    line,
    col,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
  })
}

// 未捕获的 Promise 拒绝
window.onunhandledrejection = (event) => {
  reportError({
    type: 'unhandled_promise_rejection',
    reason: event.reason?.stack || String(event.reason),
  })
}
```

---

## 九、总结

| 特性 | 用途 |
|------|------|
| `err.stack` | 定位错误来源 |
| `Error.captureStackTrace` | 优化自定义错误的堆栈 |
| `{ cause }` | 错误链，保留原始错误 |
| `AggregateError` | 批量错误汇总 |
| Source Map | 生产环境调试 |
| Async Stack | async/await 中的堆栈恢复 |

**一句话：** Error 对象不只是"报错信息"，它是 V8 提供的**运行时反射**工具，让你能精确追踪代码执行路径。
