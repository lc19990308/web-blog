---
title: "你不知道的JavaScript（二）：词法作用域——JavaScript 的静态作用域规则"
date: 2026-06-26
categories: "你不知道的javascript"
description: "JavaScript 采用词法作用域（静态作用域）：函数的作用域在定义时确定，而不是在调用时。深入理解词法作用域是理解闭包的基础"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

作用域有两种主要的工作模型：

1. **词法作用域（静态作用域）** — 作用域在**写代码时（定义时）**确定。JavaScript 采用此模型
2. **动态作用域** — 作用域在**运行时（调用时）**确定。Bash、Perl 采用此模型

理解这个区别，能解释很多 JavaScript 中让人困惑的现象。

---

## 一、词法作用域的定义

**词法作用域**意味着作用域是由**函数被声明的位置**决定的，而不是由函数被调用的位置决定的。

换句话说：**你在哪里定义函数，决定了你能访问哪些变量。**

```javascript
var a = 'global'

function foo() {
  var a = 'foo'
  bar()
}

function bar() {
  console.log(a)
}

foo() // 输出什么？
bar() // 输出什么？
```

**答案**：两次都输出 `"global"`。

**解析**：
- `bar` 函数是在全局作用域中定义的
- 无论它在哪调用，它的作用域链在**定义时已确定**：bar → 全局
- 所以 `bar` 内部的 `a` 永远是全局的 `a`

### 1.1 对比：如果是动态作用域

```javascript
// 伪代码——如果是动态作用域
var a = 'global'

function foo() {
  var a = 'foo'
  bar()
}

function bar() {
  console.log(a)
}

foo() // 动态作用域下会输出 'foo'（调用时的作用域）
```

这就是词法作用域和动态作用域的核心区别：
- **词法**：看函数在哪定义 → `bar` 在全局定义 → 取全局 a
- **动态**：看函数在哪调用 → `bar` 在 `foo` 内调用 → 取 foo 的 a

---

## 二、作用域链的形成

### 2.1 定义时建立

```javascript
function outer() {          // 外层作用域 1
  var x = 1

  function inner() {        // 内层作用域 2
    var y = 2

    function innermost() {  // 最内层作用域 3
      var z = 3
      // 作用域链: 3 → 2 → 1 → 全局
      console.log(x + y + z) // 6
    }
    innermost()
  }
  inner()
}
outer()
```

作用域链在**定义时**就确定了，就像一套嵌套的盒子：

```
全局作用域
  └── outer 函数作用域
        └── inner 函数作用域
              └── innermost 函数作用域
```

内部盒子永远可以访问外部盒子中的变量，反过来不行。

### 2.2 闭包正是利用了这一点

```javascript
function createCounter() {
  var count = 0        // createCounter 的变量

  return function() {
    count++            // 内层函数引用了外层函数的变量
    console.log(count)
  }
}

const counter = createCounter()
counter() // 1
counter() // 2
counter() // 3
```

这就是闭包——内层函数**在定义时捕获了外层函数的变量 `count`**，即使 `createCounter` 已经执行完毕，`count` 仍然被内层函数保留着。

---

## 三、欺骗词法作用域的手段

以下两种方式可以**在运行时改变作用域**，但**严格模式下全部禁用，且不推荐使用**：

### 3.1 eval

```javascript
function foo(str) {
  eval(str)        // 在运行时插入代码，修改了当前作用域
  console.log(a)   // 2（原来这里没有变量 a）
}

foo('var a = 2')
```

`eval` 接收一个字符串，把它当作 JavaScript 代码来执行，**在当前位置插入新的变量声明**。

**危害**：
- 性能差：编译器无法做优化（因为它无法预知 eval 里是什么）
- 代码难以理解和调试
- 有安全风险（字符串注入）

### 3.2 with

```javascript
var obj = {
  a: 1,
  b: 2,
}

// 不使用 with
var a = obj.a
var b = obj.b

// 使用 with
with (obj) {
  console.log(a) // 1
  console.log(b) // 2
}
```

`with` 把一个对象作为作用域来处理。但问题在于：

