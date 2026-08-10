---
title: "你不知道的JavaScript（七）：new 操作符——构造函数与实例的底层机制"
date: 2026-06-26
categories: "你不知道的javascript"
description: "深入 new 操作符的底层实现机制，理解构造函数、实例创建、原型连接的全过程，手写实现一个完整的 new 函数"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

```javascript
const obj = new Foo()
```

这行代码看似简单，但 `new` 实际上做了 4 件事。理解这 4 件事，是理解 JavaScript 面向对象的基础。

---

## 一、new 到底做了什么？

当执行 `new Foo()` 时，JavaScript 引擎做了以下 4 步：

1. **创建一个全新的空对象**
2. **将这个对象的 `__proto__` 指向构造函数的 `prototype`**
3. **将这个对象作为 `this` 绑定到构造函数**
4. **如果构造函数没有返回对象，返回这个新对象**

### 1.1 手写实现 new

```javascript
function myNew(Constructor, ...args) {
  // 1. 创建空对象
  const obj = {}

  // 2. 原型连接：obj.__proto__ = Constructor.prototype
  Object.setPrototypeOf(obj, Constructor.prototype)

  // 3. 绑定 this 并执行构造函数
  const result = Constructor.apply(obj, args)

  // 4. 如果构造函数返回了对象，返回该对象；否则返回新创建的对象
  return result instanceof Object ? result : obj
}

// 测试
function Person(name, age) {
  this.name = name
  this.age = age
}

const p = myNew(Person, 'LC', 25)
console.log(p.name) // LC
console.log(p.age)  // 25
console.log(p instanceof Person) // true
```

### 1.2 更精炼的版本

```javascript
function myNew(Constructor, ...args) {
  const obj = Object.create(Constructor.prototype)
  const result = Constructor.apply(obj, args)
  return result instanceof Object ? result : obj
}
```

`Object.create(Constructor.prototype)` 一步完成了"创建空对象"和"原型连接"两步。

---

## 二、构造函数的返回值规则

### 2.1 返回基本类型

如果构造函数返回基本类型，`new` 会忽略返回值，返回新创建的对象：

```javascript
function Foo() {
  this.name = 'LC'
  return 'hello' // 基本类型
}

const f = new Foo()
console.log(f)      // { name: 'LC' }（忽略返回值）
console.log(f.name) // 'LC'
```

### 2.2 返回对象类型

如果构造函数返回对象，`new` 会返回这个对象，而不是新创建的对象：

```javascript
function Foo() {
  this.name = 'LC'
  return { custom: true } // 返回对象
}

const f = new Foo()
console.log(f)          // { custom: true }
console.log(f.name)     // undefined
console.log(f.custom)   // true
```

**实际应用**：利用这个特性可以实现"防 new 调用"：

```javascript
function Person(name) {
  // 如果忘记写 new，自动补上
  if (!(this instanceof Person)) {
    return new Person(name)
  }
  this.name = name
}

// 两种调用方式都行
const p1 = new Person('LC')
const p2 = Person('AtomCode') // 忘记 new 也能工作
console.log(p1.name) // LC
console.log(p2.name) // AtomCode
```

ES6 的 `new.target` 提供了更干净的检查方式：

```javascript
function Person(name) {
  if (new.target === undefined) {
    throw new Error('必须使用 new 调用 Person')
  }
  this.name = name
}

Person('LC') // ❌ Error: 必须使用 new 调用 Person
```

---

## 三、构造函数不是魔法

### 3.1 没有 new 的构造函数

```javascript
function Person(name) {
  this.name = name
}

// 不用 new 调用
const p = Person('LC')
console.log(p)          // undefined（函数没有返回值）
console.log(name)       // 'LC'（this 指向全局，污染了全局变量！）
console.log(window.name) // 'LC'（浏览器环境）
```

**这就是为什么构造函数要用大驼峰命名** —— 提醒开发者必须用 `new` 调用。

### 3.2 模拟没有 new 的保护

```javascript
function Person(name) {
  // ES6 推荐
  if (new.target === undefined) {
    throw new Error('Person 必须用 new 调用')
  }

  // 或者：
  // if (!(this instanceof Person)) {
  //   return new Person(name)
  // }

  this.name = name
}
```

---

## 四、instanceof 的工作原理

`instanceof` 检查的是**原型链**，不是值：

```javascript
function Person() {}
const p = new Person()

console.log(p instanceof Person)  // true
console.log(p instanceof Object)  // true（因为 Person.prototype 也是一个对象）
console.log(p instanceof Array)   // false
```

底层原理：

