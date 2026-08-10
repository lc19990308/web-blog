---
title: "JavaScript 严格模式（Strict Mode）完全指南"
date: 2022-06-08 18:52:00
updated: 2026-06-23
categories: "JavaScript"
description: "理解 JavaScript 严格模式的作用、启用方式、9 条关键限制，以及现代开发中严格模式的默认行为"
tags: "JavaScript"
copyright: true
---

## 前言

JavaScript 在 ES5 中引入了**严格模式（Strict Mode）**。在严格模式下，一些不安全或容易出错的写法会被禁止，从而写出更健壮的代码。

关键认知：**ES Module（type="module"）和 class 内部默认就是严格模式，无需手动开启。**

---

## 一、如何启用

### 1.1 全局开启

```javascript
'use strict'  // 放在文件最顶部

// 下面的代码都在严格模式下执行
function demo() { /* 也是严格模式 */ }
```

### 1.2 函数内开启

```javascript
function strictFn() {
  'use strict'
  // 只在当前函数内生效
}

function sloppyFn() {
  // 非严格模式
}
```

### 1.3 自动启用严格模式

```javascript
// ES Module 默认严格模式
<script type="module">
  // 这里已经是严格模式
  x = 1  // ReferenceError
</script>

// class 内部默认严格模式
class Person {
  constructor() { /* 严格模式 */ }
}
```

**所以：** 现代项目使用 ES Module（`type="module"`）或 class 时，不需要显式写 `'use strict'`。

---

## 二、严格模式的 9 条限制

### 2.1 变量必须声明

```javascript
// ❌ 非严格模式：创建全局变量
x = 10  // 不报错

// ✅ 严格模式：报错
'use strict'
x = 10  // ReferenceError: x is not defined
```

### 2.2 禁止删除变量

```javascript
'use strict'
var x = 1
delete x  // SyntaxError

// 删除对象属性可以
delete obj.prop  // ✅ 可以
```

### 2.3 禁止重复参数名

```javascript
// ❌ 非严格模式：后面覆盖前面
function bad(a, a, a) { return a + a + a }

// ✅ 严格模式：报错
'use strict'
function bad(a, a, a) { } // SyntaxError: Duplicate parameter name
```

### 2.4 禁止 with 语句

```javascript
// ❌ with 是性能杀手
with (document.body.style) { /* 不推荐 */ }

// ✅ 严格模式直接报错
'use strict'
with (obj) { } // SyntaxError
```

### 2.5 this 指向 undefined

```javascript
'use strict'
function demo() {
  console.log(this) // undefined（非严格模式下是 window）
}
demo()

// 构造函数中的 this 不受影响
new function() { console.log(this) }  // 实例
```

### 2.6 禁止八进制字面量

```javascript
// ❌ 非严格模式：012 = 10 进制 10
var x = 012

// ✅ 严格模式：报错
'use strict'
var x = 012  // SyntaxError

// ES6 的八进制语法没问题
var y = 0o12  // ✅ ES6 八进制
```

### 2.7 禁止对只读属性赋值

```javascript
'use strict'
NaN = 1         // TypeError
undefined = 1   // TypeError
Infinity = 1    // TypeError

const obj = Object.freeze({ name: 'test' })
obj.name = 'new' // TypeError（严格模式下报错，非严格模式静默失败）
```

### 2.8 eval 有独立作用域

```javascript
'use strict'
eval('var x = 10')
console.log(x)   // ReferenceError（eval 中的变量不会泄漏到外部）

// 非严格模式下
eval('var y = 20')
console.log(y)   // 20（变量泄漏到外部作用域）
```

### 2.9 arguments 不追踪参数变化

```javascript
'use strict'
function demo(a) {
  a = 2
  console.log(arguments[0]) // 1（不改——严格模式下 arguments 不追踪参数变化）

  // 非严格模式下会输出 2
}
demo(1)
```

---

## 三、实际开发影响

### 3.1 类数组转数组

```javascript
// 严格模式下 arguments 的 callee 属性被禁用
'use strict'
function demo() {
  arguments.callee  // TypeError
}
```

### 3.2 全局 this

```javascript
'use strict'
// 事件回调中 this = undefined（之前是 window）
button.addEventListener('click', function() {
  console.log(this) // undefined（不是 window）
})
```

---

## 四、严格模式检查

```javascript
// 检查当前是否在严格模式下
function isStrictMode() {
  return !this  // 严格模式下 this = undefined
}

// 或
function isStrictMode2() {
  return (function() { return !this })()
}
```

---

## 五、常见问题

### Q1：严格模式能提升性能吗？

**不一定。** 某些优化（如省略变量声明检查）在严格模式下更高效，但具体的性能差异微乎其微。严格模式的主要价值是**代码安全性**。

### Q2：项目中要不要用？

```javascript
// 如果是 ES Module 或 class → 已经是严格模式
// 如果是普通脚本（<script>）→ 建议开启

// 老项目迁移注意：严格模式禁止的一些写法可能导致报错
// 建议逐步开启，而非全局一把梭
```

---

## 总结

```javascript
// 严格模式核心变化：
//
// 1. 变量必须声明    ❌ x = 1
// 2. this = undefined（普通函数）
// 3. 禁止重复参数
// 4. 禁止 with
// 5. 禁止八进制字面量
// 6. 只读属性赋值报错
// 7. eval 有独立作用域
// 8. arguments 不追踪参数
// 9. 禁止删除变量

// 现代项目：ES Module / class 自动开启，不需要写 'use strict'
```

**推荐阅读：**
- [MDN: Strict mode](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Strict_mode)
- [ES6 入门: 严格模式](https://es6.ruanyifeng.com/#docs/let)
