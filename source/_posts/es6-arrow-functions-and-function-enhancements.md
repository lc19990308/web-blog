---
title: "ES6 箭头函数与函数增强：默认参数、剩余参数、箭头函数完全指南"
date: 2026-06-25
categories: "ES6"
description: "深入 ES6 对函数的一系列增强：箭头函数的 this 绑定机制、参数默认值、剩余参数（Rest）、函数名称属性，以及尾调用优化"
tags: ["ES6", "JavaScript"]
copyright: true
---

## 前言

ES6 对函数做了大量增强，让 JavaScript 的函数更简洁、更安全、更强大。

| 特性 | 解决的问题 | ES6 |
|------|-----------|-----|
| 箭头函数 | this 绑定混乱 | ✅ |
| 默认参数 | 手动判断 undefined | ✅ |
| 剩余参数 | arguments 伪数组 | ✅ |
| 尾调用优化 | 调用栈溢出 | ✅ |

---

## 一、箭头函数

### 1.1 语法

```javascript
// 无参数
const f1 = () => 'hello'

// 一个参数（可省略括号）
const f2 = x => x * 2

// 多个参数
const f3 = (a, b) => a + b

// 函数体多条语句
const f4 = (a, b) => {
  const sum = a + b
  return sum
}

// 返回对象字面量（必须加括号）
const f5 = () => ({ name: 'LC', age: 25 })
```

### 1.2 箭头函数没有自己的 this

```javascript
const obj = {
  name: 'LC',
  normal: function() {
    console.log(this.name) // 'LC'（this 指向 obj）
  },
  arrow: () => {
    console.log(this.name) // undefined（this 指向外层作用域）
  },
}

obj.normal()
obj.arrow()
```

**箭头函数的 this 是词法 this**——它从外层作用域捕获 this，不是调用时确定：

```javascript
function Timer() {
  this.seconds = 0

  // ❌ 普通函数的 this 指向全局
  setInterval(function() {
    this.seconds++  // this 不是 Timer 实例
  }, 1000)

  // ✅ 箭头函数捕获外层 this
  setInterval(() => {
    this.seconds++  // this 指向 Timer 实例
  }, 1000)
}
```

### 1.3 箭头函数不能用的场景

```javascript
// ❌ 不能用作构造函数
const Foo = () => {}
new Foo() // TypeError

// ❌ 没有 arguments 对象
const fn = () => {
  console.log(arguments) // ReferenceError
}

// ❌ 不能用作 Generator
const gen =* () => {} // SyntaxError

// ❌ 对象方法（不指向对象）
const obj = {
  name: 'LC',
  greet: () => `${this.name} 你好`, // this 指向外层
}
```

### 1.4 箭头函数 vs 普通函数

| 特性 | 普通函数 | 箭头函数 |
|------|---------|---------|
| this | 调用时确定 | 定义时确定（词法） |
| arguments | 有 | 无 |
| new 调用 | 可以 | 不可以 |
| prototype | 有 | 无 |
| Generator | 可以 | 不可以 |
| 绑定 call/apply/bind | this 可改变 | this 不可改变（无效） |

---

## 二、参数默认值

### 2.1 基础

```javascript
// ES5 的写法
function multiply(a, b) {
  b = typeof b !== 'undefined' ? b : 1
  return a * b
}

// ES6 默认参数
function multiply(a, b = 1) {
  return a * b
}

multiply(5, 2)   // 10
multiply(5)      // 5（b 使用默认值 1）
multiply(5, undefined) // 5（undefined 触发默认值）
multiply(5, null) // 0（null 不会触发默认值！）
```

### 2.2 参数默认值的 Lazy Evaluation

```javascript
// 默认值表达式只在需要时计算
function foo(x = console.log('计算默认值')) {
  return x
}

foo(1)    // 不输出（有传参）
foo()     // 输出 '计算默认值'（使用默认值）
```

### 2.3 默认值可以引用前面的参数

```javascript
function buildUser(name, role = 'user', greeting = `你好，${name}`) {
  return { name, role, greeting }
}

buildUser('LC')              // { name: 'LC', role: 'user', greeting: '你好，LC' }
buildUser('Admin', 'admin')  // { name: 'Admin', role: 'admin', greeting: '你好，Admin' }
```

### 2.4 默认值 + 解构

