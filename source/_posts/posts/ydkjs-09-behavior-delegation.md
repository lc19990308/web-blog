---
title: '你不知道的JavaScript（九）：行为委托——比"类继承"更 JavaScript 的方式'
date: 2026-06-26
categories: "你不知道的javascript"
description: 'JavaScript 没有真正的"类"，只有对象。行为委托（Behavior Delegation）是一种比"模拟类"更自然、更简洁的代码组织方式'
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

大多数开发者试图用 JavaScript 模拟"类"的行为：

```javascript
function Animal(name) { this.name = name }
Animal.prototype.eat = function() { /* ... */ }
function Dog(name) { Animal.call(this, name) }
Dog.prototype = Object.create(Animal.prototype)
```

但 JavaScript 没有类——它只有对象。**行为委托（Behavior Delegation）** 是一种更贴合 JavaScript 本心的思维方式：

> 不是"子类继承父类"，而是"对象委托失败的操作给另一个对象"。

---

## 一、"类"在 JavaScript 中的问题

### 1.1 类是"复制"，原型是"连接"

传统类的继承中，子类会**复制**父类的属性和方法：

```
class Animal { eat() {} }
class Dog extends Animal { bark() {} }
// Dog 拥有 eat 和 bark 的副本
```

但 JavaScript 的原型链不是复制，是**连接**：

```javascript
function Animal() {}
Animal.prototype.eat = function() {}

function Dog() {}
Dog.prototype = Object.create(Animal.prototype)
Dog.prototype.bark = function() {}

const dog = new Dog()
// dog 本身没有 eat——它是通过原型链连接到 Animal.prototype
```

### 1.2 构造函数带来的混乱

```javascript
function Foo() {}
const a = new Foo()

Foo.prototype.constructor === Foo // true
a.constructor === Foo             // true（但 a 没有 constructor 属性！）
// 实际上是通过原型链找到了 Foo.prototype.constructor
```

`a.constructor` 并不属于 `a`，它只是从 `Foo.prototype` 上找到的。

---

## 二、委托的设计模式

### 2.1 委托思维

不要想"Dog 是 Animal 的一种"（is-a 关系），而是想"当 Dog 处理不了的事情，交给 Animal 处理"。

```javascript
// 委托的思维
const Animal = {
  init(name) {
    this.name = name
    return this
  },
  eat() {
    console.log(`${this.name} 在吃东西`)
  },
  sleep() {
    console.log(`${this.name} 在睡觉`)
  },
}

const Dog = Object.create(Animal)

Dog.init = function(name, breed) {
  Animal.init.call(this, name) // 委托给 Animal
  this.breed = breed
  return this
}

Dog.bark = function() {
  console.log(`${this.name} 在叫`)
}

// 使用
const dog = Object.create(Dog).init('旺财', '金毛')
dog.eat() // '旺财 在吃东西'（委托给 Animal）
dog.bark() // '旺财 在叫'
```

### 2.2 与传统方式的对比

**传统类方式**：

```javascript
class Animal {
  constructor(name) { this.name = name }
  eat() { console.log(`${this.name} 在吃东西`) }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name)
    this.breed = breed
  }
  bark() { console.log(`${this.name} 在叫`) }
}

const dog = new Dog('旺财', '金毛')
```

**委托方式**：

```javascript
const Animal = {
  init(name) { this.name = name; return this },
  eat() { console.log(`${this.name} 在吃东西`) },
}

const Dog = Object.create(Animal)
Dog.init = function(name, breed) {
  Animal.init.call(this, name)
  this.breed = breed
  return this
}
Dog.bark = function() { console.log(`${this.name} 在叫`) }

const dog = Object.create(Dog).init('旺财', '金毛')
```

**关键区别**：
- 没有 `new`，没有 `constructor`
- 没有 `.prototype` 的显式操作
- 对象直接关联到对象
- 使用 `Object.create()` 建立连接

---

## 三、委托的实际应用

### 3.1 登录表单验证

```javascript
const Validator = {
  required(value) {
    return value !== '' && value !== null && value !== undefined
  },
  minLength(value, min) {
    return value.length >= min
  },
  maxLength(value, max) {
    return value.length <= max
  },
  email(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  },
}

const LoginForm = Object.create(Validator)

LoginForm.validate = function(data) {
  const errors = []

  if (!this.required(data.username)) {
    errors.push('用户名不能为空')
  } else if (!this.minLength(data.username, 3)) {
    errors.push('用户名至少 3 个字符')
  }

  if (!this.required(data.password)) {
    errors.push('密码不能为空')
  } else if (!this.minLength(data.password, 6)) {
    errors.push('密码至少 6 个字符')
  }

  if (data.email && !this.email(data.email)) {
    errors.push('邮箱格式不正确')
  }

  return errors
}

// 使用
const errors = LoginForm.validate({
  username: 'LC',
  password: '123',
  email: 'test',
})

console.log(errors)
// ['用户名至少 3 个字符', '密码至少 6 个字符', '邮箱格式不正确']
```

### 3.2 组件状态管理

