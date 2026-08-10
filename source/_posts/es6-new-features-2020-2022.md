---
title: "ES2020-ES2022 新特性：可选链、空值合并、逻辑赋值、globalThis"
date: 2026-06-25
categories: "ES6"
description: "全面梳理 ES2020～ES2022 的实用新特性：可选链（?.）、空值合并（??）、逻辑赋值（&&=/??=）、Promise 新方法、数字分隔符、globalThis、Top-level await"
tags: ["ES6", "JavaScript"]
copyright: true
---

## 前言

ES6 之后，JavaScript 每年发布一个新版本。近年来的 ES2020～ES2022 虽然没有 ES6 那么大，但每个版本都引入了一些"每天都在用"的特性。

---

## 一、ES2020 新特性

### 1.1 可选链（Optional Chaining）?.

解决深层对象属性访问时的"cannot read property of undefined"问题：

```javascript
// 嵌套对象访问
const user = {
  profile: {
    // address 不存在
  },
}

// ES5/ES6 —— 需要每层判断
const city = user && user.profile && user.profile.address && user.profile.address.city

// ES2020 —— 可选链
const city = user?.profile?.address?.city
// 如果中间有 null/undefined，直接返回 undefined，不报错
```

**可选链的其他用法**：

```javascript
// 函数可选调用
const result = obj.method?.()
// obj.method 存在才调用，不存在返回 undefined

// 动态属性访问
const key = 'someKey'
const value = obj?.[key]

// 数组索引
const first = arr?.[0]

// 与 nullish 合并配合
const city = user?.profile?.address?.city ?? '未知城市'
```

### 1.2 空值合并（Nullish Coalescing）??

`??` 只在值为 `null` 或 `undefined` 时返回右侧值：

```javascript
// ❌ || 的问题：0、''、false 都被视为"假"
const count = 0 || 10      // 10（但 0 是合法值！）
const name = '' || '默认'  // '默认'（空字符串是合法值！）

// ✅ ?? 只对 null/undefined 生效
const count = 0 ?? 10      // 0 ✅
const name = '' ?? '默认'  // '' ✅
const value = null ?? '默认' // '默认'
const value2 = undefined ?? '默认' // '默认'
```

**?? 不能与 && 或 || 混用**：

```javascript
// ❌ 语法错误
const x = a ?? b || c

// ✅ 必须加括号
const x = (a ?? b) || c
const y = a ?? (b || c)
```

### 1.3 数字分隔符

```javascript
// 提高大数字的可读性
const billion = 1_000_000_000    // 10 亿
const million = 1_000_000        // 100 万
const price = 99_99              // 99.99
const binary = 0b1010_0001       // 二进制
const hex = 0xFF_FF_FF_FF       // 十六进制
const bigint = 1_000_000_000n    // BigInt

// 不影响数值本身
console.log(1_000_000 === 1000000) // true
```

### 1.4 globalThis

统一访问全局对象的方式：

```javascript
// 不同环境的全局对象
// 浏览器：window
// Node.js：global
// Web Worker：self

// ES2020 —— 统一为 globalThis
console.log(globalThis)  // 任何环境中都指向全局对象

// polyfill
const getGlobal = function() {
  if (typeof globalThis !== 'undefined') return globalThis
  if (typeof window !== 'undefined') return window
  if (typeof global !== 'undefined') return global
  if (typeof self !== 'undefined') return self
  throw new Error('无法确定全局对象')
}
```

### 1.5 Promise.allSettled

```javascript
// Promise.all 有一个失败就整体失败
// Promise.allSettled 等待所有完成，无论成功还是失败

const promises = [
  fetch('/api/users').then(r => r.json()),
  fetch('/api/posts').then(r => r.json()),
  fetch('/api/fail'),  // 这个会失败
]

// Promise.all 快速失败
Promise.all(promises).catch(err => {
  // 只要一个失败就触发
})

// Promise.allSettled 全部完成
const results = await Promise.allSettled(promises)

results.forEach(result => {
  if (result.status === 'fulfilled') {
    console.log('成功:', result.value)
  } else {
    console.log('失败:', result.reason)
  }
})
```

### 1.6 String.prototype.matchAll

```javascript
const str = '颜色: red, green, blue'
const regex = /(\w+)/g

// ES5 —— 循环调用 exec
let match
const results1 = []
while ((match = regex.exec(str)) !== null) {
  results1.push(match[1])
}

// ES2020 —— matchAll
const results2 = [...str.matchAll(regex)].map(m => m[1])

console.log(results2) // ['颜色', 'red', 'green', 'blue']
```

### 1.7 import() 动态导入

```javascript
// 静态导入
import { format } from './formatter.js'

// 动态导入（返回 Promise）
const module = await import('./formatter.js')
module.format(data)

// 按需加载
button.addEventListener('click', async () => {
  const { showToast } = await import('./toast.js')
  showToast('加载完成')
})
```

---

## 二、ES2021 新特性

### 2.1 逻辑赋值运算符

