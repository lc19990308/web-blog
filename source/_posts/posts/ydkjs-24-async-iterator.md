---
title: "你不知道的JavaScript（二十四）：异步迭代器与流式数据处理"
date: 2026-06-27
categories: "你不知道的javascript"
description: "同步迭代器无法处理异步数据源——AsyncIterator 和 for-await-of 让 JavaScript 可以用迭代的方式消费流式数据、事件和分页 API"
tags: ["你不知道的javascript", "JavaScript", "ES6"]
copyright: true
---

## 前言

同步迭代器只能消费"已就绪"的数据。但在现实世界中，很多数据源是**异步的**：

-   从网络分块到达的文件
-   数据库游标逐条返回的记录
-   用户连续点击产生的事件
-   WebSocket 推送的消息

异步迭代器（AsyncIterator）正是为此而生。

---

## 一、什么是异步迭代器？

### 1.1 定义

与同步迭代器的关键区别：

| 特性 | Iterator | AsyncIterator |
|------|----------|---------------|
| `next()` 返回值 | `{ value, done }` | `Promise<{ value, done }>` |
| 消费方式 | `for...of` | `for await...of` |
| 生成器 | `function*` | `async function*` |

```js
const asyncIterable = {
  [Symbol.asyncIterator]() {
    let count = 0
    return {
      next() {
        if (count < 3) {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({ value: count++, done: false })
            }, 1000)
          })
        }
        return Promise.resolve({ value: undefined, done: true })
      }
    }
  }
}

// 消费
for await (const value of asyncIterable) {
  console.log(value) // 每隔 1 秒输出: 0, 1, 2
}
```

---

## 二、异步生成器

### 2.1 基本用法

```js
async function* asyncGenerator() {
  let i = 0
  while (i < 3) {
    // await 可以配合异步操作
    const result = await new Promise(resolve =>
      setTimeout(() => resolve(i++), 1000)
    )
    yield result
  }
}

for await (const value of asyncGenerator()) {
  console.log(value) // 每隔 1 秒输出: 0, 1, 2
}
```

### 2.2 核心区别

```js
function* syncGen() {
  yield 1
  yield Promise.resolve(2) // ❌ yield 了 Promise 对象，不是值
}

async function* asyncGen() {
  yield 1
  yield await Promise.resolve(2) // ✅ await 解包后 yield 值
}
```

---

## 三、实战场景

### 3.1 分页 API

```js
async function* paginate(url, pageSize = 100) {
  let page = 1
  let hasMore = true

  while (hasMore) {
    const response = await fetch(`${url}?page=${page}&size=${pageSize}`)
    const data = await response.json()

    yield* data.items  // 逐条产出

    hasMore = data.hasMore
    page++
  }
}

// 消费时完全不需要关心分页逻辑
for await (const item of paginate('/api/users')) {
  console.log(item.name)
  // 按需处理，每条记录逐一到达
}
```

### 3.2 流式读取文件（Node.js）

```js
import { createReadStream } from 'fs'
import { createInterface } from 'readline'

async function* readLines(filePath) {
  const stream = createReadStream(filePath)
  const rl = createInterface({ input: stream })

  for await (const line of rl) {
    yield line
  }
}

// 处理大文件时，逐行读取不会占用大量内存
for await (const line of readLines('large-file.log')) {
  processLine(line)
}
```

### 3.3 事件流

```js
function fromEvent(element, eventName) {
  let resolveNext
  const buffer = []

  element.addEventListener(eventName, (e) => {
    if (resolveNext) {
      resolveNext(e)
      resolveNext = null
    } else {
      buffer.push(e)
    }
  })

  return {
    [Symbol.asyncIterator]() {
      return {
        next() {
          if (buffer.length > 0) {
            return Promise.resolve({ value: buffer.shift(), done: false })
          }
          return new Promise(resolve => {
            resolveNext = (value) => resolve({ value, done: false })
          })
        }
      }
    }
  }
}

for await (const click of fromEvent(document, 'click')) {
  console.log('点击坐标:', click.clientX, click.clientY)
}
```

---

## 四、异步迭代器的方法

ES2025 给 AsyncIterator 也增加了辅助方法：

```js
async function* numbers() {
  let i = 0
  while (true) {
    await new Promise(r => setTimeout(r, 100))
    yield i++
  }
}

for await (const n of numbers()
  .map(x => x * 2)
  .filter(x => x % 3 === 0)
  .take(5)
) {
  console.log(n) // 每 100ms 输出: 0, 6, 12, 18, 24
}
```

---

## 五、异步迭代器的错误处理

```js
async function* unreliableSource() {
  yield 1
  throw new Error('出错了！')
  yield 2 // 永远不会执行
}

try {
  for await (const value of unreliableSource()) {
    console.log(value)
  }
} catch (err) {
  console.error('捕获到错误:', err.message)
}
```

```js
// 也可以让迭代器自己处理错误
async function* safeSource() {
  try {
    yield await fetchData()
  } catch (err) {
    yield { error: err.message } // 将错误作为值产出
  }
}
```

---

## 六、性能对比

| 场景 | 传统方式 | 异步迭代器 |
|------|---------|-----------|
| 逐行读大文件 | 一次性加载（内存爆炸） | 流式逐行（低内存） |
| 翻页 API | 全部获取后才能处理 | 取到一条处理一条 |
| 无限事件流 | 需要手动管理 | 声明式消费 |
| 中断 | 需要额外逻辑 | break 立即停止 |

---

## 七、总结

```
同步       →  for...of    →  Iterator    →  function*
异步       →  for await   →  AsyncIterator →  async function*
                              ...of
```

异步迭代器统一了 JavaScript 中处理**时序数据**的方式，让流式数据的消费和同步数据一样自然。

**一句话：** 如果数据不是一次性到齐的，就用 `for await...of`。