```javascript
// 函数参数解构 + 默认值
function fetchUser({
  id = 0,
  name = '匿名',
  email = '',
} = {}) {  // 整个参数对象也有默认值
  console.log(id, name, email)
}

fetchUser({ id: 1, name: 'LC' })      // 1, 'LC', ''
fetchUser()                              // 0, '匿名', ''（空对象默认值）
```

---

## 三、剩余参数（Rest Parameters）

### 3.1 基础

```javascript
// ES5 用 arguments
function sumES5() {
  var args = Array.prototype.slice.call(arguments)
  return args.reduce((a, b) => a + b, 0)
}

// ES6 用剩余参数
function sumES6(...numbers) {
  return numbers.reduce((a, b) => a + b, 0)
}

sumES6(1, 2, 3, 4, 5) // 15
```

### 3.2 与普通参数混合

```javascript
function log(level, ...messages) {
  const prefix = `[${level.toUpperCase()}]`
  messages.forEach(msg => console.log(prefix, msg))
}

log('info', '服务器启动', '端口 3000')
// [INFO] 服务器启动
// [INFO] 端口 3000
```

### 3.3 剩余参数 vs arguments

| 特性 | arguments | 剩余参数 |
|------|-----------|---------|
| 类型 | 类数组（不是数组） | 真正的数组 |
| 包含 | 所有参数 | 未命名的参数 |
| 箭头函数 | 不可用 | 可用 |
| 默认参数 | 不可见默认值 | 可见 |

```javascript
function test(a, b = 1, ...rest) {
  console.log(arguments.length) // 传参个数
  console.log(rest.length)      // 剩余参数个数
  console.log(rest instanceof Array) // true
}
```

---

## 四、展开运算符（Spread Operator）

```javascript
// 数组展开
const arr1 = [1, 2, 3]
const arr2 = [4, 5, 6]
const merged = [...arr1, ...arr2] // [1, 2, 3, 4, 5, 6]

// 复制数组（浅复制）
const copy = [...arr1]

// 字符串展开
const chars = [...'hello']
console.log(chars) // ['h', 'e', 'l', 'l', 'o']

// 对象展开（ES2018）
const base = { x: 1, y: 2 }
const extended = { ...base, z: 3 } // { x: 1, y: 2, z: 3 }

// 函数调用
const nums = [1, 2, 3]
Math.max(...nums) // 3
```

---

## 五、函数名称属性

```javascript
// 函数声明
function foo() {}
foo.name // 'foo'

// 变量赋值函数表达式
const bar = function() {}
bar.name // 'bar'

// 命名函数表达式
const baz = function myName() {}
baz.name // 'myName'

// 箭头函数
const fn = () => {}
fn.name // 'fn'

// 对象方法
const obj = {
  method() {},
  get getter() {},
  set setter(v) {},
}
obj.method.name // 'method'

// class
class MyClass {}
MyClass.name // 'MyClass'
```

---

## 六、尾调用优化（TCO）

```javascript
// 尾调用：函数的最后一步是调用另一个函数
function foo(x) {
  return bar(x)  // 尾调用
}

// 不是尾调用
function foo(x) {
  const y = bar(x)  // 调用后还有操作
  return y
}

function foo(x) {
  return bar(x) + 1  // 调用后还有加法
}
```

**TCO 的作用**——优化递归时不会栈溢出：

```javascript
// ❌ 普通递归（每次调用都增加栈帧）
function factorial(n) {
  if (n <= 1) return 1
  return n * factorial(n - 1)  // 不是尾调用（n * 是额外操作）
}

factorial(100000) // RangeError: Maximum call stack size exceeded

// ✅ 尾递归优化（只保留一个栈帧）
function factorial(n, acc = 1) {
  if (n <= 1) return acc
  return factorial(n - 1, n * acc)  // 尾调用
}

factorial(100000) // 如果引擎支持 TCO，不会栈溢出
```

**注意**：目前只有 Safari 实现了 TCO。V8 引擎（Chrome/Node）没有实现，所以不要在生产环境依赖它。

---

## 总结

| ES6 函数特性 | 作用 | 建议 |
|-------------|------|------|
| **箭头函数** | 词法 this，简洁语法 | 内联回调优先用，对象方法不用 |
| **参数默认值** | 代替手动 undefined 判断 | 推荐在所有可选参数使用 |
| **剩余参数** | 替代 arguments | 推荐使用（真正的数组） |
| **展开运算符** | 复制/合并数组/对象 | 推荐使用 |
| **函数名属性** | 调试友好 | 自动获取 |
| **尾调用优化** | 优化递归 | 仅 Safari 支持，谨慎使用 |