```javascript
function foo(obj) {
  with (obj) {
    a = 2  // 是修改 obj.a，还是创建全局变量 a？
  }
}

var obj1 = { a: 3 }
var obj2 = { b: 3 }

foo(obj1)
console.log(obj1.a) // 2 ✅ 修改了 obj1.a

foo(obj2)
console.log(obj2.a) // undefined ❌ obj2 没有 a
console.log(a)      // 2 ❌ 在全局创建了变量 a！
```

**问题**：`with` 在运行时无法确定对象有什么属性，所以编译器完全无法做优化。

### 3.3 为什么严格模式禁用它们？

```javascript
"use strict"

eval('var x = 1')
console.log(x) // ❌ ReferenceError

with (obj) { } // ❌ SyntaxError
```

因为这两个特性**破坏了词法作用域的静态特性**——编译器在编译阶段无法知道作用域的形状，必须等到运行时才知道，这导致大量性能优化无法进行。

---

## 四、性能影响

### 4.1 编译器优化

正常代码中，编译器在编译阶段就知道所有变量的位置，可以做以下优化：

- 变量存储在哪个作用域？
- 访问变量需要多少层查找？
- 是否可以内联优化？

### 4.2 eval/with 的代价

```javascript
function foo() {
  var x = 1
  var y = 2

  // 如果这里有 eval，编译器无法预知会声明什么变量
  // 所以它无法对 x 和 y 做任何优化
  eval('...')

  return x + y
}

// 不带 eval 的版本可以让编译器做完美优化
function bar() {
  var x = 1
  var y = 2
  return x + y
}
```

这就是为什么生产代码中**永远不要使用 eval 和 with**。

---

## 五、词法作用域的深层理解

### 5.1 函数作为一等公民

词法作用域让函数可以：

1. **作为参数传递**
2. **作为返回值**
3. **赋值给变量**
4. **存储在数据结构中**

```javascript
function greeter(greeting) {
  return function(name) {
    // 这里的 greeting 来自外层作用域（定义时捕获）
    console.log(greeting + ', ' + name)
  }
}

const sayHello = greeter('Hello')
const sayHi = greeter('Hi')

sayHello('LC')  // Hello, LC
sayHi('LC')     // Hi, LC
```

### 5.2 回调函数的作用域

```javascript
var data = 'global'

function fetchData(callback) {
  var data = 'local'
  callback() // 回调的作用域在定义时确定，不是在调用时
}

function callback() {
  console.log(data) // 这个 data 是全局的 data
}

fetchData(callback)
// 输出：'global'（因为 callback 在全局定义）
```

这是新手常见的困惑——以为回调函数会捕获调用时的作用域。实际上它捕获的是**定义时**的作用域。

---

## 六、面试题

```javascript
for (var i = 1; i <= 5; i++) {
  setTimeout(function() {
    console.log(i)
  }, i * 1000)
}
```

**问题**：输出什么？
**答案**：每隔一秒输出一个 `6`，共五次。

**理解**：
1. `var i` 属于函数作用域（或全局）
2. 循环结束后 `i = 6`
3. 所有回调函数在定义时共享同一个 `i`
4. 一秒后回调执行，读取 `i` → 6

**修复**：

```javascript
// 方案1：IIFE 创建新作用域
for (var i = 1; i <= 5; i++) {
  (function(j) {
    setTimeout(function() {
      console.log(j)
    }, j * 1000)
  })(i)
}

// 方案2：let 块级作用域（推荐）
for (let i = 1; i <= 5; i++) {
  setTimeout(function() {
    console.log(i)
  }, i * 1000)
}
```

---

## 总结

1. **JavaScript 是词法作用域**：作用域在函数定义时确定，不是在调用时
2. **作用域链在定义时建立**：嵌套函数可以访问外层函数的变量
3. **闭包**利用词法作用域的特性——函数"记住"定义时的作用域
4. **`eval` 和 `with`** 能欺骗词法作用域，但严格模式禁用，且严重影响性能
5. **回调函数的作用域由其定义位置决定**，不是调用位置

> 下一篇将深入**函数作用域与块作用域**，讲解 var/let/const 的区别。
