---
title: "你不知道的JavaScript（三）：函数作用域与块作用域——var、let、const 的真相"
date: 2026-06-26
categories: "你不知道的javascript"
description: "深入对比函数作用域与块作用域，理解 var/let/const 的本质区别，以及 IIFE、块作用域在实际开发中的应用"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

JavaScript 有两种作用域单位：

- **函数作用域**：函数内部的变量在函数外不可访问。`var` 声明的是函数作用域
- **块作用域**：花括号 `{}` 内的变量在块外不可访问。`let` / `const` 声明的是块作用域

理解这两者的区别，是写出可预测代码的关键。

---

## 一、函数作用域

### 1.1 基本规则

使用 `var` 声明的变量属于**函数作用域**——函数内部任何位置都能访问：

```javascript
function foo() {
  var a = 1
  console.log(a) // 1
}

foo()
console.log(a) // ❌ ReferenceError: a is not defined
```

### 1.2 var 在块内部的行为

这是最容易踩坑的地方——**`var` 无视块作用域**：

```javascript
if (true) {
  var x = 1
}
console.log(x) // 1（没有报错！）

for (var i = 0; i < 3; i++) {
  // ...
}
console.log(i) // 3（循环结束后 i 还在！）

{
  var y = 2
}
console.log(y) // 2（块没有限制 var）
```

**原因**：`var` 只认函数作用域和全局作用域，不认块作用域。

### 1.3 var 在函数内的提升

```javascript
function foo() {
  console.log(a) // undefined（不是 ReferenceError）
  var a = 1
}
// 等价于：
function foo() {
  var a           // 提升到函数顶部
  console.log(a)  // undefined
  a = 1
}
```

---

## 二、IIFE——利用函数作用域隐藏变量

IIFE（Immediately Invoked Function Expression）创建一个临时作用域，把变量藏起来：

```javascript
// 全局作用域
var globalVar = '我是全局的'

// IIFE：创建独立作用域
(function() {
  var privateVar = '我是私有的'
  console.log(privateVar) // '我是私有的'
})()

console.log(privateVar) // ❌ ReferenceError
```

### 2.1 IIFE 的传参模式

```javascript
var global = '全局变量'

(function(g) {
  console.log(g) // '全局变量'
  var local = '局部变量'
})(global)
```

### 2.2 IIFE 的返回值

```javascript
var counter = (function() {
  var count = 0

  return {
    increment: function() { count++ },
    getCount: function() { return count },
  }
})()

counter.increment()
counter.increment()
console.log(counter.getCount()) // 2
console.log(counter.count)      // undefined（私有）
```

这就是**模块模式**的雏形——利用函数作用域隐藏内部状态，只暴露公共接口。

---

## 三、块作用域

### 3.1 let 和 const

ES6 引入的 `let` 和 `const` 将变量绑定到**最近的块**：

```javascript
if (true) {
  let blockVar = '我只能在这个块内访问'
  const BLOCK_CONST = '我也是'
  console.log(blockVar) // 正常
}
console.log(blockVar) // ❌ ReferenceError
```

### 3.2 for 循环中的 let

`let` 在 `for` 循环中会为**每次迭代创建新的绑定**：

```javascript
// var：所有迭代共享同一个 i
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// 输出：3, 3, 3

// let：每次迭代创建一个新的 i
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)
}
// 输出：0, 1, 2
```

`let` 的这个特性正是上一篇文章中"闭包面试题"的最佳解。

### 3.3 暂时性死区（TDZ）

`let` 和 `const` 声明的变量在声明之前不能访问——这个区域叫**暂时性死区（Temporal Dead Zone）**：

```javascript
// var 的行为
console.log(a) // undefined（提升但未初始化）
var a = 1

// let 的行为
console.log(b) // ❌ ReferenceError: Cannot access 'b' before initialization
let b = 2
```

**为什么要有 TDZ？**— 为了及早发现错误。如果你在变量声明前就使用它，说明代码逻辑可能有问题，直接报错比悄悄返回 `undefined` 更好。

```javascript
// TDZ 的典型场景
let x = 'outer'

function test() {
  console.log(x) // ❌ ReferenceError
  let x = 'inner'
}
// 这里当前作用域有 x 的声明，但还没初始化
// 即使外层有同名的 x，TDZ 也会阻止访问
```

---

## 四、const 的真相

### 4.1 const ≠ 不可变

很多开发者误以为 `const` 的值不可改变。**实际上 const 保证的是"绑定不可变"，而不是"值不可变"**：

