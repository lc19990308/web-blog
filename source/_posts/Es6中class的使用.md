---
title: "JavaScript 中的 Class：从 ES5 到 ES6+ 的完整指南"
date: 2021-06-05 18:57:00
updated: 2025-06-22
categories: "JavaScript"
description: "从 ES5 构造函数到 ES6 class 语法糖，再到私有字段、装饰器等新特性，一篇吃透 JavaScript 中的面向对象编程"
tags: "ES6"
copyright: true
---

## 前言

ES6 的 `class` 关键字让 JavaScript 的面向对象编程变得清晰、优雅。但它本质上还是**基于原型的继承**（语法糖）——理解这一点，才能避免踩坑。

本文覆盖：
- ES5 → ES6 class 的演进
- 核心用法（属性、方法、静态成员）
- 继承体系（extends、super）
- 新特性（私有字段、getter/setter）
- 进阶模式（组合 vs 继承、mixin）

---

## 一、从 ES5 到 ES6：类的演进

### ES5 的"类"

```javascript
// ES5：构造函数 + 原型
function Animal(name) {
  this.name = name;
}

Animal.prototype.say = function () {
  console.log(`我是 ${this.name}`);
};

// 静态方法
Animal.create = function (name) {
  return new Animal(name);
};

var dog = new Animal('旺财');
dog.say(); // 我是旺财
```

### ES6 的 class

```javascript
// ES6：class 语法
class Animal {
  constructor(name) {
    this.name = name;
  }

  say() {
    console.log(`我是 ${this.name}`);
  }

  static create(name) {
    return new Animal(name);
  }
}

const dog = new Animal('旺财');
dog.say(); // 我是旺财
```

**两者本质等价**——`typeof Animal === 'function'`，class 的方法定义在 `Animal.prototype` 上。

### ES6 class 与 ES5 的关键区别

| 特性 | ES5 构造函数 | ES6 class |
|------|-------------|-----------|
| **变量提升** | 有（可以先调用后声明） | **没有**（必须先声明后实例化） |
| **严格模式** | 默认非严格 | **默认严格模式** |
| **枚举性** | 原型方法可枚举 | 原型方法**不可枚举** |
| **调用方式** | 可以当作普通函数调用 | **必须用 `new` 调用** |

```javascript
// ❌ class 没有变量提升
const p = new Person(); // ReferenceError
class Person {}

// ❌ class 不能当作普通函数调用
Person(); // TypeError: Class constructor Person cannot be invoked without 'new'

// ✅ 方法不可枚举
console.log(Object.keys(Person.prototype)); // []
```

---

## 二、核心用法

### 2.1 constructor

`constructor` 是类的默认方法，`new` 实例化时自动调用。如果没有显式定义，引擎会自动添加一个空的 `constructor`。

```javascript
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
}

// 等价于
class Person {}
// 隐式 constructor() {}
```

### 2.2 实例属性 vs 原型方法

```javascript
class Person {
  // 实例属性（定义在 constructor 中）
  constructor(name) {
    this.name = name;
    this.greeting = '你好'; // 每个实例独立拥有
  }

  // 原型方法（定义在 prototype 上，实例共享）
  say() {
    console.log(`${this.greeting}，我是 ${this.name}`);
  }

  // 实例方法（箭头函数，每个实例独立）
  // 注意：这会占用更多内存，但能绑定 this
  say2 = () => {
    console.log(`${this.greeting}，我是 ${this.name}`);
  };
}

const a = new Person('小明');
const b = new Person('小红');

console.log(a.say === b.say);   // true（原型方法共享）
console.log(a.say2 === b.say2); // false（每个实例独立）
```

### 2.3 公共字段声明（ES2022 新语法）

```javascript
class Person {
  // 公共字段声明——不需要 constructor
  name = '匿名';
  age = 0;
  tags = [];

  constructor(name, age) {
    this.name = name; // 覆盖默认值
    this.age = age;
  }
}
```

### 2.4 Getter / Setter

```javascript
class User {
  constructor(firstName, lastName) {
    this.firstName = firstName;
    this.lastName = lastName;
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  set fullName(value) {
    [this.firstName, this.lastName] = value.split(' ');
  }
}

const user = new User('三', '张');
console.log(user.fullName); // 三 张（通过 getter 访问）
user.fullName = '四 李';    // 通过 setter 赋值
console.log(user.firstName); // 四
```

---

## 三、静态成员

### 3.1 静态方法与静态属性

