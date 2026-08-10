---
title: "你不知道的JavaScript（一）：JavaScript 编译原理与作用域"
date: 2026-06-25
categories: "你不知道的javascript"
description: "JavaScript 不是逐行解释执行的——它先编译后运行。理解编译原理，才能真正理解作用域、提升和闭包"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

很多开发者以为 JavaScript 是"解释型语言，逐行执行"。这是一个常见的误解。

事实上，**JavaScript 引擎在执行代码之前会先编译**。虽然编译过程非常短暂（微秒级），但理解这个编译过程是理解作用域的基石。

---

## 一、一段代码是如何执行的？

看这段代码：

```javascript
var a = 2
```

你觉得这一行发生了什么？"给变量 a 分配内存，赋值为 2"——这是大多数人的答案。但实际上它经历了**编译阶段**和**执行阶段**。

### 1.1 三个角色

JavaScript 程序执行涉及三个角色：

| 角色 | 职责 |
|------|------|
| **引擎（Engine）** | 从头到尾负责整个程序的编译和执行 |
| **编译器（Compiler）** | 负责词法分析、语法分析、生成可执行代码 |
| **作用域（Scope）** | 负责收集并维护所有声明的标识符（变量），确定当前执行代码对这些标识符的访问权限 |

### 1.2 编译阶段

当引擎遇到 `var a = 2` 时，编译器做了这两件事：

**第一步：编译（声明）**
```javascript
// 编译器遇到 var a，询问作用域：
// "在当前作用域中，有没有一个叫 a 的变量？"
// 没有 → 作用域声明一个新变量 a
// 有 → 跳过声明
```

**第二步：执行（赋值）**
```javascript
// 引擎运行时代码：a = 2
// 引擎询问作用域：
// "在当前作用域中，能找到变量 a 吗？"
// 找到 → 赋值 2
// 没找到 → 抛出 ReferenceError
```

---

## 二、LHS 查询与 RHS 查询

引擎在作用域中查找变量时，执行两种不同的查询：

### 2.1 什么是 LHS 和 RHS？

把变量放在**赋值操作的左侧**和**右侧**来理解：

```javascript
// RHS：取出 a 的值（右手边，被使用）
console.log(a)

// LHS：找到 a 的位置，准备赋值（左手边，被赋值）
a = 2

// 组合情况
var b = a + 1
// b: LHS（被赋值）
// a: RHS（取值）
```

### 2.2 识别 LHS/RHS

```javascript
function foo(a) {
  // 隐式 LHS：调用时 a = 2（形参赋值）
  var b = a
  // b: LHS, a: RHS
  return a + b
  // a: RHS, b: RHS
}

var c = foo(2)
// c: LHS, foo: RHS
```

**区分技巧**：如果变量出现在赋值操作的**左边**（被赋值的位置），就是 LHS；如果是**右边**（被读取的位置），就是 RHS。

### 2.3 LHS 和 RHS 失败时的不同行为

```javascript
function test() {
  // RHS 失败 → ReferenceError（变量未声明）
  console.log(b) // ❌ ReferenceError: b is not defined

  // LHS 失败 → 非严格模式下自动创建全局变量
  a = 1 // 没报错，但创建了全局变量 a
}

test()
console.log(a) // 1（污染了全局作用域）
```

```javascript
"use strict"

function test() {
  // 严格模式下，LHS 失败也会报 ReferenceError
  a = 1 // ❌ ReferenceError
}
```

### 2.4 面试题

理解 LHS/RHS 就能答对这道经典面试题：

```javascript
console.log(a) // 输出什么？
var a = 2
```

**答案**：`undefined`

**过程**：
1. 编译阶段：`var a` 被提升，声明变量 a
2. 执行阶段：`console.log(a)` RHS 查询 a 的值
3. 此时 a 还没被赋值，所以值为 `undefined`

---

## 三、作用域的嵌套

作用域是**嵌套**的，就像大楼的房间：

