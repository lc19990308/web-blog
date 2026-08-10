---
title: "你不知道的JavaScript（八）：原型与原型链——JavaScript 继承的底层实现"
date: 2026-06-26
categories: "你不知道的javascript"
description: "深入 JavaScript 原型链机制，理解 [[Prototype]]、prototype 属性、原型链查找规则，以及基于原型的继承模式"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

JavaScript 是**少数直接基于原型（Prototype）实现面向对象的语言**。

在 Java/C++ 中，对象从类（class）实例化而来；在 JavaScript 中，对象通过**原型链**连接到其他对象。

> "类"是蓝图，对象从蓝图创建；"原型"是实例，对象从其他对象继承。

---

## 一、[[Prototype]] 与 prototype

### 1.1 什么是 [[Prototype]]？

每个 JavaScript 对象都有一个内置属性 `[[Prototype]]`（在浏览器中通过 `__proto__` 访问），指向另一个对象：

```javascript
const obj = { a: 1 }

console.log(obj.__proto__)                  // Object.prototype
console.log(Object.getPrototypeOf(obj))     // 推荐的方式
```

当读取一个属性，如果在对象自身没找到，JavaScript 会沿着 `[[Prototype]]` 链向上查找：

```javascript
const parent = { shared: '来自父对象' }
const child = { own: '来自自身' }

// 设置 child 的原型指向 parent
Object.setPrototypeOf(child, parent)

console.log(child.own)    // '来自自身'
console.log(child.shared) // '来自父对象'（通过原型链找到）
console.log(child.toString) // 继续向上到 Object.prototype
```

### 1.2 prototype 属性

**functions 才有 `prototype` 属性**（箭头函数除外）：

```javascript
function Foo() {}
console.log(typeof Foo.prototype) // 'object'

const arrow = () => {}
console.log(arrow.prototype) // undefined
```

`Foo.prototype` 是一个对象，它会在 `new Foo()` 时被赋值给新对象的 `[[Prototype]]`：

```javascript
function Foo() {
  // this 指向新对象
}

const f = new Foo()

// 现在 f.__proto__ === Foo.prototype
console.log(f.__proto__ === Foo.prototype) // true
console.log(f.constructor === Foo) // true
```

### 1.3 三者的关系图

```
function Foo() {}
const f = new Foo()

  Foo                              // 构造函数
  ├── prototype ──────────────→    // 指向原型对象
  │                               // ↓
  │                    Foo.prototype     // 原型对象
  │                    ├── constructor → Foo
  │                    ├── __proto__ → Object.prototype
  │                    └── (自定义方法)
  │  f                              // 实例
  └── __proto__ ─────────────→ Foo.prototype
```

**关键**：
- `Foo.prototype`：构造函数的**原型对象**（所有实例共享它）
- `f.__proto__`：实例的**原型链接**（指向 `Foo.prototype`）
- `Foo.prototype.constructor`：原型对象指回构造函数

---

## 二、原型链查找

### 2.1 属性访问与修改的差异

```javascript
function Person(name) {
  this.name = name
}

Person.prototype.sayName = function() {
  console.log(this.name)
}

const p = new Person('LC')

// 读取：沿着原型链查找
p.sayName() // 'LC'（原型链找到 sayName）

// 写入 / 修改：只在自身操作
p.sayName = function() {
  console.log('覆盖了')
}
p.sayName()                         // '覆盖了'（自身属性）
console.log(Person.prototype.sayName) // 原函数还在
```

**重要**：`p.sayName = xxx` 不会修改 `Person.prototype.sayName`，它只在 `p` 自身创建了一个同名的属性，遮蔽了原型上的方法。

### 2.2 hasOwnProperty

区分属性是自身的还是来自原型：

```javascript
function Person(name) {
  this.name = name
}
Person.prototype.sayName = function() {}

const p = new Person('LC')

console.log(p.hasOwnProperty('name'))    // true（自身属性）
console.log(p.hasOwnProperty('sayName')) // false（原型上的）

// 判断属性是否在原型上
function isOnPrototype(obj, prop) {
  return prop in obj && !obj.hasOwnProperty(prop)
}

console.log(isOnPrototype(p, 'sayName')) // true
console.log('sayName' in p)              // true（in 操作符会检查原型链）
```

---

## 三、原型链的顶端

### 3.1 Object.prototype

所有对象的原型链终点是 `Object.prototype`：

```javascript
const obj = {}
// obj → Object.prototype → null

function Foo() {}
const f = new Foo()
// f → Foo.prototype → Object.prototype → null

console.log(Object.getPrototypeOf(Object.prototype)) // null
```

所以任何对象都能调用 `toString`、`valueOf`、`hasOwnProperty` 等方法：

```javascript
const arr = [1, 2, 3]
// arr → Array.prototype → Object.prototype → null

console.log(arr.toString()) // "1,2,3"（Array.prototype 的 toString）
console.log(arr.hasOwnProperty(0)) // true（Object.prototype 的）
```

### 3.2 三种对象的原型链

```javascript
// 对象
const obj = {}
// obj → Object.prototype → null

// 数组
const arr = []
// arr → Array.prototype → Object.prototype → null

// 函数
function foo() {}
// foo → Function.prototype → Object.prototype → null
```

---

## 四、基于原型的继承

### 4.1 传统方式（原型链继承）

```javascript
function Animal(name) {
  this.name = name
}

Animal.prototype.eat = function() {
  console.log(`${this.name} 在吃东西`)
}

function Dog(name, breed) {
  Animal.call(this, name) // 继承属性
  this.breed = breed
}

// 继承方法：让 Dog.prototype 连接到 Animal.prototype
Dog.prototype = Object.create(Animal.prototype)
Dog.prototype.constructor = Dog // 修复 constructor

Dog.prototype.bark = function() {
  console.log(`${this.name} 在叫`)
}

const dog = new Dog('旺财', '金毛')
dog.eat() // '旺财 在吃东西'
dog.bark() // '旺财 在叫'
console.log(dog instanceof Dog)    // true
console.log(dog instanceof Animal) // true
```

