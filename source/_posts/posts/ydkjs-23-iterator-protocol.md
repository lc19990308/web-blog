---
title: "你不知道的JavaScript（二十三）：迭代器协议与可迭代对象——深入理解 Symbol.iterator"
date: 2026-06-27
categories: "你不知道的javascript"
description: "从迭代器协议到可迭代协议，从内置可迭代对象到自定义迭代器，深入理解 for...of、展开运算符、解构赋值背后的统一接口"
tags: ["你不知道的javascript", "JavaScript", "ES6"]
copyright: true
---

## 前言

`for...of`、展开运算符 `...` 、解构赋值——你可能每天都在用。但你知道它们背后的**统一接口**是什么吗？

> 所有可迭代的操作，都依赖于同一个协议：**迭代器协议（Iterator Protocol）**。

---

## 一、两个核心协议

### 1.1 可迭代协议（Iterable Protocol）

一个对象要成为**可迭代的**，必须实现 `Symbol.iterator` 方法，该方法返回一个迭代器：

```js
const iterable = {
  [Symbol.iterator]() {
    // 返回一个迭代器
    return { next() { /* ... */ } }
  }
}
```

### 1.2 迭代器协议（Iterator Protocol）

迭代器是一个具有 `next()` 方法的对象，该方法返回：

```js
{
  value: any,      // 当前迭代的值
  done: boolean    // 是否迭代完成
}
```

**使用迭代器：**

```js
const iterator = [1, 2, 3][Symbol.iterator]()

iterator.next() // { value: 1, done: false }
iterator.next() // { value: 2, done: false }
iterator.next() // { value: 3, done: false }
iterator.next() // { value: undefined, done: true }
```

> **理解 this：** `for...of` 的本质就是一个反复调用 `next()` 的语法糖。

---

## 二、内置的可迭代对象

```js
// 1. 数组 —— 最常用的可迭代对象
for (const char of ['a', 'b']) { }

// 2. 字符串 —— 按字符迭代
for (const char of 'hello') { } // 'h', 'e', 'l', 'l', 'o'

// 3. Set —— 按插入顺序迭代
for (const item of new Set([1, 2, 3])) { }

// 4. Map —— 迭代 [key, value] 对
for (const [key, value] of new Map([['a', 1]])) { }

// 5. arguments —— 类数组对象
function foo() {
  for (const arg of arguments) { }
}

// 6. DOM 集合
for (const el of document.querySelectorAll('div')) { }
```

**注意：** 普通对象 `{}` **不是**可迭代的！

```js
const obj = { a: 1, b: 2 }
for (const item of obj) { } // ❌ TypeError: obj is not iterable
```

---

## 三、创建自定义迭代器

### 3.1 手动实现

```js
class Range {
  constructor(start, end) {
    this.start = start
    this.end = end
  }

  [Symbol.iterator]() {
    let current = this.start
    const end = this.end

    return {
      next() {
        if (current <= end) {
          return { value: current++, done: false }
        }
        return { value: undefined, done: true }
      }
    }
  }
}

for (const n of new Range(1, 5)) {
  console.log(n) // 1, 2, 3, 4, 5
}
```

### 3.2 使用生成器（Generator）

```js
class Range {
  constructor(start, end) {
    this.start = start
    this.end = end
  }

  *[Symbol.iterator]() {
    for (let i = this.start; i <= this.end; i++) {
      yield i
    }
  }
}
```

**生成器是语法糖——** `function*` 自动返回一个符合迭代器协议的对象。

### 3.3 无限迭代器

```js
function* fibonacci() {
  let a = 0, b = 1
  while (true) {
    yield a
    ;[a, b] = [b, a + b]
  }
}

const fib = fibonacci()
fib.next() // { value: 0 }
fib.next() // { value: 1 }
fib.next() // { value: 1 }
fib.next() // { value: 2 }
```

---

## 四、消费可迭代对象的语法

```js
const arr = [1, 2, 3]

// 1. for...of
for (const item of arr) { }

// 2. 展开运算符
const copy = [...arr]

// 3. 解构赋值
const [first, second] = arr

// 4. Array.from
const fromArr = Array.from(arr)

// 5. Promise.all / Promise.race
Promise.all(arr.map(x => Promise.resolve(x)))
// 注意：Promise.all 等接收的是可迭代对象（不仅是数组）

// 6. Map/Set 构造函数
new Set(arr)
new Map([[1, 'a']])
```

**展开运算符的原理：**

```js
const arr = [1, 2, 3]
const copy = [...arr]

// 等价于：
const iterator = arr[Symbol.iterator]()
const copy = []
let result
while (!(result = iterator.next()).done) {
  copy.push(result.value)
}
```

---

## 五、可迭代对象的惰性求值

```js
// 不是一次性生成所有值，而是按需生成
function* lazyRange(start, end) {
  console.log(`开始迭代: ${start}`)
  for (let i = start; i <= end; i++) {
    console.log(`生成: ${i}`)
    yield i
  }
}

const range = lazyRange(1, 3)
console.log('创建完成')
// 输出：创建完成  ← 还没有执行任何代码！

range.next()
// 输出：开始迭代: 1
// 输出：生成: 1

range.next()
// 输出：生成: 2

range.next()
// 输出：生成: 3
```

**在大数据处理中的意义：** 你可以表示一个无限集合（如前文的斐波那契数列），只计算当前需要的部分。

---

## 六、Iterator Helper（ES2025）

ES2025 引入了链式操作迭代器的方法：

```js
function* naturals() {
  let i = 1
  while (true) yield i++
}

const result = naturals()
  .filter(x => x % 2 === 0)      // 偶数
  .map(x => x * 2)                // 翻倍
  .take(10)                       // 取前 10 个
  .toArray()                      // 转为数组

console.log(result) // [4, 8, 12, 20, 24, 28, 36, 40, 44, 52]
```

**优势：** 无需先生成中间数组，全程惰性求值，对内存友好。

---

## 七、总结

```
for...of / ... / 解构 / Array.from
          ↓
   可迭代对象（[Symbol.iterator]）
          ↓
   迭代器对象（{ next() }）
          ↓
    Generator（语法糖）
```

迭代器协议是 ES6 给 JavaScript 带来的最重要的基础设施之一，它让数据消费的方式变得**统一且可组合**。理解它，你才能真正掌握 `for...of`、展开运算符和生成器。