```javascript
class MathUtils {
  // 静态属性（ES2022+）
  static PI = 3.1415926;

  // 静态方法
  static add(a, b) {
    return a + b;
  }

  // 静态方法中的 this 指向类本身
  static createDefault() {
    return new this(); // this === MathUtils
  }
}

console.log(MathUtils.PI);      // 3.1415926
console.log(MathUtils.add(1, 2)); // 3

// ❌ 实例无法访问静态成员
const utils = new MathUtils();
console.log(utils.PI);  // undefined
utils.add(1, 2);        // TypeError
```

### 3.2 静态方法与实例方法可以重名

```javascript
class Dog {
  static run() {
    console.log('静态：狗狗在跑');
  }

  run() {
    console.log('实例：🐕 在跑');
  }
}

Dog.run();       // 静态：狗狗在跑
new Dog().run(); // 实例：🐕 在跑
```

---

## 四、继承：extends 与 super

### 4.1 基础继承

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }

  speak() {
    console.log(`${this.name} 发出声音`);
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);     // 必须先调用 super 才能使用 this
    this.breed = breed;
  }

  speak() {
    super.speak();   // 调用父类方法
    console.log(`${this.name} 汪汪叫`);
  }
}

const dog = new Dog('旺财', '金毛');
dog.speak();
// 旺财 发出声音
// 旺财 汪汪叫
```

### 4.2 super 的两种用法

| 用法 | 位置 | 含义 |
|------|------|------|
| `super(参数)` | 子类构造函数中 | 调用父类构造函数 |
| `super.方法()` | 子类方法中 | 调用父类原型方法 |

**核心规则**：子类构造函数中，`this` 之前必须先调用 `super()`。

```javascript
class Child extends Parent {
  constructor() {
    // ❌ 错误：必须先 super
    // this.name = 'child';

    super();  // ✅ 必须先调用
    this.name = 'child';
  }
}
```

### 4.3 继承链

```javascript
class A {}
class B extends A {}
class C extends B {}

const obj = new C();
console.log(obj instanceof C); // true
console.log(obj instanceof B); // true
console.log(obj instanceof A); // true
console.log(obj instanceof Object); // true
// 原型链：obj → C.prototype → B.prototype → A.prototype → Object.prototype
```

### 4.4 内置类的继承

```javascript
class MyArray extends Array {
  // 覆盖数组方法，返回自定义类型
  first() {
    return this[0];
  }

  last() {
    return this[this.length - 1];
  }
}

const arr = new MyArray(1, 2, 3);
console.log(arr.first()); // 1
console.log(arr.last());  // 3
console.log(arr instanceof Array);  // true
console.log(arr instanceof MyArray); // true
```

---

## 五、私有字段（ES2022）

使用 `#` 前缀声明私有字段，**真正的私有**（不是靠约定）：

```javascript
class BankAccount {
  #balance = 0;      // 私有字段
  #owner;            // 私有字段（声明未赋值）

  constructor(owner, initial) {
    this.#owner = owner;
    this.#balance = initial;
  }

  deposit(amount) {
    if (amount <= 0) throw new Error('金额必须为正数');
    this.#balance += amount;
  }

  getBalance() {
    return `账户 ${this.#owner} 余额：${this.#balance}元`;
  }

  // ❌ 私有字段不能外部访问
  // 外部调用 account.#balance 会报 SyntaxError
}

const account = new BankAccount('张三', 1000);
account.deposit(500);
console.log(account.getBalance()); // 账户 张三 余额：1500元

// ❌ 外部无法访问私有字段
// console.log(account.#balance); // SyntaxError
```

**私有字段 vs 闭包模拟私有：**

| 方式 | 优点 | 缺点 |
|------|------|------|
| `#` 私有字段（ES2022） | 真正的私有，语义清晰 | 较新，旧环境需 transpile |
| `_` 下划线约定 | 简单 | 只是约定，不强制 |
| Closure 闭包 | 真正的私有 | 内存占用，无法继承 |
| WeakMap | 真正的私有 | 语法复杂 |

---

## 六、实战模式

### 6.1 单例模式

```javascript
class Singleton {
  static #instance;

  constructor() {
    if (Singleton.#instance) {
      return Singleton.#instance;
    }
    Singleton.#instance = this;
    this.createdAt = new Date();
  }

  static getInstance() {
    if (!Singleton.#instance) {
      new Singleton();
    }
    return Singleton.#instance;
  }
}

const a = new Singleton();
const b = new Singleton();
console.log(a === b); // true
```

