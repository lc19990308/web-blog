---
title: "你不知道的JavaScript（二十一）：模块系统深度解析——从 CommonJS 到 ESM 的实现原理"
date: 2026-06-27
categories: "你不知道的javascript"
description: "深度剖析 JavaScript 模块系统的底层实现——CommonJS 的运行时加载、ESM 的静态解析、循环依赖处理、Tree Shaking 原理与模块联邦"
tags: ["你不知道的javascript", "JavaScript", "工程化"]
copyright: true
---

## 前言

模块是 JavaScript 代码组织的基本单位。但大多数人只用过 `import` / `require`，很少思考：

> `require` 和 `import` 到底有什么区别？为什么 ESM 能做 Tree Shaking 而 CommonJS 不能？循环依赖为什么有时报错有时不报？

本文深入模块系统的**底层实现**，你会看到模块解析器是如何工作的。

---

## 一、CommonJS 的运行时加载

### 1.1 require 的本质

```js
// CommonJS 的 require 其实是一个函数
const Module = require('module')

// 简化的 require 实现
function myRequire(filename) {
  // 1. 检查缓存
  if (myRequire.cache[filename]) {
    return myRequire.cache[filename].exports
  }

  // 2. 创建模块实例
  const module = new Module(filename)
  myRequire.cache[filename] = module

  // 3. 读取文件内容并包装
  const wrapper = Module.wrap(
    fs.readFileSync(filename, 'utf-8')
  )
  // wrapper 将代码包装为：
  // (function(exports, require, module, __filename, __dirname) {
  //   // 你的代码
  // })

  // 4. 执行
  const compiledWrapper = vm.runInThisContext(wrapper)
  compiledWrapper.call(
    module.exports,
    module.exports,
    myRequire,
    module,
    filename,
    path.dirname(filename)
  )

  // 5. 返回 exports
  return module.exports
}
```

**关键理解：** CommonJS 是在**运行时同步执行**整个模块代码，然后将 `exports` 对象缓存起来。

### 1.2 循环依赖的"截断"机制

```js
// a.js
exports.done = false
const b = require('./b.js')  // 👉 执行 b.js
console.log('a.js: b.done =', b.done) // false
exports.done = true

// b.js
exports.done = false
const a = require('./a.js')  // a.js 只执行了上半部分！
console.log('b.js: a.done =', a.done) // undefined！
exports.done = true
```

**为什么？** 因为 `a.js` 在执行到 `require('./b.js')` 时暂停，`b.js` 反过来 `require('./a.js')` 时发现 `a.js` 已在缓存中但**只执行了部分**，所以拿到的是不完整的 `exports`。

---

## 二、ES Modules 的静态解析

### 2.1 解析阶段 vs 执行阶段

ESM 将模块处理分为两个阶段：

```
┌──────────────────┐
│  1. 解析（Parse）│ ← 读取 import/export 声明，构建模块依赖图
├──────────────────┤
│  2. 执行（Execute）│ ← 按顺序运行模块代码
└──────────────────┘
```

```js
// 解析阶段 —— 不执行代码，只寻找 import/export 声明
import { readFile } from 'fs'  // 在代码执行前就已确定

// 执行阶段 —— 实际运行
const data = readFileSync('./data.json')
```

### 2.2 Live Binding（动态绑定）

```js
// counter.js
export let count = 0
export function increment() {
  count++  // 修改变量
}

// main.js
import { count, increment } from './counter.js'
console.log(count) // 0
increment()
console.log(count) // 1 ← 不是拷贝，是活的绑定！
```

**与 CommonJS 的区别：**

```js
// CommonJS —— 导出的是值的拷贝
// counter.js
let count = 0
module.exports = { count, increment: () => count++ }

// main.js
const { count, increment } = require('./counter.js')
console.log(count) // 0
increment()
console.log(count) // 0 ← 仍然是 0！因为 count 是拷贝
```

### 2.3 为什么 ESM 可以做 Tree Shaking？

因为解析阶段就确定了所有 `import` / `export`，打包器可以**静态分析**哪些导出被使用了：

```js
// utils.js
export function used() { /* ... */ }
export function unused() { /* ... */ } // ❌ 可被 Tree Shaking 移除

// main.js
import { used } from './utils.js'
```

CommonJS 下不行——因为 `require` 是函数调用，可能在条件语句中：

```js
const utils = require('./utils.js')
if (someCondition) {
  utils.someFn()  // 编译时无法确定调用了哪些方法
}
```

---

## 三、ESM 的循环依赖处理

```js
// a.mjs
import { bar } from './b.mjs'
export function foo() {
  console.log('foo called')
  bar()
}
foo()

// b.mjs
import { foo } from './a.mjs'
export function bar() {
  console.log('bar called')
}
// 这里没有调用 foo，所以不会出问题
```

但在 ESM 中，如果提前使用了未初始化的值：

```js
// a.mjs
import { b } from './b.mjs'
console.log(b) // ReferenceError: Cannot access before initialization
export const a = 1

// b.mjs
import { a } from './a.mjs'
console.log(a) // 报错！a 尚未初始化
export const b = 2
```

因为 ESM 的 `import` 是**提升的**（hoisted），所有 `import` 在模块代码执行前就被解析，但实际的变量值要到导出模块执行后才能获取。

---

## 四、ESM 与 CommonJS 的互操作

```js
// 在 ESM 中导入 CommonJS
import { createServer } from 'http'  // CJS 模块
import pkg from './legacy-package'    // CJS 默认导出

// Node.js 如何处理：将 CJS 的 module.exports 整体作为 ESM 的 default 导出
```

```js
// 在 CommonJS 中导入 ESM（需要通过动态 import）
async function loadESM() {
  const esmModule = await import('./esm-module.mjs')
  console.log(esmModule.someExport)
}
```

---

## 五、模块打包的底层原理

```js
// 打包器将 ESM 转化为 CommonJS 或 IIFE
// 原始代码：
import { add } from './math.js'
console.log(add(1, 2))

// 打包后（简化）：
const __modules = {
  './math.js': (exports) => {
    exports.add = (a, b) => a + b
  },
  './main.js': (exports) => {
    const { add } = __modules['./math.js']()
    console.log(add(1, 2))
  }
}
```

**模块联邦（Module Federation）** 更进一步——让不同的独立构建产物在运行时动态共享模块，这是微前端的技术基础之一。

---

## 六、总结

| 特性 | CommonJS | ESM |
|------|----------|-----|
| 加载时机 | 运行时同步 | 解析时静态 + 执行时 |
| 值绑定 | 值拷贝 | 动态绑定（Live Binding） |
| Tree Shaking | ❌ | ✅ |
| 循环依赖 | 部分执行（不完整导出） | 安全（未初始化即报错） |
| 异步 | ❌ | ✅（import()） |
| 浏览器原生 | ❌ | ✅ |

理解模块系统的底层实现，不仅有助于解决"模块加载顺序"这类疑难问题，也能让你在设计大型项目的模块拆分策略时做出更好的决策。
