---
title: "你不知道的JavaScript（二十）：元编程——Symbol、Proxy、Reflect 的高级用法"
date: 2026-06-26
categories: "你不知道的javascript"
description: "深入 JavaScript 元编程（Metaprogramming）机制，理解 Symbol 的内置符号、Proxy 的拦截陷阱、Reflect 的反射方法，以及如何在框架开发中应用它们"
tags: ["你不知道的javascript", "JavaScript", "ES6"]
copyright: true
---

## 前言

元编程（Metaprogramming）是指**编写能够操作程序自身的程序**。

JavaScript 的元编程能力主要体现在三个特性中：

1. **Symbol** — 定义内置行为的"符号键"
2. **Proxy** — 拦截对象的底层操作
3. **Reflect** — 执行对象的底层操作

理解这三个特性，你就掌握了 JavaScript 框架底层（Vue 3 的响应式、Polyfill、ORM 等）的核心原理。

---

## 一、Symbol 内置符号

### 1.1 Symbol.species

控制"衍生对象"的构造函数：

```javascript
// 默认行为：map 返回当前类的实例
class MyArray extends Array {}
const a = new MyArray(1, 2, 3)
const b = a.map(x => x * 2)
console.log(b instanceof MyArray) // true

// 通过 Symbol.species 改变
class MyArray extends Array {
  static get [Symbol.species]() {
    return Array // map/filter 返回普通 Array
  }
}

const c = new MyArray(1, 2, 3)
const d = c.map(x => x * 2)
console.log(d instanceof MyArray) // false
console.log(d instanceof Array)   // true
```

### 1.2 Symbol.toPrimitive

控制对象转原始类型时的行为：

```javascript
const counter = {
  count: 0,
  [Symbol.toPrimitive](hint) {
    if (hint === 'string') {
      return `计数: ${this.count}`
    }
    return this.count
  },
}

counter.count = 10
console.log(String(counter)) // '计数: 10'
console.log(+counter)        // 10
console.log(counter + 1)     // 11
```

### 1.3 Symbol.toStringTag

自定义 `Object.prototype.toString` 的输出：

```javascript
class CustomArray {
  get [Symbol.toStringTag]() {
    return 'CustomArray'
  }
}

const arr = new CustomArray()
Object.prototype.toString.call(arr)
// '[object CustomArray]'
```

### 1.4 Symbol.iterator

让对象可迭代：

```javascript
const range = {
  from: 1,
  to: 5,
  [Symbol.iterator]() {
    let current = this.from
    const end = this.to
    return {
      next() {
        if (current <= end) {
          return { value: current++, done: false }
        }
        return { value: undefined, done: true }
      },
    }
  },
}

for (const n of range) { console.log(n) } // 1 2 3 4 5
console.log([...range]) // [1, 2, 3, 4, 5]
```

### 1.5 Symbol.hasInstance

自定义 instanceof 的行为：

```javascript
class Range {
  static [Symbol.hasInstance](instance) {
    return instance >= this.from && instance <= this.to
  }

  static from = 0
  static to = 100
}

console.log(50 instanceof Range)   // true
console.log(200 instanceof Range)  // false
```

### 1.6 Symbol.match / Symbol.replace

自定义字符串匹配行为：

```javascript
class StartsWith {
  constructor(str) {
    this.str = str
  }

  [Symbol.match](target) {
    return target.startsWith(this.str)
  }

  [Symbol.replace](target, replacement) {
    return target.replace(this.str, replacement)
  }
}

'hello world'.match(new StartsWith('hello')) // true
'hello world'.replace(new StartsWith('hello'), 'hi') // 'hi world'
```

---

## 二、Proxy（代理）

Proxy 可以**拦截**对象的底层操作。它创建了一个"代理对象"，所有对代理对象的操作都会先经过**拦截器**：

### 2.1 Proxy 的基础

```javascript
const target = { name: 'LC' }

const handler = {
  // 拦截属性读取
  get(target, key, receiver) {
    console.log(`读取属性: ${String(key)}`)
    return Reflect.get(target, key, receiver)
  },

  // 拦截属性设置
  set(target, key, value, receiver) {
    console.log(`设置属性: ${String(key)} = ${value}`)
    return Reflect.set(target, key, value, receiver)
  },

  // 拦截 in 操作符
  has(target, key) {
    console.log(`检查属性: ${String(key)}`)
    return key in target
  },

  // 拦截 delete
  deleteProperty(target, key) {
    console.log(`删除属性: ${String(key)}`)
    return delete target[key]
  },
}

const proxy = new Proxy(target, handler)

proxy.name         // 读取属性: name
proxy.name = 'New' // 设置属性: name = New
'name' in proxy    // 检查属性: name
delete proxy.name  // 删除属性: name
```

### 2.2 13 种拦截陷阱

