---
title: "JavaScript 设计模式在前端的应用"
date: 2026-03-08
categories: "JavaScript"
description: "掌握 8 种前端最常用的设计模式：单例模式、观察者模式、代理模式、工厂模式等，含实际业务场景代码"
tags: "JavaScript"
copyright: true
---

## 前言

设计模式是**经过验证的解决方案**，而非教条。本文挑选前端开发中最常用的 8 种模式，每种都配合实际业务场景，不讲空泛的理论。

---

## 一、单例模式（Singleton）

**确保一个类只有一个实例**，并提供全局访问点。

### 场景：全局状态管理（如 Pinia/Vuex 的 store）

```javascript
class Store {
  constructor() {
    if (Store.instance) return Store.instance
    this.state = {}
    Store.instance = this
  }

  set(key, value) { this.state[key] = value }
  get(key) { return this.state[key] }
}

// 无论 new 多少次，都是同一个实例
const store1 = new Store()
const store2 = new Store()
console.log(store1 === store2) // true

// Vue 3 的 Pinia 底层就是单例模式
// 所有组件访问同一个 store 实例
```

### 场景：全局弹窗 / Toast

```javascript
class Toast {
  constructor() {
    if (Toast.instance) return Toast.instance
    this.el = document.createElement('div')
    this.el.className = 'toast'
    document.body.appendChild(this.el)
    Toast.instance = this
  }

  show(msg, duration = 2000) {
    this.el.textContent = msg
    this.el.style.display = 'block'
    setTimeout(() => { this.el.style.display = 'none' }, duration)
  }
}

// 全局只需要一个 Toast 实例
const toast = new Toast()
toast.show('保存成功')
```

---

## 二、观察者模式（Observer）

**一对多依赖**：当一个对象状态变化时，所有依赖它的对象都得到通知。

### 场景：Vue 的响应式系统

```javascript
class Subject {
  constructor() {
    this.observers = new Set()
  }

  subscribe(fn) { this.observers.add(fn) }
  unsubscribe(fn) { this.observers.delete(fn) }
  notify(data) { this.observers.forEach(fn => fn(data)) }
}

// 使用
const store = new Subject()

// 组件 A 订阅
store.subscribe((data) => {
  console.log('组件 A 收到:', data)
})

// 组件 B 订阅
store.subscribe((data) => {
  console.log('组件 B 收到:', data)
})

// 状态变更，通知所有订阅者
store.notify({ user: '张三' })
// 组件 A 收到: { user: '张三' }
// 组件 B 收到: { user: '张三' }
```

**发布订阅模式 vs 观察者模式：**
- 观察者模式：Subject 直接通知 Observer
- 发布订阅模式：通过 Event Bus 解耦（如 mitt）

---

## 三、代理模式（Proxy）

**为另一个对象提供一个替身**以控制对它的访问。

### 场景：图片懒加载

```javascript
const createImage = (src) => {
  const img = new Image()
  img.src = src
  document.body.appendChild(img)
  return img
}

// 虚拟代理：加载前显示占位图
const createProxyImage = (src) => {
  const img = new Image()
  // 先设置占位图
  const placeholder = document.createElement('div')
  placeholder.className = 'placeholder'
  document.body.appendChild(placeholder)

  // 真实图片加载完成后替换
  img.onload = () => {
    placeholder.replaceWith(img)
  }
  img.src = src
}

// Vue 3 reactive 底层也是代理模式
const state = reactive({ count: 0 })
// Proxy 拦截了 get/set 操作，实现响应式
```

### 场景：缓存代理

```javascript
const cacheRequest = (fn) => {
  const cache = new Map()

  return (...args) => {
    const key = JSON.stringify(args)
    if (cache.has(key)) {
      console.log('从缓存读取')
      return cache.get(key)
    }
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

const fetchUser = cacheRequest(async (id) => {
  const res = await fetch(`/api/user/${id}`)
  return res.json()
})

fetchUser(1) // 发请求
fetchUser(1) // 走缓存，不发请求
```

---

## 四、工厂模式（Factory）

**用一个工厂函数代替 `new` 创建对象**，将创建逻辑封装。

### 场景：创建不同类型的弹窗