```javascript
const Stateful = {
  initState(initialState = {}) {
    this.state = { ...initialState }
    return this
  },
  setState(updates) {
    Object.assign(this.state, updates)
    this.render?.()
    return this
  },
  getState(key) {
    return key ? this.state[key] : this.state
  },
}

const Counter = Object.create(Stateful)

Counter.init = function() {
  this.initState({ count: 0 })
  return this
}

Counter.increment = function() {
  this.setState({ count: this.state.count + 1 })
  return this
}

Counter.decrement = function() {
  this.setState({ count: this.state.count - 1 })
  return this
}

Counter.render = function() {
  console.log(`当前计数: ${this.state.count}`)
}

// 使用
const counter = Object.create(Counter).init()
counter.increment().increment() // 当前计数: 2
counter.decrement()              // 当前计数: 1
```

---

## 四、委托 vs 类的核心区别

| 方面 | 类 | 委托 |
|------|------|------|
| **关系** | 父子继承 is-a | 伙伴委托 connects-to |
| **创建** | `new ClassName()` | `Object.create(obj)` |
| **方法定义** | `class` 中定义 | 对象字面量中定义 |
| **属性初始化** | `constructor` | `init` 方法 |
| **使用父类方法** | `super.method()` | `ParentObj.method.call(this)` |
| **this 指向** | 实例 | 总是调用者 |
| **心智模型** | 蓝图 → 实例 | 对象 → 对象 |

---

## 五、OLOO（Objects Linked to Other Objects）

"委托"的模式也被称为 **OLOO**——对象链接到其他对象。

### 5.1 OLOO 风格

```javascript
const Widget = {
  init(width, height) {
    this.width = width || 50
    this.height = height || 50
    this.$elem = null
    return this
  },
  insert($where) {
    if (this.$elem) {
      this.$elem.style.width = this.width + 'px'
      this.$elem.style.height = this.height + 'px'
      $where.appendChild(this.$elem)
    }
  },
}

const Button = Object.create(Widget)

Button.setup = function(width, height, label) {
  this.init(width, height)
  this.label = label || 'Default'
  this.$elem = document.createElement('button')
  this.$elem.innerText = this.label
  return this
}

Button.build = function($where, onClick) {
  this.insert($where)
  this.$elem.addEventListener('click', onClick)
}

// 使用
const btn1 = Object.create(Button).setup(100, 30, '提交')
const btn2 = Object.create(Button).setup(120, 40, '取消')

document.addEventListener('DOMContentLoaded', () => {
  btn1.build(document.body, () => alert('提交'))
  btn2.build(document.body, () => alert('取消'))
})
```

### 5.2 内置对象的委托

JavaScript 内置对象已经在使用委托模式：

```javascript
// 数组委托到 Array.prototype
const arr = [1, 2, 3]
// arr.push → 委托到 Array.prototype.push
// arr.map  → 委托到 Array.prototype.map

// 函数委托到 Function.prototype
function foo() {}
// foo.call → 委托到 Function.prototype.call

// 自定义委托
const eventEmitter = {
  handlers: {},
  on(event, handler) {
    if (!this.handlers[event]) this.handlers[event] = []
    this.handlers[event].push(handler)
    return this
  },
  emit(event, ...args) {
    const handlers = this.handlers[event]
    if (handlers) handlers.forEach(h => h(...args))
    return this
  },
}

const userModule = Object.create(eventEmitter)
userModule.login = function(username) {
  console.log(`${username} 登录了`)
  this.emit('login', username)
}
userModule.on('login', (name) => console.log(`记录登录: ${name}`))
userModule.login('LC')
```

---

## 六、面试题

```javascript
// 为什么以下方式能让 foo 打印 "world"？
const obj = {
  foo: function() {
    console.log(this.bar)
  },
  bar: 'hello',
}

const delegated = Object.create(obj)
delegated.bar = 'world'
delegated.foo() // 'world'

// 因为 delegated 没有 foo 方法，委托给 obj.foo
// 但 this 指向调用者 delegated
// 所以 this.bar = delegated.bar = 'world'
```

```javascript
// 对比：如果 foo 使用箭头函数
const obj = {
  foo: () => {
    console.log(this.bar)
  },
  bar: 'hello',
}

const delegated = Object.create(obj)
delegated.bar = 'world'
delegated.foo() // undefined（箭头函数 this 不指向调用者）
```

---

## 七、面向委托的设计建议

1. **优先使用 OLOO 模式**：对象关联对象，比"模拟类"更简洁
2. **使用 `Object.create()`**：它是建立委托关系的最佳工具
3. **显式委托**：`Parent.method.call(this)` 比隐式的 `super` 更清晰
4. **避免多层委托**：两层就够（具体对象 → 通用对象），太多层反而不清晰
5. **工厂函数 > 构造函数**：工厂函数返回对象，无需 new，更安全

```javascript
// 工厂函数 + 委托模式
function createButton(label) {
  return Object.create(Button).setup(label)
}
```

---

## 总结

1. **类继承 = 复制；委托 = 连接**——JavaScript 的原型本质是后者
2. **OLOO（对象链接到对象）** 比"类模拟"更简洁
3. **委托模式**的核心：**this 始终指向调用者**，这就是"行为委托"的含义
4. 委托不是"父类做某事"，而是"我处理不了的事情，你帮我处理"
5. ES6 class 只是语法糖，底层仍然是原型链

> 下一篇将深入 JavaScript 的**类型系统**，深入分析七种内置类型的行为。
