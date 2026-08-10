---
title: "ES Module 完全指南：从语法到原理"
date: 2022-12-06 09:50:00
updated: 2025-06-22
categories: "ES6"
description: "系统掌握 ES Module 的 import/export 语法、静态/动态导入、模块加载原理以及与 CommonJS 的核心差异"
tags: "ES6"
copyright: true
---

## 前言

ES Module（ESM）是 JavaScript 官方的模块化方案，由 ECMAScript 2015（ES6）引入。与 CommonJS 不同，ESM 是**语言层面**的模块化，浏览器和 Node.js 都已原生支持。

---

## 一、快速开始

### 1.1 浏览器中使用

```html
<script type="module">
  import { add } from './math.js'
  console.log(add(1, 2))
</script>

<!-- 或加载外部文件 -->
<script type="module" src="./app.js"></script>
```

`type="module"` 告诉浏览器这是一个 ES Module。

### 1.2 Node.js 中使用

```json
// package.json
{
  "type": "module"  // 整个项目使用 ESM
}
```

或在文件级别使用 `.mjs` 扩展名。

---

## 二、export——导出

### 2.1 命名导出

```javascript
// 方式一：声明时导出
export const name = 'ES Module'
export function add(a, b) { return a + b }
export class Calculator {}

// 方式二：统一导出（推荐，更清晰）
const name = 'ES Module'
function add(a, b) { return a + b }
class Calculator {}

export { name, add, Calculator }

// 方式三：as 重命名
export { name as moduleName, add as sum }
```

### 2.2 默认导出

```javascript
// 方式一：直接导出
export default function() { console.log('default') }

// 方式二：先声明后导出
const utils = { add, subtract }
export default utils
```

**一个模块只能有一个 `export default`**，但可以同时拥有默认导出和命名导出：

```javascript
export default utils
export { name, add }
```

### 2.3 重新导出（聚合）

```javascript
// index.js — 将多个模块的导出聚合到一个入口
export { default as Button } from './Button.js'
export { Card, CardHeader } from './Card.js'
export * from './utils.js'  // 重新导出所有命名导出
```

---

## 三、import——导入

### 3.1 导入命名导出

```javascript
// 精确导入
import { name, add } from './module.js'

// 重命名
import { name as moduleName } from './module.js'

// 全部导入为一个对象
import * as utils from './module.js'
console.log(utils.name, utils.add(1, 2))
```

### 3.2 导入默认导出

```javascript
// 默认导出可以任意命名
import utils from './module.js'
// 等价于
import { default as utils } from './module.js'
```

### 3.3 同时导入默认和命名

```javascript
import utils, { name, add } from './module.js'
```

---

## 四、核心特性

### 4.1 严格模式

ES Module **自动开启严格模式**，无需手动声明 `"use strict"`：

```javascript
// 在 ESM 中 this 是 undefined（而非 window）
console.log(this) // undefined

// 不允许未声明变量
x = 1 // ReferenceError
```

### 4.2 静态结构——编译时分析

`import` 和 `export` 必须在模块的**顶层作用域**，不能嵌套在条件语句或函数中：

```javascript
// ✅ 正确：顶层
import { add } from './math.js'

// ❌ 错误：不能在条件语句中
if (condition) {
  import { add } from './math.js' // SyntaxError
}

// ❌ 错误：不能在函数中
function load() {
  import { add } from './math.js' // SyntaxError
}
```

正是这种**静态结构**，使打包工具（Webpack、Vite）能做**Tree Shaking**——在构建时移除未使用的导出。

### 4.3 导出的是引用（Live Binding）

```javascript
// counter.js
export let count = 0
export function increment() {
  count++ // 在模块内部修改
}

// main.js
import { count, increment } from './counter.js'
console.log(count) // 0
increment()
console.log(count) // 1 ✅ 值同步更新了！
```

**与 CommonJS 的关键区别：**

