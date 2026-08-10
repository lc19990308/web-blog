---
title: "你不知道的JavaScript（十七）：Generator + Promise——async/await 的底层实现"
date: 2026-06-26
categories: "你不知道的javascript"
description: "深入 Generator 的迭代器机制、两路通信原理，以及它如何与 Promise 结合实现异步流程控制——这正是 async/await 的底层实现"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

```javascript
async function foo() {
  const user = await fetchUser()
  const orders = await fetchOrders(user.id)
  return orders
}
```

这段代码看起来像"魔法"——异步代码像同步一样写。但实际上它不是什么魔法，它只是 **Generator + Promise** 的语法糖。

理解 Generator 是深入理解 async/await 的必经之路。

---

## 一、Generator 基础

### 1.1 什么是 Generator？

Generator 是**可以暂停和恢复执行的函数**。函数执行到 `yield` 时暂停，下次调用 `next()` 时从暂停处恢复：

```javascript
function* generatorFn() {
  console.log('开始')
  yield 1
  console.log('恢复')
  yield 2
  console.log('结束')
  return 3
}

const gen = generatorFn()

console.log(gen.next()) // 开始 → { value: 1, done: false }
console.log(gen.next()) // 恢复 → { value: 2, done: false }
console.log(gen.next()) // 结束 → { value: 3, done: true }
console.log(gen.next()) // { value: undefined, done: true }
```

### 1.2 Generator 的两路通信

Generator 不是单向产出值——它可以**接收外部传入的值**：

```javascript
function* twoWay() {
  const a = yield '第一步的产出'
  console.log('收到外部消息:', a)

  const b = yield '第二步的产出'
  console.log('收到另一个消息:', b)

  return '完成'
}

const gen = twoWay()

// 第一次调用 next() 不能传参（没有 yield 在等待）
const result1 = gen.next()
console.log(result1.value) // '第一步的产出'

// 第二次调用 next() 传入的值赋给第一个 yield 左侧的 a
const result2 = gen.next('来自外部')
console.log(result2.value) // '第二步的产出'

// 第三次
const result3 = gen.next('另一个消息')
console.log(result3.value) // '完成'
```

**这有什么用？** —— 这正是让 Generator 处理异步的关键。

---

## 二、用 Generator 处理异步

### 2.1 基本想法

如果把 `yield` 与 Promise 结合——每次 `yield` 一个 Promise，Generator 暂停，等待 Promise 完成后把结果传回去：

```javascript
function* gen() {
  const user = yield fetch('/api/user')
  const orders = yield fetch(`/api/orders/${user.id}`)
  return orders
}

// 然后需要一个"驱动函数"来运行这个 Generator
function run(generatorFunc) {
  const gen = generatorFunc()

  function handle(result) {
    if (result.done) return Promise.resolve(result.value)

    // result.value 是一个 Promise
    return Promise.resolve(result.value).then(
      value => handle(gen.next(value)),  // 把 resolve 的值传回 Generator
      err => handle(gen.throw(err)),     // 把 reject 错误抛进 Generator
    )
  }

  return handle(gen.next())
}

// 使用
run(function* () {
  try {
    const user = yield fetch('/api/user')
    const orders = yield fetch(`/api/orders/${user.id}`)
    console.log('订单:', orders)
  } catch (e) {
    console.error('出错了:', e)
  }
})
```

### 2.2 co 库

TJ Holowaychuk 的 **co** 库做的就是上述工作。它让 Generator 能"自动"执行 Promise：

```javascript
const co = require('co')

co(function* () {
  const result = yield Promise.resolve(42)
  console.log(result) // 42

  const data = yield fetch('/api/data').then(r => r.json())
  console.log(data)

  // yield 数组 → Promise.all
  const [a, b] = yield [
    Promise.resolve(1),
    Promise.resolve(2),
  ]
  console.log(a, b) // 1 2
})
```

---

## 三、async/await 的底层实现

### 3.1 语法糖的本质

`async/await` 做的事情与 `co` + Generator 一模一样：

```javascript
// 你写的 async/await
async function fetchData() {
  const user = await fetch('/api/user')
  const orders = await fetch(`/api/orders/${user.id}`)
  return orders
}

// 引擎将它转换为类似下面的 Generator + 自动执行器
function fetchData() {
  return run(function* () {
    const user = yield fetch('/api/user')
    const orders = yield fetch(`/api/orders/${user.id}`)
    return orders
  })
}
```

唯一的区别是：
- Generator 需要外部驱动函数（co、run）来执行
- async 函数由**引擎内置的执行器**驱动，无需外部库

### 3.2 手写 async/await

下面的代码模拟了 async/await 的核心机制：

```javascript
function async(generatorFunc) {
  return function(...args) {
    const gen = generatorFunc(...args)

    return new Promise((resolve, reject) => {
      function step(key, arg) {
        let result
        try {
          result = gen[key](arg)
        } catch (e) {
          reject(e)
          return
        }

        const { value, done } = result

        if (done) {
          resolve(value)
        } else {
          // 关键一步：等待 Promise 完成，把结果传回 Generator
          Promise.resolve(value).then(
            v => step('next', v),
            e => step('throw', e),
          )
        }
      }

      step('next')
    })
  }
}

// 使用
const fetchData = async(function* (id) {
  const user = yield fetch(`/api/user/${id}`)
  const profile = yield fetch(`/api/profile/${user.profileId}`)
  return { user, profile }
})

fetchData(123).then(data => console.log(data))
```

---

## 四、async/await 的关键特性

### 4.1 await 的表达式