| 陷阱 | 拦截的操作 |
|------|-----------|
| `get(target, key)` | 读取属性值 |
| `set(target, key, value)` | 设置属性值 |
| `has(target, key)` | `in` 操作符 |
| `deleteProperty(target, key)` | `delete` 操作符 |
| `ownKeys(target)` | `Object.keys()`、`for...in` |
| `getOwnPropertyDescriptor(target, key)` | `Object.getOwnPropertyDescriptor()` |
| `defineProperty(target, key, desc)` | `Object.defineProperty()` |
| `preventExtensions(target)` | `Object.preventExtensions()` |
| `isExtensible(target)` | `Object.isExtensible()` |
| `getPrototypeOf(target)` | `Object.getPrototypeOf()` |
| `setPrototypeOf(target, proto)` | `Object.setPrototypeOf()` |
| `apply(target, thisArg, args)` | 函数调用 `()` |
| `construct(target, args)` | `new` 操作符 |

### 2.3 实战：响应式系统

```javascript
// 一个微型响应式系统
function reactive(target) {
  const subscribers = new Map()

  const handler = {
    get(obj, key, receiver) {
      // 依赖收集
      if (activeEffect) {
        if (!subscribers.has(key)) {
          subscribers.set(key, new Set())
        }
        subscribers.get(key).add(activeEffect)
      }
      return Reflect.get(obj, key, receiver)
    },

    set(obj, key, value, receiver) {
      const oldValue = obj[key]
      const result = Reflect.set(obj, key, value, receiver)

      // 派发更新
      if (oldValue !== value && subscribers.has(key)) {
        subscribers.get(key).forEach(fn => fn())
      }

      return result
    },
  }

  return new Proxy(target, handler)
}

// 使用
let activeEffect = null

function watchEffect(fn) {
  activeEffect = fn
  fn() // 执行时触发依赖收集
  activeEffect = null
}

const state = reactive({ count: 0, name: 'LC' })

watchEffect(() => {
  console.log(`count 变化了: ${state.count}`)
})

state.count++ // 输出: count 变化了: 1
state.count = 10 // 输出: count 变化了: 10
state.name = 'New' // 不输出（没有依赖 name）
```

### 2.4 实战：安全的对象访问

```javascript
// 避免读取深层属性时报错
function safe(obj) {
  return new Proxy(obj, {
    get(target, key) {
      if (key in target) {
        const value = Reflect.get(target, key)
        return value !== null && typeof value === 'object'
          ? safe(value)
          : value
      }
      return safe({}) // 返回安全的空对象
    },
  })
}

const data = safe({ user: { profile: { name: 'LC' } } })

console.log(data.user.profile.name)     // 'LC'
console.log(data.user.profile.address)  // 没有报错！返回 safe 对象
console.log(data.user.profile.address.street) // 仍然没有报错！

// 访问不存在的值，最后用 toJSON 拿到 undefined
// 相当于可选链：data?.user?.profile?.address?.street
```

### 2.5 实战：隐藏私有属性

```javascript
function hidePrivate(obj) {
  return new Proxy(obj, {
    get(target, key) {
      if (key.startsWith('_')) {
        throw new Error(`不能访问私有属性 ${String(key)}`)
      }
      return Reflect.get(target, key)
    },

    set(target, key, value) {
      if (key.startsWith('_')) {
        throw new Error(`不能修改私有属性 ${String(key)}`)
      }
      return Reflect.set(target, key, value)
    },

    ownKeys(target) {
      return Reflect.ownKeys(target).filter(k => !String(k).startsWith('_'))
    },
  })
}

const user = hidePrivate({
  name: 'LC',
  _password: 'secret123',
})

console.log(user.name)       // 'LC'
console.log(user._password)  // ❌ Error
user._password = 'new'       // ❌ Error
Object.keys(user)            // ['name']（私有属性被隐藏了）
```

---

## 三、Reflect（反射）

### 3.1 Reflect 与 Proxy 的关系

**Proxy 的每个拦截陷阱在 Reflect 中都有对应的方法**：

```javascript
const obj = { a: 1 }

// Proxy 拦截
const proxy = new Proxy(obj, {
  get(target, key, receiver) {
    return Reflect.get(target, key, receiver)
  },
  set(target, key, value, receiver) {
    return Reflect.set(target, key, value, receiver)
  },
})
```

### 3.2 Reflect 优于传统操作的理由

```javascript
const obj = {
  a: 1,
  get value() {
    return this._value
  },
  set value(v) {
    this._value = v
  },
}

// ❌ 传统方式：this 可能指向错误
const value = obj.value

// ✅ Reflect：可以指定 receiver（this 指向）
const receiver = {}
Reflect.get(obj, 'value', receiver) // this → receiver
```

### 3.3 Reflect 的主要方法

```javascript
// 判断
Reflect.has(obj, key)        // → key in obj
Reflect.isExtensible(obj)     // 是否可扩展
Reflect.ownKeys(obj)          // 自身所有键（包括 Symbol）

// 读取/写入
Reflect.get(obj, key)         // → obj[key]
Reflect.set(obj, key, value)  // → obj[key] = value

// 定义属性
Reflect.defineProperty(obj, key, descriptor)
Reflect.getOwnPropertyDescriptor(obj, key)
Reflect.deleteProperty(obj, key) // → delete obj[key]

// 原型
Reflect.getPrototypeOf(obj)
Reflect.setPrototypeOf(obj, proto)

// 函数
Reflect.apply(fn, thisArg, args)  // → fn.apply(thisArg, args)
Reflect.construct(Fn, args)       // → new Fn(...args)
```

