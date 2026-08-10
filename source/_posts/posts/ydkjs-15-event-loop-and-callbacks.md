---
title: "你不知道的JavaScript（十五）：事件循环与回调——JavaScript 异步编程基础"
date: 2026-06-26
categories: "你不知道的javascript"
description: "深入 JavaScript 的事件循环机制：调用栈、任务队列、微任务、宏任务，以及回调函数在异步编程中的角色与问题"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

JavaScript 是**单线程**语言——它只有一个调用栈（Call Stack），一次只能做一件事。

但它能处理并发——不是通过多线程，而是通过**事件循环（Event Loop）**。

```javascript
console.log('1')
setTimeout(() => console.log('2'), 0)
console.log('3')
// 输出：1 3 2
```

为什么 `setTimeout(fn, 0)` 不会立即执行？理解事件循环就能回答。

---

## 一、调用栈（Call Stack）

### 1.1 什么是调用栈

JavaScript 引擎用调用栈来跟踪函数调用的位置。每次调用函数，就在栈顶压入一个帧（frame）；函数返回，弹出该帧：

```javascript
function multiply(a, b) {
  return a * b
}

function square(n) {
  return multiply(n, n)
}

function main() {
  const result = square(5)
  console.log(result)
}

main()
```

调用栈过程：

```
1. main()
   [main]

2. main() → square(5)
   [main, square]

3. main() → square(5) → multiply(5, 5)
   [main, square, multiply]

4. multiply 返回 25，弹出
   [main, square]

5. square 返回 25，弹出
   [main]

6. main 调用 console.log(25)
   [main, console.log]

7. console.log 返回，弹出
   [main]

8. main 返回，栈为空
   []
```

### 1.2 栈溢出（Stack Overflow）

```javascript
function foo() {
  foo()  // 无限递归
}
foo() // ❌ RangeError: Maximum call stack size exceeded
```

---

## 二、事件循环的核心原理

### 2.1 架构

```
调用栈（Call Stack）    ←   任务队列（Task Queue / Callback Queue）
   ↑                           ↑
   └── 同步代码执行             └── 异步回调等待

微任务队列（Microtask Queue）
   ↑
   └── Promise.then / MutationObserver
```

**事件循环的每一轮（Tick）：**

```
1. 执行调用栈中的所有同步代码（直到栈为空）
2. 清空微任务队列（Promise then/catch/finally，queueMicrotask）
3. 取一个宏任务（setTimeout、setInterval、I/O）执行
4. 回到步骤 2
5. 渲染 UI（如果需要）
```

### 2.2 用代码理解

```javascript
console.log('1: 同步')

setTimeout(() => {
  console.log('2: 宏任务 setTimeout')
}, 0)

Promise.resolve().then(() => {
  console.log('3: 微任务 Promise.then')
})

Promise.resolve().then(() => {
  console.log('4: 另一个微任务')
})

queueMicrotask(() => {
  console.log('5: 微任务 queueMicrotask')
})

console.log('6: 同步结束')
```

**输出**：

```
1: 同步
6: 同步结束
3: 微任务 Promise.then
4: 另一个微任务
5: 微任务 queueMicrotask
2: 宏任务 setTimeout
```

**步骤分解**：

```
Tick 1:
  1. 执行所有同步代码 → 输出 1, 6
  2. 调用栈清空
  3. 清空微任务队列 → 输出 3, 4, 5
  4. 取一个宏任务（setTimeout 回调）
  5. 调用栈又开始执行 → 输出 2

Tick 2:
  6. 调用栈清空
  7. 微任务队列为空
  8. 继续取下一个宏任务...
```

---

## 三、宏任务（MacroTask）与微任务（MicroTask）

### 3.1 分类

| 类型 | 宏任务 | 微任务 |
|------|--------|--------|
| **来源** | setTimeout, setInterval, setImmediate, I/O, UI 渲染, requestAnimationFrame | Promise.then/catch/finally, queueMicrotask, MutationObserver, process.nextTick(Node) |
| **优先级** | 低（每轮循环取一个） | 高（每轮循环清空全部） |
| **调用栈清理后** | 每次取一个执行 | 一次性清空全部 |

### 3.2 宏任务队列示例

```javascript
console.log('1')

setTimeout(() => console.log('2'), 0)
setTimeout(() => console.log('3'), 0)
setTimeout(() => console.log('4'), 0)

console.log('5')

// 输出：1 5 2 3 4
// 说明：三个 setTimeout 回调按顺序排队，每轮事件循环取一个
```

### 3.3 微任务递归的风险

```javascript
function loop() {
  Promise.resolve().then(loop)  // 不停的微任务
}
loop()

setTimeout(() => console.log('宏任务永不到达'), 1000)
// 宏任务永远不会执行！因为微任务队列永远不会空
```

---

## 四、setTimeout(fn, 0) 不"立即"执行

