---
title: "你不知道的JavaScript（六）：this 的四种绑定规则"
date: 2026-06-26
categories: "你不知道的javascript"
description: "this 是 JavaScript 中最令人困惑的关键字。本文从四种绑定规则入手，彻底理清 this 的指向逻辑，附带完整的优先级和边界情况"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

很多开发者对 `this` 的理解是："this 指向函数本身"或"this 指向函数所在的作用域"——**两个都是错的**。

`this` 的真相是：

> **this 是在函数被调用时（运行时）确定的，指向调用该函数的对象。**

理解 this 的关键不是"看函数在哪里定义的"，而是**看函数是怎么被调用的**。

---

## 一、四种绑定规则

### 1.1 默认绑定（Default Binding）

独立函数调用时适用，`this` 指向全局对象（浏览器中的 `window`，Node.js 中的 `global`）：

```javascript
function foo() {
  console.log(this.a)
}

var a = 2

foo() // 2（默认绑定，this 指向全局）
```

**严格模式下的默认绑定**：

```javascript
"use strict"

function foo() {
  console.log(this.a)
}

var a = 2

foo() // ❌ TypeError: Cannot read properties of undefined
// 严格模式下，this 是 undefined
```

**注意**：是函数体是否在严格模式，不是调用位置：

```javascript
function foo() {
  "use strict"
  console.log(this.a) // 函数体严格模式 → this 是 undefined
}

(function() {
  foo() // 虽然调用位置是非严格模式，但函数体是严格模式
})()
```

### 1.2 隐式绑定（Implicit Binding）

当函数作为对象的**方法**被调用时，`this` 指向该对象：

```javascript
function foo() {
  console.log(this.a)
}

var obj = {
  a: 2,
  foo: foo,
}

obj.foo() // 2（this 指向 obj）
```

**隐式丢失**——这是最常见的 this 问题来源：

```javascript
function foo() {
  console.log(this.a)
}

var obj = {
  a: 2,
  foo: foo,
}

var bar = obj.foo // 只是引用了函数本身
var a = '全局的 a'

bar() // '全局的 a'（默认绑定，不是隐式绑定）
```

**传参时的隐式丢失**：

```javascript
function foo() {
  console.log(this.a)
}

function doFoo(fn) {
  fn() // 调用位置 — 独立函数调用
}

var obj = {
  a: 2,
  foo: foo,
}

var a = '全局的 a'
doFoo(obj.foo) // '全局的 a'（传参时丢失绑定）
```

**回调函数中的隐式丢失**：

```javascript
function foo() {
  console.log(this.a)
}

var obj = {
  a: 2,
  foo: foo,
}

var a = '全局的 a'

setTimeout(obj.foo, 100) // '全局的 a'（回调丢失了 this）

// 修复：bind
setTimeout(obj.foo.bind(obj), 100) // 2
```

### 1.3 显式绑定（Explicit Binding）

通过 `call`、`apply`、`bind` 强制指定 `this`：

```javascript
function foo() {
  console.log(this.a)
}

var obj = {
  a: 2,
}

foo.call(obj) // 2（显式指定 this 为 obj）
foo.apply(obj) // 2
```

**call vs apply 的区别**：

```javascript
function greet(greeting, punctuation) {
  console.log(greeting + ', ' + this.name + punctuation)
}

const person = { name: 'LC' }

greet.call(person, 'Hello', '!') // Hello, LC!
greet.apply(person, ['Hi', '!!']) // Hi, LC!!
// call：参数逐个传递
// apply：参数以数组传递
```

**bind——硬绑定**：

```javascript
function foo() {
  console.log(this.a)
}

var obj = {
  a: 2,
}

// bind 返回一个新函数，this 永久绑定到 obj
var boundFoo = foo.bind(obj)
boundFoo() // 2

// 即使再 call，也无法改变
boundFoo.call({ a: 100 }) // 2（bind 的优先级更高）
```

### 1.4 new 绑定（New Binding）

当函数被 `new` 操作符调用时，`this` 指向新创建的对象：

```javascript
function Foo(a) {
  this.a = a
}

var bar = new Foo(2)
console.log(bar.a) // 2（bar 是新创建的对象）
```

`new` 操作符的执行步骤：

1. 创建一个全新的对象
2. 将这个对象的 `__proto__` 指向构造函数的 `prototype`
3. 将这个对象作为 `this` 绑定到构造函数
4. 如果构造函数没有返回对象，返回这个新对象

---

## 二、绑定优先级

当多种规则同时适用时，优先级如下：

```
new 绑定 > 显式绑定 > 隐式绑定 > 默认绑定
```

### 2.1 显式绑定 vs 隐式绑定

```javascript
function foo() {
  console.log(this.a)
}

var obj1 = { a: 1, foo: foo }
var obj2 = { a: 2, foo: foo }

obj1.foo.call(obj2) // 2（显式绑定胜出）
obj2.foo.apply(obj1) // 1（显式绑定胜出）
```

### 2.2 new 绑定 vs 显式绑定

```javascript
function foo(something) {
  this.a = something
}

var obj1 = {}

var bar = foo.bind(obj1)
bar(2)
console.log(obj1.a) // 2（bind 将 this 永久绑定到 obj1）

var baz = new bar(3)
console.log(obj1.a) // 2（obj1.a 没有被修改）
console.log(baz.a)  // 3（new 绑定创建了新对象，覆盖了 bind）
```