```javascript
async function demo() {
  // await 一个普通值
  const a = await 42
  console.log(a) // 42

  // await 一个 Promise
  const b = await Promise.resolve('hello')
  console.log(b) // 'hello'

  // await 一个 thenable
  const c = await { then: r => r('thenable') }
  console.log(c) // 'thenable'

  // await 一个异步函数调用
  const d = await anotherAsyncFn()
}
```

### 4.2 错误处理

```javascript
// 方式1：try-catch（推荐）
async function safe() {
  try {
    const data = await fetch('/api/data')
    return await data.json()
  } catch (e) {
    console.error('请求失败:', e.message)
    return { error: true }
  }
}

// 方式2：catch 链
async function alt() {
  const data = await fetch('/api/data').catch(e => {
    console.error(e)
    return { error: true }
  })
  return data
}

// 方式3：全局兜底
async function throws() {
  throw new Error('出错了')
}
throws().catch(e => console.log(e.message))
```

### 4.3 并发 vs 串行

```javascript
async function bad() {
  // ❌ 串行：两个请求依次执行
  const a = await fetch('/api/a')
  const b = await fetch('/api/b') // 等 a 完成后才发起
  return { a, b }
}

async function good() {
  // ✅ 并发：同时发起两个请求
  const [a, b] = await Promise.all([
    fetch('/api/a'),
    fetch('/api/b'),
  ])
  return { a, b }
}

// 有依赖关系时必须串行
async function sequential() {
  const user = await fetch('/api/user')
  const orders = await fetch(`/api/orders/${user.id}`) // 依赖 user
  return orders
}
```

### 4.4 await 在非异步函数中

```javascript
// ❌ 不能在非 async 函数中用 await
function regular() {
  await Promise.resolve() // SyntaxError
}

// ✅ 箭头函数
const arrow = async () => {
  return await fetch('/api/data')
}

// ✅ 对象方法
const obj = {
  async method() {
    return await fetch('/api/data')
  },
}

// ✅ 类的静态/实例方法
class Service {
  async getData() {
    return await fetch('/api/data')
  }
}
```

---

## 五、async/await 的陷阱

### 5.1 forEach 中的 await

```javascript
async function process(items) {
  // ❌ forEach 中的 await 不会等待
  items.forEach(async (item) => {
    await processItem(item) // 并行执行，不会等待前一个完成
  })

  console.log('这行会在所有 processItem 完成前执行')
}

// ✅ 使用 for...of
async function processFixed(items) {
  for (const item of items) {
    await processItem(item) // 等待每个完成
  }
}

// ✅ 或者并行执行
async function processParallel(items) {
  await Promise.all(items.map(item => processItem(item)))
}
```

### 5.2 错误的串行

```javascript
async function badLoop() {
  const results = [1, 2, 3].map(async (x) => {
    const data = await fetch(`/api/${x}`)
    return data
  })
  // results 是 Promise 数组，不是数据数组
  console.log(results) // [Promise, Promise, Promise]

  // 需要 await Promise.all
  const data = await Promise.all(results)
  console.log(data)
}
```

### 5.3 忘记 await

```javascript
async function getData() {
  return fetch('/api/data') // ⚠️ 返回的 Promise，不是数据
}

async function main() {
  const data = getData() // ❌ 忘记 await → data 是 Promise
  console.log(data) // Promise {<pending>}

  const correct = await getData()
  console.log(correct) // ✅ 实际数据
}
```

---

## 六、Generator 的其他用途

### 6.1 自定义迭代器

```javascript
// 生成一个范围迭代器
function* range(start, end, step = 1) {
  for (let i = start; i <= end; i += step) {
    yield i
  }
}

for (const n of range(1, 10, 2)) {
  console.log(n) // 1, 3, 5, 7, 9
}

console.log([...range(1, 5)]) // [1, 2, 3, 4, 5]
```

### 6.2 无限序列

```javascript
function* fibonacci() {
  let a = 0, b = 1
  while (true) {
    yield a
    ;[a, b] = [b, a + b]
  }
}

const fib = fibonacci()
console.log(fib.next().value) // 0
console.log(fib.next().value) // 1
console.log(fib.next().value) // 1
console.log(fib.next().value) // 2
console.log(fib.next().value) // 3
// 可以无限取下去
```

### 6.3 异步 Generator

```javascript
async function* streamData(urls) {
  for (const url of urls) {
    const response = await fetch(url)
    const data = await response.json()
    yield data // 异步产出
  }
}

// 使用 for await...of 消费
for await (const data of streamData(['/api/1', '/api/2', '/api/3'])) {
  console.log('流式数据:', data)
}
```

---

## 七、面试题

```javascript
// 题目 1：输出顺序？
async function foo() {
  console.log('1')
  await null
  console.log('2')
}

console.log('3')
foo()
console.log('4')
// 答案：3 1 4 2
// await 后面的代码作为微任务执行

// 题目 2：输出顺序？
async function bar() {
  return 42
}

bar().then(v => console.log(v))
console.log('sync')
// 答案：sync 42
// async 函数返回的 Promise 的 then 也是微任务

// 题目 3：猜输出
async function baz() {
  const a = await 1
  const b = await Promise.resolve(2)
  return a + b
}

baz().then(v => console.log(v))
// 答案：3
```

---

## 总结

1. **Generator 可暂停/恢复**，用 `yield` 产出值，`next()` 传回值
2. **Generator + Promise** 实现异步流程控制——co 库就是干这个的
3. **async/await = Generator + 内置执行器**——语法糖，但消除了显式驱动
4. **await 后面可以是任何值**，但 Promise 会等待决议
5. **不要用 await 配 forEach** ——用 `for...of` 或 `Promise.all`
6. **Generator 还可用于**迭代器、无限序列、异步流式处理

> 下一篇将深入 JavaScript 的**语法与语句**——分号规则、ASI、表达式与语句的区别。