```javascript
setTimeout(() => console.log('hello'), 0)

// 这段代码执行时间很长
for (let i = 0; i < 100000; i++) {
  // 什么都不做，只是消耗时间
}

// 结论：即使 delay=0，回调也至少等待当前同步代码执行完毕
// 实际延迟 = max(0, 指定时间 - 当前时间 + 同步代码执行时间)
```

### 4.1 setTimeout 的第二个参数是"最小延迟"

```javascript
// 嵌套超时的最小延迟
setTimeout(() => {  // 第1层：4ms
  setTimeout(() => { // 第2层：4ms
    setTimeout(() => { // 第3层起：至少 4ms
      // ...
    }, 0)
  }, 0)
}, 0)
```

**HTML 规范规定**：嵌套层级超过 5 层的 `setTimeout`，最小延迟为 4ms。

---

## 五、回调函数的问题

### 5.1 回调地狱（Callback Hell）

```javascript
getUser(id, (err, user) => {
  if (err) return handleError(err)

  getOrders(user.id, (err, orders) => {
    if (err) return handleError(err)

    getOrderDetails(orders[0].id, (err, details) => {
      if (err) return handleError(err)

      renderOrder(details)
    })
  })
})
```

问题：
1. **嵌套过深**——难以阅读和维护
2. **错误处理重复**——每个回调都要检查 err
3. **控制流不直观**——不能简单用 try-catch
4. **信任问题**——回调可能被多次调用，或者永远不调用

### 5.2 回调的"控制反转"

当你把回调传给第三方函数时，失去了对代码执行的控制：

```javascript
function process(data, callback) {
  // 第三方代码可能：
  // - 多次调用 callback
  // - 异步调用 callback
  // - 不调用 callback
  // - 吞掉异常
  // - 改变 this 指向
}
```

### 5.3 解决回调问题的方案演进

```javascript
// 1. 回调 → 命名函数
function handleOrder(err, details) {
  if (err) return handleError(err)
  renderOrder(details)
}

function handleOrders(err, orders) {
  if (err) return handleError(err)
  getOrderDetails(orders[0].id, handleOrder)
}

function handleUser(err, user) {
  if (err) return handleError(err)
  getOrders(user.id, handleOrders)
}

getUser(id, handleUser)

// 2. Promise（下一篇详细讲）
getUser(id)
  .then(user => getOrders(user.id))
  .then(orders => getOrderDetails(orders[0].id))
  .then(details => renderOrder(details))
  .catch(handleError)

// 3. async/await
async function renderUserOrders(id) {
  try {
    const user = await getUser(id)
    const orders = await getOrders(user.id)
    const details = await getOrderDetails(orders[0].id)
    renderOrder(details)
  } catch (e) {
    handleError(e)
  }
}
```

---

## 六、面试题

```javascript
// 题目1：输出顺序？
console.log('a')

setTimeout(() => console.log('b'), 0)

new Promise((resolve) => {
  console.log('c')
  resolve()
}).then(() => console.log('d'))

console.log('e')

// 答案：a c e d b
// Promise 构造函数中的代码是同步的！
// then/catch 才是微任务
```

```javascript
// 题目2：输出顺序？
async function foo() {
  console.log('1')
  await bar()
  console.log('2')
}

async function bar() {
  console.log('3')
}

console.log('4')
foo()
console.log('5')

// 答案：4 1 3 5 2
// 解析：
// 4: 同步
// 1: foo() 内同步代码
// 3: bar() 内同步代码
// 5: foo 遇到 await，交出控制权
// 2: await 后的代码作为微任务执行
```

```javascript
// 题目3：输出顺序？
Promise.resolve().then(() => {
  console.log('then1')
  Promise.resolve().then(() => {
    console.log('then2')
  })
}).then(() => {
  console.log('then3')
})

// 答案：then1 then2 then3
// 解析：
// then1 执行后注册 then2 微任务
// then1 返回 undefined → then1 的链式 then(then3) 加入微任务队列
// 清空微任务队列：then2 先入先出，then3
```

---

## 七、requestAnimationFrame vs setTimeout

```javascript
// requestAnimationFrame 不是宏任务也不是微任务
// 它在浏览器渲染之前执行（在宏任务和微任务之后，渲染之前）

// 对比
setTimeout(() => {
  // 宏任务，在渲染之后执行
}, 1000 / 60)

requestAnimationFrame(() => {
  // 在渲染之前执行（最适合动画）
  // 保证在下一帧绘制前更新 DOM
})
```

---

## 总结

1. **JavaScript 是单线程**，通过**事件循环**实现并发
2. **同步代码**在调用栈中执行，**异步回调**在任务队列中等待
3. **事件循环顺序**：同步代码 → 清空微任务 → 取一个宏任务 → 清空微任务 → 渲染
4. **宏任务**：setTimeout、setInterval、I/O
5. **微任务**：Promise.then/catch/finally、queueMicrotask
6. **回调的问题**：嵌套地狱、控制反转、信任问题
7. **解决方案演进**：命名函数 → Promise → async/await

> 下一篇将深入 **Promise 的实现原理**，理解这个解决回调问题的核心机制。
