---
title: "前端模块化：从 IIFE 到 ESM 的演进之路"
date: 2026-07-13
categories: "JavaScript"
description: "回顾 JavaScript 模块化的发展历程，从 IIFE、CommonJS、AMD、UMD 到 ES Modules，理解每个阶段的痛点与解决方案"
tags: ["JavaScript", "工程化"]
copyright: true
---

## 前言

模块化是现代前端开发的基石。但 JavaScript 在诞生之初并没有模块系统——这门语言被设计为"在浏览器中跑一些简单的脚本"。

> 当页面只有一个 `<script>` 标签时，不需要模块化。但当项目达到 10 万行代码时，模块化就是生存问题。

本文将带你梳理 JavaScript 模块化的**完整演进史**。

---

## 一、混沌时代：全局变量

```html
<script src="jquery.js"></script>
<script src="utils.js"></script>
<script src="app.js"></script>
```

**问题：**
- 所有变量都在 `window` 上，命名冲突
- 依赖顺序必须手动维护
- 没有"私有"的概念

---

## 二、IIFE 模式——模块化的雏形

### 2.1 立即执行函数

```js
// utils.js
;(function(global) {
  'use strict'

  var privateVar = '私有变量' // 外部无法访问

  function publicFn() {
    console.log('公开方法')
  }

  // 暴露给全局
  global.MyUtils = {
    publicFn: publicFn
  }
})(window)
```

**解决了：** 变量作用域隔离、私有成员
**没解决：** 依赖管理、异步加载

---

## 三、CommonJS——Node.js 的选择

```js
// math.js
const add = (a, b) => a + b
module.exports = { add }

// app.js
const { add } = require('./math.js')
console.log(add(1, 2)) // 3
```

**核心特征：**
- 同步加载（适合服务端）
- 简单直观
- 社区生态庞大（npm）

**在浏览器中的问题：** 同步 `require` 会导致浏览器卡死——需要加载完文件才能继续执行。

---

## 四、AMD——浏览器端的解决方案

```js
// define 声明模块
define('math', [], function() {
  return {
    add: (a, b) => a + b
  }
})

// require 异步加载模块
require(['math'], function(math) {
  console.log(math.add(1, 2))
})
```

**本质：** 将所有模块定义包在回调函数中，通过回调实现异步加载。

**代表库：** RequireJS
**问题：** 语法冗余，提前定义所有依赖，代码可读性差。

---

## 五、UMD——兼容方案

```js
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(['jquery'], factory)
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = factory(require('jquery'))
  } else {
    // 全局变量
    root.MyLib = factory(root.jQuery)
  }
})(this, function($) {
  return { /* ... */ }
})
```

**一句话：** UMD 让同一份代码在 AMD、CommonJS 和全局变量中都能工作。

---

## 六、ES Modules——标准答案

### 6.1 语法

```js
// math.js
export const add = (a, b) => a + b
export default function multiply(a, b) { return a * b }

// app.js
import multiply, { add } from './math.js'
```

### 6.2 核心特性

```js
// 1. 静态分析 —— 在编译时就能确定依赖关系
import { readFile } from 'fs'  // 打包器可以做 Tree Shaking

// 2. 异步加载 —— import() 动态导入
const module = await import('./heavy-module.js')

// 3. 支持 Top-level await
const data = await fetch('/api/data').then(r => r.json())
export default data
```

### 6.3 ESM vs CommonJS 对比

| 特性 | CommonJS | ESM |
|------|----------|-----|
| 加载方式 | 同步 | 同步/异步 |
| 解析时机 | 运行时 | 编译时（静态） |
| 值绑定 | 拷贝（值类型） | 动态绑定（类似引用） |
| Tree Shaking | ❌ | ✅ |
| 浏览器原生 | ❌（需打包） | ✅ 现代浏览器支持 |
| import() | ❌ | ✅ 动态导入 |

---

## 七、模块演化总结

```
全局变量   →    IIFE    →    CommonJS     →    AMD    →    ESM
                                 ↓                          ↓
                            Node.js 生态              现代浏览器标准
                                 ↓
                            npm 生态
```

**每个阶段的演进都是为了解决前一阶段的问题：**

| 时代 | 解决的问题 | 代表 |
|------|-----------|------|
| 全局变量 | — | window.* |
| IIFE | 作用域 | jQuery 插件模式 |
| CommonJS | 模块规范 | Node.js / npm |
| AMD | 浏览器异步加载 | RequireJS |
| UMD | 兼容性 | 三方库 |
| **ESM** | **语言标准** | **所有现代项目** |

---

## 八、现代实践

```json
// package.json
{
  "type": "module",  // Node.js 项目中启用 ESM
  "exports": {
    ".": "./dist/index.js",
    "./utils": "./dist/utils.js"
  }
}
```

```ts
// 现代项目推荐：
// 1. 源码用 ESM
// 2. 构建用 esbuild / tsc
// 3. 发布时提供 ESM + CommonJS 双格式
// 4. 浏览器用 <script type="module">
```

---

## 九、总结

ES Modules 不仅是语法糖，它是 JavaScript 语言层面的模块标准。从工具链（打包器、编译工具）到框架（React、Vue、Svelte），整个前端生态已经全面拥抱 ESM。

理解这段演进史，不仅能帮你理解现代工具链的设计，也能让你在遇到模块相关的问题时，更快定位根因。
