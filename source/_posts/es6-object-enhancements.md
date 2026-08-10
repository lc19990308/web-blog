---
title: "ES6 对象字面量增强与 Object 新方法"
date: 2026-06-25
categories: "ES6"
description: "ES6 对对象字面量做了大量增强：属性简写、计算属性名、方法简写，以及新增的 Object 静态方法：entries、values、fromEntries、assign 等"
tags: ["ES6", "JavaScript"]
copyright: true
---

## 前言

JavaScript 中对象无处不在。ES6+ 从两个方向增强了对象：

1. **对象字面量语法增强** — 写起来更简洁
2. **Object 静态方法** — 操作起来更方便

---

## 一、对象字面量语法增强

### 1.1 属性简写

```javascript
const name = 'LC'
const age = 25

// ES5
const userES5 = { name: name, age: age }

// ES6
const userES6 = { name, age }

// 实用场景：函数返回对象
function createUser(name, age) {
  return { name, age, role: 'user' }
}
```

### 1.2 方法简写

```javascript
// ES5
const objES5 = {
  greet: function() {
    console.log('hello')
  },
}

// ES6
const objES6 = {
  greet() {
    console.log('hello')
  },
  getName() {
    return this.name
  },
}
```

### 1.3 计算属性名

```javascript
// 动态属性名
const key = 'dynamicKey'
const obj = {
  [key]: '动态值',
  [`${key}2`]: '也是动态的',
}

console.log(obj.dynamicKey)  // '动态值'
console.log(obj.dynamicKey2) // '也是动态的'

// 实用场景
const prefix = 'user_'
const users = ['LC', 'AtomCode'].map((name, i) => ({
  [`${prefix}${i + 1}`]: name,
}))
// [{ user_1: 'LC' }, { user_2: 'AtomCode' }]

// Symbol 作为属性名
const id = Symbol('id')
const item = {
  [id]: 12345,
  name: 'item',
}
console.log(item[id]) // 12345
```

### 1.4 完整示例

```javascript
const prefix = 'app'
const version = '1.0.0'
const methods = ['get', 'post']

const config = {
  // 属性简写
  version,

  // 方法简写
  init() {
    console.log(`${this.name} 初始化中...`)
  },

  // 计算属性
  [`${prefix}_name`]: 'MyApp',

  // 计算属性 + 模板
  [`version_${version}`]: true,

  // 动态方法名
  [methods[0]](url) {
    console.log(`GET ${url}`)
  },
  [methods[1]](url) {
    console.log(`POST ${url}`)
  },
}
```

---

## 二、Object.is

`Object.is` 修复了 `===` 的两个边界情况：

```javascript
// === 的"问题"
NaN === NaN   // false
0 === -0      // true

// Object.is 的修正
Object.is(NaN, NaN) // true
Object.is(0, -0)    // false
Object.is(-0, -0)   // true

// 其他情况与 === 一致
Object.is('hello', 'hello') // true
Object.is({}, {})           // false
```

```javascript
// polyfill
if (!Object.is) {
  Object.is = function(x, y) {
    if (x === y) {
      return x !== 0 || 1 / x === 1 / y  // 处理 -0
    }
    return x !== x && y !== y  // 处理 NaN
  }
}
```

---

## 三、Object.assign

`Object.assign` 用于**合并对象**（浅复制）：

```javascript
const target = { a: 1 }
const source1 = { b: 2 }
const source2 = { c: 3 }

Object.assign(target, source1, source2)
console.log(target) // { a: 1, b: 2, c: 3 }
```

### 3.1 常见用途

```javascript
// 1. 复制对象
const original = { x: 1, y: 2 }
const copy = Object.assign({}, original)

// 2. 合并配置
const defaults = { theme: 'light', lang: 'zh', debug: false }
const userConfig = { theme: 'dark' }
const config = Object.assign({}, defaults, userConfig)
// { theme: 'dark', lang: 'zh', debug: false }

// 3. 给对象添加方法
Object.assign(Foo.prototype, {
  methodA() {},
  methodB() {},
})
```

### 3.2 Object.assign 是浅复制

```javascript
const original = {
  name: 'LC',
  address: { city: '北京' },
}

const copy = Object.assign({}, original)

copy.name = 'New'               // 不影响 original（基本类型）
copy.address.city = '上海'      // 影响 original！(共享引用)

console.log(original.address.city) // '上海'
```

**深复制需要递归处理**：

```javascript
function deepAssign(target, ...sources) {
  sources.forEach(source => {
    Object.keys(source).forEach(key => {
      const value = source[key]
      if (value !== null && typeof value === 'object') {
        target[key] = deepAssign(
          Array.isArray(value) ? [] : {},
          target[key] || {},
          value
        )
      } else {
        target[key] = value
      }
    })
  })
  return target
}
```

---

## 四、Object.keys / values / entries

