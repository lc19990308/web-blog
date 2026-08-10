---
title: "ES6 解构赋值与展开运算符完全指南"
date: 2024-11-08
categories: "ES6"
description: "ES6 解构赋值和展开运算符是日常开发中最高频使用的语法。本文从数组/对象解构到嵌套解构、默认值、剩余模式，以及展开运算符的 8 个实用场景"
tags: "ES6"
copyright: true
---

## 前言

解构赋值和展开运算符是 ES6 中最实用的语法糖。它们让提取数据和合并数据变得极其简洁。

---

## 一、数组解构

```javascript
// 基础解构
const [a, b, c] = [1, 2, 3]
console.log(a, b, c) // 1 2 3

// 跳过元素
const [first, , third] = [1, 2, 3, 4]
console.log(first, third) // 1 3

// 剩余模式
const [head, ...tail] = [1, 2, 3, 4, 5]
console.log(head) // 1
console.log(tail) // [2, 3, 4, 5]

// 默认值
const [x = 10, y = 20] = [1]
console.log(x, y) // 1 20

// 交换变量（经典用法）
let m = 1, n = 2
;[m, n] = [n, m]
console.log(m, n) // 2 1
```

---

## 二、对象解构

```javascript
const user = { name: '张三', age: 25, email: 'test@test.com' }

// 基本解构
const { name, age } = user
console.log(name, age) // '张三' 25

// 重命名
const { name: userName, age: userAge } = user
console.log(userName) // '张三'

// 默认值
const { role = 'user' } = user
console.log(role) // 'user'

// 嵌套解构
const data = { info: { address: { city: '北京' } } }
const { info: { address: { city } } } = data
console.log(city) // '北京'
```

---

## 三、函数参数解构

```javascript
// 解构参数（最常用的场景）
function createUser({ name, age = 18, role = 'user' }) {
  console.log(`${name}(${age}) - ${role}`)
}

createUser({ name: '张三' })
// 张三(18) - user

// 配置对象参数
function fetchData({ url, method = 'GET', params = {}, headers = {} }) {
  // ...
}
```

---

## 四、展开运算符（`...`）

```javascript
// 1. 合并数组
const arr1 = [1, 2], arr2 = [3, 4]
const merged = [...arr1, ...arr2] // [1, 2, 3, 4]

// 2. 复制数组（浅拷贝）
const copy = [...arr1]

// 3. 合并对象
const obj1 = { a: 1 }, obj2 = { b: 2 }
const combined = { ...obj1, ...obj2 } // { a: 1, b: 2 }

// 4. 覆盖默认配置
const defaults = { theme: 'light', lang: 'zh', pageSize: 10 }
const userConfig = { theme: 'dark' }
const config = { ...defaults, ...userConfig }
// { theme: 'dark', lang: 'zh', pageSize: 10 }

// 5. 函数参数展开
const nums = [3, 1, 4, 1, 5]
Math.max(...nums) // 5

// 6. 字符串转数组
const chars = [...'hello'] // ['h', 'e', 'l', 'l', 'o']

// 7. 去除数组重复
const unique = [...new Set([1, 2, 2, 3])] // [1, 2, 3]

// 8. 剩余参数
function sum(...args) {
  return args.reduce((a, b) => a + b, 0)
}
sum(1, 2, 3) // 6
```

---

## 五、常见坑点

```javascript
// 1. 对象展开是浅拷贝
const original = { nested: { a: 1 } }
const clone = { ...original }
clone.nested.a = 2
console.log(original.nested.a) // 2（被修改了！）

// 2. 解构 undefined 会报错
const { foo } = undefined  // TypeError!
// 安全做法：默认值兜底
const { foo } = obj || {}

// 3. 不要解构 null
const { bar } = null  // TypeError!
const safe = null || {}
const { bar } = safe  // undefined（安全）
```

---

**推荐阅读：** [MDN: Destructuring assignment](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)