```javascript
class SuccessModal { render() { /* ... */ } }
class ErrorModal   { render() { /* ... */ } }
class ConfirmModal { render() { /* ... */ } }

// 工厂函数
function createModal(type, options) {
  switch (type) {
    case 'success':
      return new SuccessModal(options)
    case 'error':
      return new ErrorModal(options)
    case 'confirm':
      return new ConfirmModal(options)
    default:
      throw new Error('Unknown modal type')
  }
}

// 使用
const modal = createModal('success', { message: '操作成功' })
modal.render()
```

---

## 五、策略模式（Strategy）

**定义一系列算法，把它们封装起来并可互相替换。**

### 场景：表单校验

```javascript
const validators = {
  required: (value) => value ? '' : '此项必填',
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : '邮箱格式不正确',
  minLength: (min) => (value) =>
    value.length >= min ? '' : `最少 ${min} 个字符`,
  maxLength: (max) => (value) =>
    value.length <= max ? '' : `最多 ${max} 个字符`,
}

function validate(rules, value) {
  for (const rule of rules) {
    const error = rule(value)
    if (error) return error
  }
  return ''
}

// 使用
const error = validate(
  [validators.required, validators.email],
  'test@example.com'
)
console.log(error) // ''（验证通过）
```

---

## 六、装饰器模式（Decorator）

**动态地为对象添加行为**，不改变原有代码。

### 场景：权限控制

```javascript
class UserService {
  async getProfile() { return { name: '张三' } }
}

// 装饰器：添加缓存
function withCache(fn, keyFn) {
  const cache = new Map()
  return async (...args) => {
    const key = keyFn ? keyFn(args) : JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)
    const result = await fn(...args)
    cache.set(key, result)
    return result
  }
}

// 装饰器：添加日志
function withLog(fn, name) {
  return async (...args) => {
    console.log(`[调用] ${name}`, args)
    const result = await fn(...args)
    console.log(`[返回] ${name}`, result)
    return result
  }
}

// 组合使用
const service = new UserService()
service.getProfile = withLog(
  withCache(service.getProfile.bind(service)),
  'getProfile'
)

await service.getProfile() // 有日志 + 有缓存
```

---

## 七、迭代器模式（Iterator）

**提供一种顺序访问集合元素的方法**，而不暴露其内部结构。

### 场景：分页加载

```javascript
class Pagination {
  constructor(data, pageSize = 10) {
    this.data = data
    this.pageSize = pageSize
    this.page = 0
  }

  next() {
    const start = this.page * this.pageSize
    const end = start + this.pageSize
    const items = this.data.slice(start, end)
    this.page++
    return { value: items, done: items.length === 0 }
  }

  [Symbol.iterator]() {
    return this
  }
}

const list = new Pagination([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 3)

console.log(list.next()) // { value: [1,2,3], done: false }
console.log(list.next()) // { value: [4,5,6], done: false }
console.log(list.next()) // { value: [7,8,9], done: false }
```

---

## 八、模块模式（Module）

**将私有变量和函数封装在闭包中**，只暴露公共接口。

```javascript
const UserModule = (() => {
  // 私有
  let token = null
  let user = null

  const setToken = (t) => { token = t }
  const isLoggedIn = () => !!token

  // 公共
  return {
    login: async (credentials) => {
      const res = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      })
      const data = await res.json()
      setToken(data.token)
      user = data.user
      return user
    },
    logout: () => {
      token = null
      user = null
    },
    getUser: () => user,
    isLoggedIn,
  }
})()

// 使用
await UserModule.login({ email: 'test@test.com', password: '123456' })
console.log(UserModule.getUser())
console.log(UserModule.isLoggedIn())
// ❌ 无法访问私有变量
console.log(UserModule.token) // undefined
```

---

## 总结

```javascript
// 前端设计模式速查表：
// 单例 → 全局唯一实例（Store、Toast）
// 观察者 → 事件通知（响应式、EventBus）
// 代理 → 控制访问（图片懒加载、缓存）
// 工厂 → 批量创建对象（弹窗组件）
// 策略 → 可替换算法（表单校验）
// 装饰器 → 动态添加行为（日志、缓存、权限）
// 迭代器 → 顺序遍历（分页）
// 模块 → 封装私有变量（工具库、Store）

// 不要为了用模式而用模式
// 模式是解决问题的工具，不是目标
```

**推荐阅读：**
- 《JavaScript 设计模式与开发实践》
- [MDN: Proxy](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