---

## 四、综合实战：构建验证库

```javascript
function validate(obj, schema) {
  return new Proxy(obj, {
    set(target, key, value) {
      const validator = schema[key]
      if (validator && !validator(value)) {
        throw new TypeError(`属性 ${String(key)} 的值 ${value} 校验失败`)
      }
      return Reflect.set(target, key, value)
    },

    defineProperty(target, key, descriptor) {
      if (descriptor.value !== undefined) {
        const validator = schema[key]
        if (validator && !validator(descriptor.value)) {
          throw new TypeError(`属性 ${String(key)} 的值 ${descriptor.value} 校验失败`)
        }
      }
      return Reflect.defineProperty(target, key, descriptor)
    },
  })
}

// 定义校验规则
const user = validate(
  { name: 'LC', age: 25, email: 'test@example.com' },
  {
    name: v => typeof v === 'string' && v.length >= 2,
    age: v => typeof v === 'number' && v >= 0 && v <= 150,
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  },
)

user.name = 'New Name'  // ✅
user.age = 30           // ✅
user.age = -1           // ❌ TypeError: 属性 age 的值 -1 校验失败
user.email = 'invalid'  // ❌ TypeError
```

---

## 五、三种元编程的对比

```javascript
// Symbol：定义行为标签
const ITERABLE = Symbol.iterator
const obj = {
  [ITERABLE]: function*() { yield 1; yield 2 }
}

// Proxy：拦截行为
const proxy = new Proxy(obj, {
  get(target, key) { return Reflect.get(target, key) }
})

// Reflect：执行行为
Reflect.get(proxy, Symbol.iterator)
```

| 特性 | Symbol | Proxy | Reflect |
|------|--------|-------|---------|
| **作用** | 定义语义标签 | 拦截底层操作 | 执行底层操作 |
| **使用场景** | 迭代器、StringTag、toPrimitive | 响应式、验证、日志 | 替代 Object 系列方法 |
| **与框架** | 框架内部使用 | Vue 3 reactive | Proxy handler 中的搭档 |

---

## 六、面试题

```javascript
// 题目1：实现一个 Proxy，记录对象的所有属性访问
function logAccess(obj) {
  return new Proxy(obj, {
    get(target, key) {
      console.log(`[读取] ${String(key)}`)
      return Reflect.get(target, key)
    },
    set(target, key, value) {
      console.log(`[写入] ${String(key)} = ${value}`)
      return Reflect.set(target, key, value)
    },
  })
}

// 题目2：实现一个只读 Proxy
function readonly(obj) {
  return new Proxy(obj, {
    set() {
      throw new Error('对象是只读的')
    },
    deleteProperty() {
      throw new Error('不能删除只读对象的属性')
    },
    defineProperty() {
      throw new Error('不能修改只读对象')
    },
  })
}

// 题目3：实现一个方法调用日志
function logMethods(obj) {
  return new Proxy(obj, {
    get(target, key) {
      const value = Reflect.get(target, key)
      if (typeof value === 'function') {
        return function(...args) {
          console.log(`调用 ${String(key)}(${args.join(', ')})`)
          return value.apply(this, args)
        }
      }
      return value
    },
  })
}
```

---

## 总结

1. **Symbol** 定义了 JavaScript 的"元行为"——迭代、类型转换、instanceof、字符串标签等
2. **Proxy** 拦截底层操作——get/set/has/delete/apply/construct 等 13 种陷阱
3. **Reflect** 执行底层操作——与 Proxy 一一对应，是 handler 中的最佳搭档
4. **三者的关系**：Symbol 定义"什么"，Proxy 拦截"怎么"，Reflect 执行"做"
5. **实战应用**：响应式系统（Vue 3）、数据校验、日志追踪、安全对象访问
6. **注意事项**：Proxy 不能完全透明（`===` 不会通过代理，`this` 绑定问题）

---

## 全 20 篇系列完结

至此，《你不知道的JavaScript》系列 20 篇文章全部完成！

涵盖的六卷书内容：

| 卷 | 篇号 | 主题 |
|---|------|------|
| **作用域与闭包** | 1-5 | 编译原理、词法作用域、函数/块作用域、提升、闭包 |
| **this 与原型** | 6-9 | this 绑定、new 操作符、原型链、行为委托 |
| **类型与文法** | 10-14 | 类型系统、值、原生函数、强制类型转换、相等比较 |
| **异步与性能** | 15-17 | 事件循环、Promise、Generator + async/await |
| **语法细节** | 18-19 | 表达式/语句/ASI、性能测试 |
| **ES6 及以后** | 20 | Symbol、Proxy、Reflect |