```javascript
function myInstanceof(left, right) {
  let proto = Object.getPrototypeOf(left)

  while (proto !== null) {
    if (proto === right.prototype) {
      return true
    }
    proto = Object.getPrototypeOf(proto)
  }

  return false
}

console.log(myInstanceof(p, Person)) // true
console.log(myInstanceof(p, Object)) // true
console.log(myInstanceof(p, Array))  // false
```

### 4.1 手动修改原型链的后果

```javascript
function Person() {}
const p = new Person()

// 手动修改原型
Person.prototype = {}

console.log(p instanceof Person) // false（p 的原型指向旧的 prototype）
// p 的 __proto__ 仍指向旧的 Person.prototype
// 但 Person.prototype 现在指向新的对象
```

---

## 五、原型链的完整连接

```javascript
function Foo() {}
const f = new Foo()
```

创建了 3 个对象的连接：

```
f (实例)
  ├── __proto__ → Foo.prototype
                   ├── constructor → Foo
                   └── __proto__ → Object.prototype
                                    ├── constructor → Object
                                    ├── hasOwnProperty
                                    ├── toString
                                    └── __proto__ → null
```

### 5.1 constructor 属性

```javascript
function Foo() {}
const f = new Foo()

console.log(Foo.prototype.constructor === Foo) // true
console.log(f.constructor === Foo)             // true（通过原型链）

// 注意：打印 f.constructor 实际是在 Foo.prototype 上找到的
console.log(f.hasOwnProperty('constructor')) // false
```

**constructor 可以被覆盖**：

```javascript
function Foo() {}
Foo.prototype = { // 替换了整个 prototype
  bar: function() {},
}

const f = new Foo()
console.log(f.constructor === Foo) // false（变成 Object）
console.log(f.constructor === Object) // true

// 修复
Foo.prototype.constructor = Foo
```

---

## 六、面试题

```javascript
// 题目1：输出什么？
function Foo() {
  this.a = 1
  return { a: 2 }
}
const f = new Foo()
console.log(f.a) // ?

// 答案：2（构造函数返回了对象，所以返回这个对象）

// 题目2：输出什么？
function Foo() {
  this.a = 1
  return 2
}
const f = new Foo()
console.log(f.a) // ?

// 答案：1（返回基本类型被忽略）

// 题目3：输出什么？
function Foo() {
  return function() {}
}
const f = new Foo()
console.log(f instanceof Foo) // ?

// 答案：false（返回了匿名函数对象）
```

```javascript
// 题目4：实现一个 new 的完整版本
function _new(constructor, ...args) {
  // 在这里实现
}

// 期望结果：
function Person(name) {
  this.name = name
}
Person.prototype.sayName = function() {
  console.log(this.name)
}

const p = _new(Person, 'LC')
p.sayName() // 'LC'
console.log(p instanceof Person) // true
```

参考答案：

```javascript
function _new(constructor, ...args) {
  const obj = Object.create(constructor.prototype)
  const result = constructor.apply(obj, args)
  // 如果构造函数返回值是对象，返回它；否则返回新对象
  return result !== null && typeof result === 'object' || typeof result === 'function'
    ? result
    : obj
}
```

---

## 七、class 与 new

ES6 的 `class` 底层仍然是基于原型的，`class` 的构造函数必须用 `new` 调用：

```javascript
class Person {
  constructor(name) {
    this.name = name
  }

  sayName() {
    console.log(this.name)
  }
}

const p = new Person('LC')
p.sayName() // LC

console.log(typeof Person)       // 'function'
console.log(Person.prototype.sayName) // 方法存在原型上

Person('LC') // ❌ TypeError: Class constructor Person cannot be invoked without 'new'
```

**class 和普通构造函数的区别**：

| 特性 | 普通函数 | class |
|------|---------|-------|
| 是否必须 new | 否（但应当） | 是（强制） |
| 方法在何处 | this 或 prototype | 始终在 prototype |
| 枚举性 | 可配置 | 方法不可枚举 |
| 严格模式 | 由调用方决定 | 始终严格模式 |
| 提升 | 函数声明提升 | 不提升（TDZ） |

---

## 总结

1. **new 做了 4 件事**：创建空对象 → 连接原型 → 绑定 this → 返回对象
2. **构造函数返回对象类型**时，new 返回该对象；返回基本类型则忽略
3. **instanceof 检查原型链**，不是检查值
4. **`new.target`** 检查是否通过 new 调用（ES6）
5. **class 强制 new 调用**，且方法在 prototype 上
6. 手写 `new` 是前端面试的经典考题

> 下一篇将深入**原型与原型链**，理解 JavaScript 继承的底层实现。