### 6.2 Mixin 模式（组合优于继承）

```javascript
// 定义 Mixin 函数
const SayMixin = (Base) =>
  class extends Base {
    say(message) {
      console.log(`[${this.name}] ${message}`);
    }
  };

const LogMixin = (Base) =>
  class extends Base {
    log(...args) {
      console.log(`[LOG ${new Date().toISOString()}]`, ...args);
    }
  };

// 组合多个 Mixin
class Person extends LogMixin(SayMixin(Object)) {
  constructor(name) {
    super();
    this.name = name;
  }
}

const p = new Person('张三');
p.say('你好'); // [张三] 你好
p.log('debug'); // [LOG 2025-...] debug
```

### 6.3 方法链式调用

```javascript
class QueryBuilder {
  constructor() {
    this._query = {};
  }

  where(field, value) {
    this._query[field] = value;
    return this; // 返回 this 实现链式
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  orderBy(field, dir = 'asc') {
    this._order = { field, dir };
    return this;
  }

  build() {
    return { ...this._query, limit: this._limit, order: this._order };
  }
}

const query = new QueryBuilder()
  .where('age', 18)
  .where('city', '北京')
  .limit(10)
  .orderBy('createdAt', 'desc')
  .build();

console.log(query);
```

---

## 七、常见坑点

### 坑 1：this 丢失

```javascript
class Button {
  constructor(label) {
    this.label = label;
  }

  onClick() {
    console.log(`点击了 ${this.label}`);
  }
}

const btn = new Button('提交');

// ✅ 对象调用时 this 正确
btn.onClick(); // 点击了 提交

// ❌ 方法被提取后 this 丢失
const handler = btn.onClick;
handler(); // undefined（this 指向 undefined 或 window）

// ✅ 修复方式 1：箭头函数
class Button2 {
  constructor(label) {
    this.label = label;
  }
  onClick = () => {
    console.log(`点击了 ${this.label}`);
  };
}

// ✅ 修复方式 2：bind
// render() { return <button onClick={this.onClick.bind(this)} /> }

// ✅ 修复方式 3：箭头函数包装
// render() { return <button onClick={() => this.onClick()} /> }
```

### 坑 2：私有字段 vs TypeScript private

```javascript
class Example {
  #jsPrivate = 'ES2022 私有';    // ✅ 真正私有
  private tsPrivate = 'TS 私有'; // ❌ 仅编译时检查
}
```

`#` 是 JavaScript 语言级别的私有，而 TypeScript 的 `private` 只在编译时检查，运行时不生效。

### 坑 3：class 表达式不可提升

```javascript
// ❌ 不能先调用再声明
new MyClass(); // ReferenceError

// ✅ class 表达式（像函数表达式一样）
const MyClass = class {
  // ...
};
```

---

## 八、方案选型：class vs 工厂函数 vs 对象字面量

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 简单数据容器 | 对象字面量 `{}` | 轻量，无需 class |
| 需要私有状态 | class + `#` 私有字段 | 语义清晰 |
| 大量实例共享方法 | class | 原型方法节省内存 |
| 需要 Mixin / 组合 | 工厂函数 + 组合 | 更灵活，避免继承链过深 |
| 框架组件（React/Vue） | class 或 函数组件 | 按框架规范 |
| 需要 this 安全 | 箭头函数 + 工厂函数 | this 永远绑定 |

### 工厂函数替代 class

```javascript
function createPerson(name) {
  // 私有状态（闭包实现）
  let privateAge = 0;

  return {
    name,
    getAge() {
      return privateAge;
    },
    birthday() {
      privateAge++;
    },
  };
}
```

---

## 总结

| 掌握程度 | 应该能做什么 |
|---------|------------|
| ✅ Level 1 | 用 class 声明类、创建实例 |
| ✅ Level 2 | 理解 ES6 class 是语法糖，本质仍是原型链 |
| ✅ Level 3 | 掌握 extends/super 继承体系 |
| ✅ Level 4 | 使用 # 私有字段、getter/setter、静态成员 |
| ✅ Level 5 | Mixin 组合、单例模式、链式调用等实战模式 |
| ✅ Level 6 | 能在 class、工厂函数、对象字面量之间做合适选型 |

**推荐阅读：**
- [MDN: Classes](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Classes)
- [ES6 入门 - Class](https://es6.ruanyifeng.com/#docs/class)
- [ES2022 私有字段提案](https://github.com/tc39/proposal-class-fields)
