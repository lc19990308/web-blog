---
title: "你不知道的JavaScript（四）：提升（Hoisting）——变量和函数声明的秘密"
date: 2026-06-26
categories: "你不知道的javascript"
description: "深入 JavaScript 的变量提升和函数提升机制，理解编译阶段与执行阶段的分离，掌握提升优先级规则"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

```javascript
a = 2
var a
console.log(a) // 输出什么？
```

直觉上，`var a` 在 `a = 2` 之后，应该输出 `undefined`。但答案其实是：

```
2
```

这就是**提升（Hoisting）**——变量和函数声明会被"移动"到它们所在作用域的顶部。

---

## 一、提升的本质

### 1.1 编译器做了什么？

回顾第一篇的内容，JavaScript 代码执行包含两个阶段：

```
编译阶段：处理所有声明（var, function, let, const, class）
执行阶段：运行赋值和调用等操作
```

**提升**就是编译阶段把声明"提前"到作用域顶部的机制。

```javascript
// 你写的代码：
console.log(a)
var a = 2

// 编译器实际执行的代码：
var a           // 编译阶段：声明提升
console.log(a)  // 执行阶段：输出 undefined
a = 2           // 执行阶段：赋值
```

所以开头的例子：

```javascript
// 你写的：
a = 2
var a
console.log(a)

// 实际执行：
var a    // 声明提升
a = 2    // 赋值在原来位置
console.log(a) // 2
```

### 1.2 函数声明 vs 函数表达式

**函数声明**会整体提升：

```javascript
foo() // 'Hello' — 可以正常调用

function foo() {
  console.log('Hello')
}
```

实际执行：

```javascript
function foo() {  // 整个函数提升
  console.log('Hello')
}

foo() // 'Hello'
```

**函数表达式**中只有变量声明提升，赋值不移：

```javascript
bar() // ❌ TypeError: bar is not a function

var bar = function() {
  console.log('Hello')
}
```

实际执行：

```javascript
var bar           // 提升（值为 undefined）

bar()             // undefined() → TypeError

bar = function() {
  console.log('Hello')
}
```

---

## 二、函数优先规则

### 2.1 同名的函数声明和变量声明

当同一个作用域中出现同名的函数和变量时，**函数声明优先于变量声明**：

```javascript
foo() // 1（函数声明优先）

var foo
function foo() {
  console.log(1)
}

foo = function() {
  console.log(2)
}
```

实际执行过程：

```javascript
function foo() {  // 函数声明提升（优先级高）
  console.log(1)
}
// var foo;        // 重复的 var 声明被忽略

foo() // 1

foo = function() { // 运行时覆盖
  console.log(2)
}
```

### 2.2 多个同名的函数声明

后面的覆盖前面的：

```javascript
foo() // 2

function foo() { console.log(1) }
function foo() { console.log(2) }
function foo() { console.log(3) } // 最后定义的这个
```

实际结果？上面会输出 `2`。等一下，有三种定义？不对——最后一个函数的定义会覆盖前面的，所以输出 `2`。

```javascript
foo() // 3（最后一个覆盖前面的）
function foo() { console.log(1) }
function foo() { console.log(2) }
function foo() { console.log(3) }
```

---

## 三、块中的函数声明

非严格模式下，块中的函数声明在不同浏览器中表现不同：

```javascript
// 非严格模式
console.log(foo) // undefined（被提升了，但不是函数）

if (true) {
  function foo() {
    console.log(1)
  }
}

console.log(foo) // 可能是 1，也可能是 undefined（取决于引擎）
```

**推荐**：不要在块中声明函数，用函数表达式代替：

```javascript
// ✅ 推荐写法
var foo

if (true) {
  foo = function() {
    console.log(1)
  }
}
```

---

## 四、let 和 const 的"提升"

很多人说 `let` 和 `const` 不会被提升——**这是错的**。它们**会被提升，但有暂时性死区（TDZ）**。

```javascript
// 如果 let 不提升，下面这行应该报错 "a is not defined"
// 但实际上它报的是 "Cannot access 'a' before initialization"
// 这说明引擎知道 a 存在，只是还没初始化
console.log(a) // ❌ ReferenceError: Cannot access 'a' before initialization
let a = 1
```