```javascript
const user = {
  name: 'LC',
  age: 25,
  role: 'admin',
}

// ES5 — Object.keys
Object.keys(user)   // ['name', 'age', 'role']

// ES2017 — Object.values
Object.values(user) // ['LC', 25, 'admin']

// ES2017 — Object.entries
Object.entries(user) // [['name', 'LC'], ['age', 25], ['role', 'admin']]
```

### 4.1 entries 的实用场景

```javascript
// 遍历对象
for (const [key, value] of Object.entries(user)) {
  console.log(`${key}: ${value}`)
}

// 对象转 Map
const map = new Map(Object.entries(user))

// 过滤对象属性
const filtered = Object.fromEntries(
  Object.entries(user).filter(([key, value]) => value !== null)
)
```

---

## 五、Object.fromEntries（ES2019）

`fromEntries` 是 `entries` 的逆操作——将键值对数组转回对象：

```javascript
const entries = [
  ['name', 'LC'],
  ['age', 25],
  ['role', 'admin'],
]

const user = Object.fromEntries(entries)
// { name: 'LC', age: 25, role: 'admin' }
```

### 5.1 实用场景

```javascript
// 1. Map 转对象
const map = new Map([['a', 1], ['b', 2]])
const obj = Object.fromEntries(map)
// { a: 1, b: 2 }

// 2. 过滤对象属性
const user = { name: 'LC', age: 25, password: 'secret', email: 'test@test.com' }
const safeUser = Object.fromEntries(
  Object.entries(user).filter(([key]) => key !== 'password')
)
// { name: 'LC', age: 25, email: 'test@test.com' }

// 3. 转换对象值
const prices = { apple: 5, banana: 3, orange: 8 }
const doubled = Object.fromEntries(
  Object.entries(prices).map(([key, value]) => [key, value * 2])
)
// { apple: 10, banana: 6, orange: 16 }
```

---

## 六、Object.getOwnPropertyDescriptors（ES2017）

获取对象属性的完整描述符：

```javascript
const obj = {
  name: 'LC',
  get greeting() {
    return `你好，${this.name}`
  },
}

const descriptors = Object.getOwnPropertyDescriptors(obj)
console.log(descriptors.name)
// { value: 'LC', writable: true, enumerable: true, configurable: true }

console.log(descriptors.greeting)
// { get: [Function], set: undefined, enumerable: true, configurable: true }
```

**为什么要有这个方法？**

```javascript
// ❌ Object.assign 无法正确复制 getter
const clone = Object.assign({}, obj)
clone.name = 'New'
console.log(clone.greeting) // '你好，LC'（不是 '你好，New'！）

// ✅ 正确复制
const correctClone = Object.defineProperties(
  {},
  Object.getOwnPropertyDescriptors(obj)
)
correctClone.name = 'New'
console.log(correctClone.greeting) // '你好，New'
```

---

## 七、Object.defineProperty

```javascript
const obj = {}

Object.defineProperty(obj, 'private', {
  value: 'secret',
  writable: false,     // 不可修改
  enumerable: false,   // 不可枚举
  configurable: false, // 不可删除/重配
})

obj.private = 'new'   // 静默失败（严格模式报错）
console.log(obj.private) // 'secret'
Object.keys(obj)       // []（不包含 private）

// 数据描述符 vs 访问器描述符
Object.defineProperty(obj, 'fullName', {
  get() {
    return `${this.first} ${this.last}`
  },
  set(value) {
    [this.first, this.last] = value.split(' ')
  },
  enumerable: true,
})
```

---

## 八、对象属性枚举顺序

```javascript
const obj = {
  b: 2,
  0: 'zero',
  a: 1,
  2: 'two',
  c: 3,
  1: 'one',
}

// 数字键按升序，字符串键按添加顺序
Object.keys(obj)
// ['0', '1', '2', 'b', 'a', 'c']

// for...in 同样
for (const key in obj) {
  console.log(key) // 0, 1, 2, b, a, c
}

// Object.values / entries 也遵循这个顺序
```

---

## 总结

| 特性 | ES 版本 | 用途 |
|------|---------|------|
| **属性简写** | ES6 | 变量赋值到对象 |
| **方法简写** | ES6 | 定义对象方法 |
| **计算属性名** | ES6 | 动态属性名 |
| `Object.assign` | ES6 | 合并/复制对象（浅） |
| `Object.is` | ES6 | 精确比较（处理 NaN/-0） |
| `Object.values` | ES2017 | 获取对象值数组 |
| `Object.entries` | ES2017 | 获取键值对数组 |
| `Object.fromEntries` | ES2019 | 键值对数组转对象 |
| `Object.getOwnPropertyDescriptors` | ES2017 | 获取属性完整描述符 |
| `Object.defineProperty` | ES5 | 精细控制属性行为 |