```javascript
// ||= —— 仅在左值为 falsy 时赋值
let x = 0
x ||= 10  // x = 10（0 是 falsy）
// 等价于 x = x || 10

let y = 5
y ||= 10  // y = 5（5 是 truthy，不赋值）

// &&= —— 仅在左值为 truthy 时赋值
let a = 1
a &&= 10  // a = 10
let b = 0
b &&= 10  // b = 0（0 是 falsy，不赋值）

// ??= —— 仅在左值为 null/undefined 时赋值
let config = { timeout: null, retry: 0 }
config.timeout ??= 3000  // timeout: 3000（null 被覆盖）
config.retry ??= 3       // retry: 0（0 不被覆盖 ✅）
```

### 2.2 Promise.any

```javascript
const promises = [
  fetch('/api/server1'),
  fetch('/api/server2'),
  fetch('/api/server3'),
]

// 返回第一个成功的
Promise.any(promises)
  .then(result => console.log('至少一个服务器可用:', result))
  .catch(err => {
    // 全部失败时，返回 AggregateError
    console.log('所有服务器都不可用')
    console.log(err.errors) // 所有失败原因
  })
```

### 2.3 String.prototype.replaceAll

```javascript
const str = 'hello world, hello everyone'

// ES5/ES6 —— 替换全部需要正则
str.replace(/hello/g, 'hi')

// ES2021 —— replaceAll
str.replaceAll('hello', 'hi')
// 'hi world, hi everyone'
```

### 2.4 弱引用（WeakRef）

```javascript
// WeakRef 创建对象的弱引用（不阻止 GC）
let obj = { data: 'large data' }
const ref = new WeakRef(obj)

// 读取时检查是否被 GC
const value = ref.deref()
if (value) {
  console.log('对象还在:', value.data)
} else {
  console.log('对象已被 GC')
}
```

---

## 三、ES2022 新特性

### 3.1 类的静态块

```javascript
class Config {
  static apiUrl
  static timeout

  // 静态初始化块（在类定义时执行）
  static {
    const env = process.env.NODE_ENV || 'development'
    if (env === 'production') {
      this.apiUrl = 'https://api.example.com'
      this.timeout = 5000
    } else {
      this.apiUrl = 'http://localhost:3000'
      this.timeout = 30000
    }
  }
}
```

### 3.2 类的私有属性/方法

```javascript
class User {
  #password        // 私有属性
  #token           // 私有属性

  constructor(name, password) {
    this.name = name
    this.#password = password
    this.#token = this.#generateToken()
  }

  // 私有方法
  #generateToken() {
    return `${this.name}_${Date.now()}`
  }

  // 公开方法访问私有
  authenticate(input) {
    return input === this.#password
  }

  getToken() {
    return this.#token
  }
}

const user = new User('LC', 'secret123')
console.log(user.name)          // 'LC'
console.log(user.#password)     // ❌ SyntaxError（私有）
console.log(user.#token)        // ❌ SyntaxError
console.log(user.authenticate('secret123')) // true
```

### 3.3 await 在模块顶层

```javascript
// 以前：await 只能在 async 函数中
async function loadConfig() {
  const config = await fetch('/config.json')
  return config.json()
}

// ES2022：模块顶层可以直接 await
// config-loader.js
const config = await fetch('/config.json').then(r => r.json())
export default config

// 使用
import config from './config-loader.js'
console.log(config.apiUrl)
```

### 3.4 Array 的 at 方法

```javascript
const arr = [10, 20, 30, 40, 50]

// ES5 —— 取最后一个元素
arr[arr.length - 1]   // 50

// ES2022 —— at 支持负数索引
arr.at(-1)   // 50（最后一个）
arr.at(-2)   // 40（倒数第二个）
arr.at(0)    // 10（第一个）
arr.at(2)    // 30

// 字符串也支持
'hello'.at(-1) // 'o'
```

### 3.5 Object.hasOwn

```javascript
const obj = { name: 'LC' }

// ES5 —— hasOwnProperty
Object.prototype.hasOwnProperty.call(obj, 'name') // true

// ES2022 —— Object.hasOwn（更简洁）
Object.hasOwn(obj, 'name') // true
Object.hasOwn(obj, 'toString') // false（原型上的）
```

---

## 四、版本特性速查

| 版本 | 新特性 |
|------|--------|
| **ES2020** | 可选链 `?.`、空值合并 `??`、globalThis、Promise.allSettled、import()、数字分隔符 `_`、matchAll |
| **ES2021** | 逻辑赋值 `&&=/\|\|=/\?\?=`、Promise.any、replaceAll、WeakRef |
| **ES2022** | 类私有字段 `#`、静态块 `static {}`、顶层 await、Array.at、Object.hasOwn |
| **ES2023** | Array.findLast、Hashbang Grammar |
| **ES2024** | Promise.withResolvers、正则 v 标志 |

---

## 总结

```javascript
// 这些 ES2020-2022 特性在实际项目中每天都会用到

// 1. 可选链 + 空值合并（最常用）
const city = user?.profile?.address?.city ?? '未知'

// 2. 逻辑赋值
config.timeout ??= 5000
user.name &&= sanitize(user.name)

// 3. 数字分隔符
const TIMEOUT = 5_000
const FILE_LIMIT = 1_000_000_000

// 4. 模块顶层 await
const db = await connectDB()
export default db

// 5. Array.at
const last = arr.at(-1)

// 6. 类私有
class Service {
  #apiKey = 'secret'
  #callApi() {}
}
```

> 这些新特性不需要全部记住——知道它们存在就行。遇到问题时翻一下，你会发现很多以前需要"技巧"解决的问题现在有原生方案了。