### 4.2 ES6 class 继承

```javascript
class Animal {
  constructor(name) {
    this.name = name
  }

  eat() {
    console.log(`${this.name} 在吃东西`)
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name)
    this.breed = breed
  }

  bark() {
    console.log(`${this.name} 在叫`)
  }
}

const dog = new Dog('旺财', '金毛')
dog.eat()
dog.bark()
```

底层仍然是原型链：

```javascript
console.log(Dog.prototype.__proto__ === Animal.prototype) // true
console.log(dog.__proto__ === Dog.prototype)              // true
console.log(dog.__proto__.__proto__ === Animal.prototype) // true
```

---

## 五、原型链的应用

### 5.1 函数默认值

```javascript
// 在原型上设置默认值
function Button(text) {
  this.text = text
}

Button.prototype.color = 'blue'
Button.prototype.size = 'medium'

const btn1 = new Button('提交')
const btn2 = new Button('取消')

btn2.color = 'red' // 只覆盖 btn2 的 color

console.log(btn1.color) // 'blue'（原型上的）
console.log(btn2.color) // 'red'（自身的）
console.log(btn1.size)  // 'medium'（原型上的）
```

### 5.2 扩展内置对象

```javascript
// 给 Array 添加一个自定义方法
Array.prototype.first = function() {
  if (this.length === 0) throw new Error('空数组')
  return this[0]
}

Array.prototype.last = function() {
  if (this.length === 0) throw new Error('空数组')
  return this[this.length - 1]
}

const arr = [1, 2, 3]
console.log(arr.first()) // 1
console.log(arr.last())  // 3
```

**警告**：扩展内置对象的原型（Monkey-patching）可能引发问题：
- 未来 JavaScript 标准可能添加同名方法，导致冲突
- 不同库同时扩展时可能互相覆盖
- 最好用 `Symbol` 或独立函数代替

---

## 六、面试题

```javascript
// 题目1：输出什么？
function Foo() {}
Foo.prototype.a = 1

const f1 = new Foo()
const f2 = new Foo()

f1.a = 2

console.log(f1.a) // ?
console.log(f2.a) // ?
```

**答案**：`2` 和 `1`

**解析**：`f1.a = 2` 在 f1 自身创建了属性 a，遮蔽了原型上的 a。f2 没有自身属性 a，所以从原型上获取。

```javascript
// 题目2：输出什么？
function Foo() {}
Foo.prototype.a = 1

const f = new Foo()

Foo.prototype = { a: 2 }

const f2 = new Foo()

console.log(f.a)  // ?
console.log(f2.a) // ?
```

**答案**：`1` 和 `2`

**解析**：`f` 的原型指向旧的 `Foo.prototype`（{ a: 1 }）。`Foo.prototype` 被替换后，`f2` 的原型指向新的对象（{ a: 2 }）。

```javascript
// 题目3：实现 instanceof
function myInstanceof(left, right) {
  let proto = Object.getPrototypeOf(left)
  while (proto !== null) {
    if (proto === right.prototype) return true
    proto = Object.getPrototypeOf(proto)
  }
  return false
}
```

```javascript
// 题目4：原型链查找
function Parent() { this.a = 1 }
Parent.prototype.b = 2

function Child() {
  Parent.call(this)
  this.c = 3
}
Child.prototype = Object.create(Parent.prototype)
Child.prototype.d = 4

const child = new Child()

// 判断以下属性来源
console.log(child.hasOwnProperty('a')) // true（构造函数中赋值）
console.log(child.hasOwnProperty('b')) // false（Parent.prototype）
console.log(child.hasOwnProperty('c')) // true（构造函数中赋值）
console.log(child.hasOwnProperty('d')) // false（Child.prototype）

console.log('a' in child) // true
console.log('b' in child) // true
console.log('toString' in child) // true（Object.prototype）
```

---

## 七、Object.create 详解

`Object.create(proto)` 创建一个新对象，其 `[[Prototype]]` 指向 `proto`：

```javascript
const parent = { shared: 'parent' }
const child = Object.create(parent)

console.log(child.shared) // 'parent'
console.log(Object.getPrototypeOf(child) === parent) // true
```

**polyfill**：

```javascript
Object.myCreate = function(proto) {
  function F() {}
  F.prototype = proto
  return new F()
}
```

`Object.create` 的三个妙用：

```javascript
// 1. 创建纯字典对象（没有原型链上的属性）
const dict = Object.create(null)
dict.key = 'value'
console.log(dict.toString) // undefined（没有 Object.prototype 的方法）

// 2. 继承时的原型连接
Child.prototype = Object.create(Parent.prototype)

// 3. 复制对象并继承
const clone = Object.create(
  Object.getPrototypeOf(original),
  Object.getOwnPropertyDescriptors(original)
)
```

---

## 总结

1. **每个对象都有 `[[Prototype]]`**，指向另一个对象，形成原型链
2. **函数有 `prototype` 属性**，通过 new 调用时赋值给实例的 `[[Prototype]]`
3. **属性访问沿原型链向上查找**，直到找到或到 `null`
4. **属性赋值只在自身操作**，不会修改原型
5. **原型链顶端是 `Object.prototype`**，其 `[[Prototype]]` 为 `null`
6. **ES6 class 继承底层仍然是原型链**
7. **`Object.create` 是操作原型的核心工具**

> 下一篇将深入**行为委托**——一种比"类继承"更符合 JavaScript 本心的代码组织方式。