| 特性 | ES Module | CommonJS |
|------|-----------|----------|
| **导出值** | **值的引用**（Live Binding） | **值的拷贝** |
| **加载时机** | 编译时（静态） | 运行时（动态） |
| **import 位置** | 顶层，不可嵌套 | 可嵌套在条件/函数中 |
| **this** | undefined | module.exports |
| **Tree Shaking** | ✅ 原生支持 | ❌ 不支持 |

```javascript
// CommonJS 对比：值的拷贝
// counter.js
let count = 0
module.exports = { count, increment: () => count++ }

// main.js
const { count, increment } = require('./counter.js')
console.log(count) // 0
increment()
console.log(count) // 0 ❌ 值不变！是拷贝
```

### 4.4 默认延迟加载

`<script type="module">` 自带 `defer` 效果——等到 HTML 解析完后再执行：

```html
<script type="module" src="./app.js"></script>
<!-- 等价于 -->
<script defer src="./app.js"></script>
```

### 4.5 CORS 限制

ES Module 通过 CORS 加载资源，**不支持 `file://` 协议**：

```bash
# ❌ 直接双击 HTML 文件（file://）会报 CORS 错误
# ✅ 必须通过 HTTP 服务加载
npx serve .
```

---

## 五、动态导入 import()

虽然静态 `import` 更好（能 Tree Shaking），但有些场景需要**按需加载**：

```javascript
// 场景 1：按条件加载
if (userLocale === 'zh') {
  const i18n = await import('./i18n/zh.js')
  i18n.apply()
}

// 场景 2：路由懒加载（Vue Router）
const routes = [
  { path: '/about', component: () => import('./views/About.vue') },
]

// 场景 3：按需加载大型库
button.addEventListener('click', async () => {
  const chart = await import('https://cdn.com/chart.js')
  chart.render()
})
```

`import()` 返回一个 Promise，可用 `then()` 或 `await`：

```javascript
import('./module.js')
  .then((module) => { module.default() })
  .catch((err) => { console.error('模块加载失败:', err) })
```

**静态 import vs 动态 import()：**

| 特性 | 静态 import | 动态 import() |
|------|------------|---------------|
| 语法 | `import` 语句 | `import()` 函数 |
| 位置限制 | 顶层 | 任意位置 |
| 返回值 | 自动提升到顶层 | Promise |
| Tree Shaking | ✅ 支持 | ❌ 不支持 |
| 适用场景 | 大部分情况 | 按需加载、条件加载 |

---

## 六、模块对比：ESM vs CJS vs AMD

| 特性 | ES Module | CommonJS | AMD (RequireJS) |
|------|-----------|----------|-----------------|
| **标准** | ECMAScript 官方 | Node.js 社区 | 浏览器早期 |
| **语法** | `import`/`export` | `require`/`module.exports` | `define`/`require` |
| **加载** | 异步（浏览器） | 同步（Node） | 异步 |
| **静态分析** | ✅ | ❌ | ❌ |
| **Tree Shaking** | ✅ | ❌ | ❌ |
| **浏览器原生** | ✅ | ❌ | ❌ |
| **循环依赖** | 处理好 | 有问题 | - |

**当前建议：**

| 环境 | 推荐方案 |
|------|---------|
| 浏览器（现代） | 直接使用 `<script type="module">` |
| 浏览器（需兼容） | 用 Vite/Webpack 编译 ESM |
| Node.js（新项目） | ESM（`"type": "module"`） |
| Node.js（旧项目） | CommonJS（或逐步迁移） |

---

## 总结

| 知识点 | 要点 |
|--------|------|
| **严格模式** | ESM 自动启用，this = undefined |
| **静态结构** | import/export 必须在顶层，实现 Tree Shaking |
| **Live Binding** | 导出的是引用，导入方会同步源模块的变化 |
| **延迟执行** | type="module" 自带 defer |
| **CORS** | 必须通过 HTTP 服务加载 |
| **动态导入** | `import()` 返回 Promise，用于按需加载 |

**推荐阅读：**
- [MDN: JavaScript modules](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules)
- [ES6 入门 - Module](https://es6.ruanyifeng.com/#docs/module)
- [Node.js ESM 文档](https://nodejs.org/api/esm.html)