**结论**：`new` 绑定的优先级高于 `bind`。

### 2.3 判断流程

```
判断 this 指向的步骤：

1. 函数被 new 调用？           → this 指向新创建的对象
2. 函数被 call/apply/bind 调用？ → this 指向显式指定的对象
3. 函数作为对象的方法调用？     → this 指向该对象
4. 以上都不是（独立调用）？     → 严格模式：undefined；非严格模式：全局对象
```

---

## 三、箭头函数的 this

**箭头函数没有自己的 this**，它捕获的是**定义时**外层作用域的 this：

```javascript
function foo() {
  // 箭头函数
  setTimeout(() => {
    console.log(this.a) // this 继承自 foo 的 this
  }, 100)
}

function bar() {
  // 普通函数
  setTimeout(function() {
    console.log(this.a)
  }, 100)
}

var obj = { a: 2 }

foo.call(obj) // 2（箭头函数捕获了 foo 的 this）
bar.call(obj) // undefined（回调的 this 指向全局）
```

### 3.1 箭头函数 vs 普通函数

```javascript
const obj = {
  a: 1,
  
  // 普通方法
  normal() {
    console.log(this.a) // 1（this 指向 obj）
    
    function inner() {
      console.log(this.a) // undefined（独立调用，this 为全局）
    }
    inner()
  },
  
  // 箭头方法
  arrow: () => {
    console.log(this.a) // undefined（箭头函数捕获的是定义时的外层 this）
    // 对象的 {} 不能创建作用域，所以这里的 this 是全局的
  },
  
  // 正确使用箭头函数
  correct() {
    const inner = () => {
      console.log(this.a) // 1（继承自 correct 的 this）
    }
    inner()
  },
}

obj.normal()
obj.arrow()
obj.correct()
```

### 3.2 箭头函数不能用作构造函数

```javascript
const Foo = () => {}
new Foo() // ❌ TypeError: Foo is not a constructor
```

---

## 四、bind 的实现原理

理解 `bind` 的底层实现，能帮助理解显式绑定的本质：

```javascript
// 简易版 bind 实现
Function.prototype.myBind = function(context, ...args) {
  const fn = this // 保存原函数

  return function(...innerArgs) {
    // 当返回的函数被调用时，强制 this 指向 context
    return fn.apply(context, [...args, ...innerArgs])
  }
}

// 支持 new 操作的完整版 bind
Function.prototype.myBind = function(context, ...args) {
  const fn = this

  function bound(...innerArgs) {
    // 判断是否通过 new 调用
    return fn.apply(
      this instanceof bound ? this : context,
      [...args, ...innerArgs]
    )
  }

  // 继承原型
  bound.prototype = fn.prototype
  return bound
}
```

---

## 五、综合面试题

```javascript
// 题目1：输出什么？
var length = 10

function fn() {
  console.log(this.length)
}

var obj = {
  length: 5,
  method: function(fn) {
    fn()
    arguments[0]()
  },
}

obj.method(fn, 1)
```

**答案**：`10` 和 `2`

**解析**：
- `fn()`：独立调用 → 全局 this → `this.length = 10`（全局的 length）
- `arguments[0]()`：等价于 `arguments.fn()` → 隐式绑定 → `this` 指向 `arguments` → `arguments.length = 2`（传入两个参数）

```javascript
// 题目2：输出什么？
const user = {
  name: 'LC',
  greet: function() {
    console.log(this.name)
  },
  greetArrow: () => {
    console.log(this.name)
  },
}

user.greet()           // 'LC'
user.greetArrow()      // undefined（箭头函数 this 为全局）

const greet = user.greet
greet()                // undefined（隐式丢失）
```

```javascript
// 题目3：输出什么？
function Person(name) {
  this.name = name
  this.sayName = function() {
    console.log(this.name)
  }
}

const p1 = new Person('LC')
p1.sayName()          // 'LC'

const p2 = p1.sayName
p2()                  // undefined（独立调用，this 为全局/严格模式 undefined）
```

---

## 六、实际开发中的 this 管理

### 6.1 事件处理中的 this

```javascript
class Button {
  constructor(text) {
    this.text = text
    this.count = 0
  }

  // 方案1：arrow function（推荐）
  handleClick = () => {
    this.count++
    console.log(this.text, this.count)
  }

  // 方案2：bind
  handleClickV2() {
    this.count++
    console.log(this.text, this.count)
  }
}

const btn = new Button('Click')
document.getElementById('btn').addEventListener('click', btn.handleClick)
```

### 6.2 Vue/React 中的 this

```javascript
// Vue 3 Composition API 不使用 this
// React 函数组件不使用 this

// 但 class 组件中仍然需要绑定
class MyComponent extends React.Component {
  constructor() {
    this.handleClick = this.handleClick.bind(this)
  }
}
```

---

## 总结

1. **默认绑定**：独立调用，this → 全局（非严格）/ undefined（严格）
2. **隐式绑定**：作为方法调用，this → 调用方法的对象
3. **显式绑定**：call/apply/bind，this → 指定的对象
4. **new 绑定**：new 调用，this → 新创建的对象
5. **优先级**：new > 显式 > 隐式 > 默认
6. **箭头函数**：没有自己的 this，继承定义时外层作用域的 this
7. **绑定丢失**：传参、赋值、回调函数都会导致隐式丢失

> 下一篇将深入 **new 操作符** 的底层实现，理解构造函数和实例的完整创建过程。