**证明 let 被提升了**：

```javascript
let x = 'outer'

function test() {
  // 如果 x 没被提升，这里应该取到外层的 'outer'
  // 但实际报错 ReferenceError
  console.log(x)
  let x = 'inner'
}
```

如果 `let x` 没有提升，`console.log(x)` 会取到外层的 `'outer'`。但实际报错了——说明引擎知道当前作用域有一个 `x`，但它还没初始化（TDZ）。

### 4.1 提升的完整对比

```javascript
// var：提升 + 初始化为 undefined
console.log(a) // undefined
var a = 1

// let：提升 + 不初始化（TDZ）
console.log(b) // ReferenceError
let b = 2

// const：提升 + 不初始化（TDZ）
console.log(c) // ReferenceError
const c = 3

// function：提升 + 初始化（整个函数体）
foo() // ✅ 可调用
function foo() {}

// class：提升 + 不初始化（TDZ）
new MyClass() // ReferenceError
class MyClass {}
```

---

## 五、常见的提升陷阱

### 5.1 陷阱一：赋值拆解

```javascript
// 你以为：
var a = 1
var b = 2
// 实际上：var a; var b; a = 1; b = 2;

// 你以为的链式赋值：
var a = b = 3
// 实际上：var a; b = 3; a = 3;
// b 变成了全局变量！
```

### 5.2 陷阱二：函数名与变量名

```javascript
var a = 1
function a() {}
console.log(typeof a) // "number"（运行时赋值覆盖了函数声明）
```

但在提升阶段：

```javascript
// 提升后：
function a() {} // 函数声明优先
// var a 被忽略
a = 1           // 运行时覆盖为 number
```

### 5.3 陷阱三：条件中的函数声明

```javascript
typeof foo // ?

if (true) {
  function foo() { return 1 }
} else {
  function foo() { return 2 }
}
```

不同浏览器结果不同，不要在条件中声明函数！

---

## 六、理解提升后，这些代码就清晰了

```javascript
// 例子1
function test() {
  console.log(a)   // undefined
  console.log(foo) // function foo...
  
  var a = 1
  function foo() {
    return 2
  }
}
// 等价于：
function test() {
  function foo() {
    return 2
  }
  var a
  
  console.log(a)
  console.log(foo)
  
  a = 1
}
```

```javascript
// 例子2
var a = 1

function test() {
  if (!a) {
    var a = 10  // 这里的 var a 被提升到 test 顶部
  }
  console.log(a)
}

test() // 10（不是 1）
```

**为什么？** — `test` 中的 `var a` 提升到了 `test` 函数顶部，初始化为 `undefined`，所以 `!a` 为 `true`，然后赋值为 `10`。

```javascript
// 例子3：经典面试题
function foo() {
  function bar() {
    return 3
  }
  return bar()

  function bar() {
    return 8
  }
}
console.log(foo()) // 8（第二个 bar 覆盖了第一个）
```

---

## 七、最佳实践

1. **使用 let/const 代替 var** — TDZ 帮你发现错误，而不是静默返回 undefined
2. **先声明后使用** — 即使理解提升机制，也不要在声明前使用变量
3. **在作用域顶部声明所有变量** — 模拟"提升"，让代码更清晰
4. **避免函数声明和变量声明同名** — 虽然函数优先，但会让人困惑
5. **不要在块中声明函数** — 不同引擎表现不一致

```javascript
// ✅ 推荐写法
function myFunction() {
  const MAX = 100
  let count = 0
  let result = null

  for (let i = 0; i < MAX; i++) {
    count += i
  }

  return count
}
```

---

## 总结

1. **提升是编译阶段的声明前置**，不是字面上的"代码移动"
2. **`var` 声明的变量提升并初始化为 `undefined`**
3. **函数声明整体提升**（包括函数体），优先级高于变量声明
4. **`let` / `const` 提升但不初始化**，在声明前访问会触发 TDZ 错误
5. **函数表达式不会整体提升**，只有变量声明部分提升
6. **`class` 声明也受 TDZ 保护**

> 下一篇将深入**闭包**，这是 JavaScript 中最核心也是最高频面试的概念。