```javascript
function outer() {
  var a = 1

  function inner() {
    var b = 2
    // 可以访问 a 和 b
    console.log(a + b) // 3

    function innermost() {
      var c = 3
      // 可以访问 a, b, c
      console.log(a + b + c) // 6
    }
    innermost()
  }
  inner()
  // 不能访问 b
  // console.log(b) // ReferenceError
}

outer()
```

### 3.1 作用域查找规则

引擎从**当前执行的作用域**开始查找变量，逐级向上，直到找到为止：

```javascript
var globalVar = 'global'

function foo() {
  var fooVar = 'foo'

  function bar() {
    var barVar = 'bar'

    console.log(barVar) // 当前作用域找到 → 'bar'
    console.log(fooVar) // 上一层找到 → 'foo'
    console.log(globalVar) // 全局作用域找到 → 'global'
    console.log(notExist) // 所有作用域都没找到 → ReferenceError
  }
  bar()
}
foo()
```

### 3.2 遮蔽效应（Shadowing）

当内层作用域声明了与外层同名的变量，内层的变量会"遮蔽"外层：

```javascript
var name = 'Global'

function foo() {
  var name = 'Foo'
  console.log(name) // 'Foo'（内层遮蔽了外层）

  function bar() {
    var name = 'Bar'
    console.log(name) // 'Bar'
  }
  bar()
}

foo()
console.log(name) // 'Global'
```

**注意**：JavaScript 不支持越过遮蔽直接访问外层同名变量（除非用 `window.name` 访问全局变量）。

---

## 四、编译原理的启示

理解编译原理后，很多奇怪的现象就清楚了：

### 4.1 为什么函数声明可以提升？

```javascript
foo() // 'Hello' — 为什么不会报错？
function foo() {
  console.log('Hello')
}
```

因为在编译阶段，函数声明被整个提升到作用域顶部。变量声明 `var` 也会提升，但赋值不移。

### 4.2 为什么函数表达式不行？

```javascript
bar() // ❌ TypeError: bar is not a function
var bar = function() {
  console.log('Hello')
}
```

`var bar` 被提升了（值为 `undefined`），但赋值在运行时才发生。所以执行 `bar()` 时，bar 是 `undefined`，不是一个可调用的函数。

### 4.3 LHS/RHS 真实案例

```javascript
// 猜输出
(function() {
  var a = b = 3
})()
console.log(b) // ?
console.log(a) // ?
```

**答案**：`3`，`ReferenceError: a is not defined`

**解析**：
- `var a = b = 3` 等价于 `var a = 3; b = 3`
- `var a` → LHS，找到函数作用域的 a
- `b = 3` → LHS，函数作用域没有 b，外层也没有 → 非严格模式下创建全局变量 b
- 函数执行完后，a 被销毁，b 留在全局

```javascript
"use strict"
(function() {
  var a = b = 3
})()
// 严格模式下两者都报 ReferenceError
```

---

## 五、回到那行代码

现在再看开头那行 `var a = 2`：

```
编译阶段：
  编译器：var a — 作用域，有 a 吗？→ 没有，声明它
执行阶段：
  引擎：a = 2 — 作用域，有 a 吗？→ 有，赋值 2
```

整个过程分成了**编译期（声明）**和**运行期（赋值）**。理解这两个阶段的分离，是理解 JavaScript 其他一切高级概念的基础。

---

## 总结

1. **JavaScript 是先编译后执行的语言**，不是纯解释型
2. **LHS 查询**：找变量容器（赋值目标）；**RHS 查询**：取变量的值（赋值源）
3. **作用域嵌套查找**：从当前作用域向外，直到全局
4. **LHS 失败**：非严格模式创建全局变量，严格模式报 ReferenceError
5. **RHS 失败**：始终报 ReferenceError
6. 编译阶段处理声明，执行阶段处理赋值——**提升**由此而来

> 下一篇将深入**词法作用域**，讲解 JavaScript 作用域的静态特性。