```javascript
// ✅ 基础类型——绑定不可变，值也不可变
const PI = 3.14159
PI = 3 // ❌ TypeError: Assignment to constant variable

// ❌ 对象——绑定不可变，但内容可变
const user = { name: 'LC' }
user = {} // ❌ TypeError（改变绑定）

user.name = 'New Name' // ✅ 可以修改属性
user.age = 25          // ✅ 可以新增属性

// 如果想冻结对象
const frozenUser = Object.freeze({ name: 'LC' })
frozenUser.name = 'New' // 严格模式报错，非严格模式静默失败
```

### 4.2 选择原则

```javascript
// 基本原则：能用 const 用 const，不能用的用 let，永远不用 var

// ✅ const：不重新赋值的变量
const MAX_SIZE = 100
const BASE_URL = 'https://api.example.com'
const user = { id: 1, name: 'LC' }

// ✅ let：需要重新赋值的变量
let count = 0
let currentUser = null

// ❌ var：不要在新代码中使用
// var 会导致作用域污染和提升带来的混乱
```

---

## 五、三种声明的完整对比

| 特性 | `var` | `let` | `const` |
|------|-------|-------|---------|
| **作用域** | 函数作用域 | 块作用域 | 块作用域 |
| **提升** | 提升（undefined） | 提升（TDZ） | 提升（TDZ） |
| **重复声明** | 允许 | 不允许 | 不允许 |
| **重新赋值** | 允许 | 允许 | 不允许 |
| **全局声明** | 成为 window 属性 | 不作为 window 属性 | 不作为 window 属性 |
| **循环中新绑定** | 否（共用一个） | 是（每次创建新绑定） | 是 |

### 5.1 全局声明差异

```javascript
var globalVar = 'var'
let globalLet = 'let'

console.log(window.globalVar) // 'var'（var 会挂到 window 上）
console.log(window.globalLet) // undefined（let 不会）
```

### 5.2 重复声明

```javascript
var a = 1
var a = 2 // ✅ 允许
a = 3     // ✅

let b = 1
let b = 2 // ❌ SyntaxError: Identifier 'b' has already been declared
b = 3     // ✅

const c = 1
const c = 2 // ❌ SyntaxError
c = 3       // ❌ TypeError
```

---

## 六、实际场景中的选择

### 6.1 什么时候需要 var？

除了维护老旧代码，**没有理由用 `var`**。但在理解旧代码时，必须知道 var 的特性：

```javascript
// 旧代码中 var 经常这样用：
for (var i = 0; i < items.length; i++) {
  (function(j) {
    // IIFE 创建新作用域来捕获 j
    items[j].onClick = function() {
      console.log(j)
    }
  })(i)
}
```

现代写法：

```javascript
for (let i = 0; i < items.length; i++) {
  items[i].onClick = () => console.log(i)
}
```

### 6.2 块作用域的实用场景

```javascript
// 场景1：临时变量的作用域隔离
{
  const temp = computeExpensiveValue()
  cache.set('key', temp)
}
// temp 在这里已被回收

// 场景2：switch case 中的变量隔离
switch (type) {
  case 'user': {
    let name = getUserName()
    console.log(name)
    break
  }
  case 'admin': {
    let name = getAdminName() // 同名变量不会冲突
    console.log(name)
    break
  }
}

// 场景3：条件分支中的大对象
if (condition) {
  const largeData = fetchLargeData()
  process(largeData)
} // largeData 离开块后被回收
```

---

## 七、面试题

```javascript
// 1. 输出什么？
var x = 1
if (true) {
  var x = 2
}
console.log(x)

// 2. 输出什么？
let y = 1
if (true) {
  let y = 2
}
console.log(y)

// 3. 输出什么？
const arr = [1, 2, 3]
for (const item of arr) {
  console.log(item)
}
// 这里 const 可以吗？
```

**答案**：

1. `2` — `var` 无视块作用域，第二次声明覆盖了第一次
2. `1` — `let` 有块作用域，块内的 `y` 是独立的
3. `1 2 3` — 可以！`for...of` 每次迭代创建新的绑定

---

## 总结

1. **函数作用域**（`var`）：变量在函数内任何位置可见，提升到函数顶部
2. **块作用域**（`let` / `const`）：变量只在当前块内可见，有暂时性死区
3. **IIFE**：利用函数作用域创建私有变量的经典模式
4. **const**：保证绑定不可变，不是值不可变
5. **选型原则**：优先 `const`，需要改引用用 `let`，**永远不用 `var`**

> 下一篇将深入**提升（Hoisting）**机制，理解变量和函数声明在编译阶段的完整表现。
