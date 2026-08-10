---
title: "你不知道的JavaScript（二十七）：定时器的真相——事件循环、嵌套延迟与精度陷阱"
date: 2026-06-28
categories: "你不知道的javascript"
description: "setTimeout/setInterval 的延迟不是精确的——事件循环的排队机制、嵌套超时的最小间隔、浏览器节流策略与 requestAnimationFrame 的区别"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

`setTimeout(fn, 1000)` 真的会在 1000ms 后执行吗？

> **不会。** 它只是告诉引擎"至少在 1000ms 后把回调加入任务队列"，而不是"1000ms 后精确执行"。

这个区别，是 JavaScript 单线程事件循环的**核心约束**的体现。

---

## 一、setTimeout 的底层机制

### 1.1 最小延迟与事件循环

```js
console.log('开始')

setTimeout(() => {
  console.log('定时器回调')
}, 0)

console.log('结束')

// 输出顺序：开始 → 结束 → 定时器回调
```

**即使是 0ms，回调也会在同步代码执行完成后才执行。**

事件循环处理 `setTimeout` 的流程：

```
1. 调用 setTimeout(fn, delay)
2. 浏览器启动一个计时器（由浏览器内部的定时器线程管理，非 JS 主线程）
3. 计时器到期，将回调放入事件循环的"宏任务队列"
4. 主线程空闲时 → 从队列取出回调 → 执行
```

**关键：** `delay` 是从调用 `setTimeout` 到**回调被加入队列**的最小时间，不是到**回调被执行**的时间。

### 1.2 实际延迟 = max(0, delay - 已执行同步代码耗时)

```js
const start = Date.now()

setTimeout(() => {
  console.log('实际延迟:', Date.now() - start, 'ms')
}, 500)

// 模拟耗时操作
const block = Date.now()
while (Date.now() - block < 1000) {
  // 阻塞主线程 1000ms
}

// 输出：实际延迟: ~1000ms（不是 500ms！）
```

---

## 二、嵌套超时与最小间隔

### 2.1 浏览器对嵌套定时器的限制

HTML 规范规定：**当 setTimeout 嵌套超过 5 层时，最小间隔被强制设为 4ms**。

```js
let count = 0
const start = Date.now()

function nestedTimeout() {
  count++
  const elapsed = Date.now() - start
  console.log(`第 ${count} 次：${elapsed}ms`)

  if (count < 10) {
    setTimeout(nestedTimeout, 0) // 第 6 次开始，实际间隔变成至少 4ms
  }
}

setTimeout(nestedTimeout, 0)
```

**为什么？** 为了防止 `setTimeout(fn, 0)` 的密集调用过度消耗 CPU。

### 2.2 标签页未激活时的节流

```js
// 当标签页隐藏时，浏览器的定时器行为
// 1. setTimeout 的最小间隔被提升到 1000ms
// 2. setInterval 每分钟最多触发一次
// 3. requestAnimationFrame 完全暂停

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('标签页隐藏，定时器被节流')
  }
})
```

这对**后台运行的轮询任务**非常关键——你可能需要在可见性变化时切换策略。

---

## 三、setInterval 的陷阱

### 3.1 累积效应

```js
setInterval(() => {
  // 这个回调执行了 2 秒
  const start = Date.now()
  while (Date.now() - start < 2000) { }
}, 1000)
```

**问题：** 回调本身的执行时间超过了间隔时间。setInterval 的实现有两种行为：

-   等待上一个回调结束后才开始计时下一个
-   **不等待**，到时间就把下一个回调加入队列

浏览器使用第二种策略：**如果前一个回调尚未执行完，setInterval 会跳过中间的执行**，不会堆积。

### 3.2 递归 setTimeout 替代 setInterval

```js
// ❌ setInterval —— 无法保证间隔
setInterval(() => {
  // 如果执行时间 > 间隔，性能会持续恶化
  heavyTask()
}, 1000)

// ✅ 递归 setTimeout —— 每次从上一次执行结束后开始计时
function schedule() {
  heavyTask()
  setTimeout(schedule, 1000) // 真正的"间隔 1 秒"
}

schedule()
```

**递归 setTimeout 的优势：** 保证间隔是从上一次执行完成到下一次开始的时间。

---

## 四、requestAnimationFrame

### 4.1 与 setTimeout 的区别

```js
// setTimeout：固定延迟，与帧率无关
setTimeout(() => {
  updatePosition()
}, 16) // 约 60fps

// requestAnimationFrame：与显示刷新率同步
function animate() {
  updatePosition()
  requestAnimationFrame(animate) // 在下一次重绘前执行
}
animate()
```

| 特性 | setTimeout(fn, 16) | requestAnimationFrame |
|------|-------------------|----------------------|
| 触发时机 | 固定延迟 | 下一次重绘前 |
| 帧率匹配 | ❌ 可能掉帧或过度绘制 | ✅ 与显示器同步 |
| 后台暂停 | ❌ 仍然运行 | ✅ 自动暂停 |
| 节流 | 受 4ms 限制 | 不受限 |
| 时间戳 | ❌ 需要自己计算 | ✅ 自动传入高精度时间戳 |

### 4.2 实际应用：精确帧动画

```js
function smoothAnimation(duration = 2000) {
  const start = performance.now()

  function frame(now) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)

    // 根据进度更新样式
    element.style.transform = `translateX(${progress * 400}px)`

    if (progress < 1) {
      requestAnimationFrame(frame)
    }
  }

  requestAnimationFrame(frame)
}
```

---

## 五、定时器精度

### 5.1 不同浏览器的精度差异

| 浏览器 | setTimeout 最小精度 | 备注 |
|--------|-------------------|------|
| Chrome | ~1ms | 但嵌套超时 ≥4ms |
| Firefox | ~1ms | 同上 |
| Safari | ~1ms | 同上 |
| 移动端 | 通常 ≤4ms | 低功耗优化 |

### 5.2 高精度定时：performance.now()

```js
// Date.now() 精度受限（某些浏览器为 1ms）
// performance.now() 返回 DOMHighResTimeStamp，精度为微秒级

const start = performance.now()
setTimeout(() => {
  const exact = performance.now() - start
  console.log(`精确延迟: ${exact.toFixed(3)}ms`) // 如 1000.125ms
}, 1000)
```

---

## 六、queueMicrotask 与定时器的关系

```js
console.log(1)

setTimeout(() => console.log(2), 0) // 宏任务
queueMicrotask(() => console.log(3)) // 微任务

Promise.resolve().then(() => console.log(4)) // 微任务

console.log(5)

// 输出：1, 5, 3, 4, 2
```

**执行顺序：** 同步代码 → 微任务（Promise.then / queueMicrotask）→ 宏任务（setTimeout）

---

## 七、总结

```
setTimeout(fn, N) 的真相：

"至少 N 毫秒后将回调加入宏任务队列，
实际执行时间 ≥ N + 当前同步代码耗时 + 队列中前面的任务耗时"
```

| 工具 | 适用场景 |
|------|---------|
| `setTimeout(fn, 0)` | 推迟执行到下一次事件循环 |
| `setTimeout(fn, N)` | 通用延迟执行 |
| `setInterval` | 定期执行（注意累积问题） |
| `requestAnimationFrame` | 动画、与渲染同步 |
| `queueMicrotask` | 尽快在当前任务结束后执行 |

**核心建议：** 不要依赖定时器的精确时间——它只是"至少 N 毫秒后"，不是"精确 N 毫秒后"。
