---
title: "你不知道的JavaScript（十二）：原生函数——String、Number、Boolean、Array、Object 的内幕"
date: 2026-06-26
categories: "你不知道的javascript"
description: "JavaScript 的内建原生函数（String、Number、Boolean 等）不仅仅是构造函数，它们的行为与原始类型有本质区别。深入解析包装对象、内部槽位、[[Class]] 标签"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

JavaScript 提供了几个内建的原生函数（Native Functions）：

```javascript
String()
Number()
Boolean()
Array()
Object()
Function()
RegExp()
Date()
Error()
Symbol()
BigInt()
```

这些看起来像"类"，但它们的行为和原始类型有根本区别。理解它们的本质是避免 bug 的关键。

---

## 一、原生函数是构造函数

### 1.1 构造 vs 不带 new

```javascript
// 带 new：创建包装对象
const s1 = new String('hello')
console.log(typeof s1) // 'object'
console.log(s1)        // [String: 'hello']

// 不带 new：类型转换
const s2 = String('hello')
console.log(typeof s2) // 'string'
console.log(s2)        // 'hello'

// 不同点
s1 === s2 // false（object vs string）
s1 == s2  // true（类型转换后相等）
```

### 1.2 为什么很少看到 new String/Number/Boolean

因为 JavaScript 引擎会在需要时**自动**创建包装对象：

```javascript
const str = 'hello'

// 看起来是原始类型调用了方法
str.toUpperCase()
// 实际过程：
// 1. 引擎创建 new String(str)
// 2. 在这个包装对象上调用 toUpperCase
// 3. 返回结果后丢弃包装对象
```

手动用 new 创建包装对象**通常是不必要的**，而且会带来问题：

```javascript
const a = new Boolean(false)

if (a) {
  console.log('执行了！') // 会执行！
}

// 因为 a 是对象（真值），即使它包装的值是 false
```

---

## 二、内部 [[Class]] 标签

每个对象的内部都有一个 `[[Class]]` 属性（ES5 概念，ES6 后被 Symbols 替代），用于表示对象的内部类型：

```javascript
// 通过 Object.prototype.toString 查看
Object.prototype.toString.call(null)         // '[object Null]'
Object.prototype.toString.call(undefined)    // '[object Undefined]'
Object.prototype.toString.call('hello')      // '[object String]'
Object.prototype.toString.call(42)           // '[object Number]'
Object.prototype.toString.call(true)         // '[object Boolean]'
Object.prototype.toString.call([])           // '[object Array]'
Object.prototype.toString.call({})           // '[object Object]'
Object.prototype.toString.call(/regex/)      // '[object RegExp]'
Object.prototype.toString.call(new Date())   // '[object Date]'
Object.prototype.toString.call(function(){}) // '[object Function]'
```

**原始类型偷懒现象**：

原始类型没有 `[[Class]]`，但当调用 `toString` 时，引擎会临时创建包装对象，拿到 `[[Class]]` 后丢弃。

---

## 三、Array 构造函数

### 3.1 诡异的行为

```javascript
// 单参数数字：被当作数组长度
new Array(3)       // [empty × 3]
new Array('3')     // ['3']（字符串被当作元素）

// 多参数：正常作为元素
new Array(1, 2, 3) // [1, 2, 3]
new Array(3, 4)    // [3, 4]

// 一个参数的边界
new Array(-1)      // ❌ RangeError（长度不能为负）
new Array(0)       // []
new Array(4294967296) // ❌ RangeError（超过最大长度 2^32 - 1）
```

**建议**：始终使用数组字面量 `[]` 而不是 `new Array()`。

### 3.2 空数组的特殊行为

```javascript
const arr = new Array(3)

// 这些方法会"尊重"空位
arr.map(x => x + 1)   // [empty × 3]（回调不会执行）
arr.forEach(x => {})  // 不会执行回调

// 但 fill 会填充
arr.fill(0)           // [0, 0, 0]

// 新方法会填充空位
Array.from(new Array(3)) // [undefined, undefined, undefined]
```

---

## 四、Object 构造函数

### 4.1 包装对象

```javascript
// 基本行为
new Object()       // {}
new Object(null)   // {}（null 和 undefined 返回空对象）
new Object(undefined) // {}

// 包装原始类型
new Object('hello') // [String: 'hello']
new Object(42)      // [Number: 42]
new Object(true)    // [Boolean: true]
```

### 4.2 Object.keys vs Object.getOwnPropertyNames

```javascript
const obj = {}
obj.a = 1

Object.defineProperty(obj, 'b', {
  value: 2,
  enumerable: false,
})

Object.keys(obj)                 // ['a']（仅可枚举属性）
Object.getOwnPropertyNames(obj)  // ['a', 'b']（所有自身属性）
```

---

## 五、Function 构造函数

### 5.1 危险的 Function

```javascript
// 动态创建函数（不推荐）
const add = new Function('a', 'b', 'return a + b')
add(1, 2) // 3

// 等同于
function add(a, b) { return a + b }
```

**危险之处**：
- 函数体是字符串，有注入风险
- 创建的函数在全局作用域中（无法形成闭包）
- 性能差（无法优化）
- 等同于 `eval`

### 5.2 function name 属性

```javascript
const foo = function() {}
console.log(foo.name) // 'foo'

const bar = function baz() {}
console.log(bar.name) // 'baz'

class MyClass {}
console.log(MyClass.name) // 'MyClass'

const obj = {
  method() {},
  get getter() {},
  set setter(v) {},
}
console.log(obj.method.name) // 'method'
```

---

## 六、RegExp 构造函数

```javascript
// 字面量 vs 构造函数
const r1 = /[a-z]+/gi
const r2 = new RegExp('[a-z]+', 'gi')

// 动态创建
const pattern = '[a-z]+'
const flags = 'gi'
const r3 = new RegExp(pattern, flags)
```

**注意**：
- 正则是**对象**（不是原始类型）
- 正则字面量在 ES5 后**共享同一个对象**
- 构造函数创建的每次都是新的

```javascript
// 正则的"粘性"匹配（ES6）
const str = 'hello world'
const regex = /\w+/y

regex.lastIndex = 0
regex.exec(str) // ['hello']

regex.lastIndex = 6
regex.exec(str) // ['world']（y 标志从 lastIndex 开始精确匹配）
```

---

## 七、Date 构造函数

```javascript
// 当前时间
new Date() // 当前时间

// 时间戳（毫秒）
new Date(1625097600000)

// 字符串解析（不推荐——不同浏览器格式不同）
new Date('2025-06-25')

// 推荐：分别传参（月份 0-11）
new Date(2025, 5, 25) // 2025年6月25日
new Date(2025, 5, 25, 10, 30, 0)

// 现在的时间戳
Date.now() // 1625097600000

// 解析字符串（不推荐——行为不一致）
Date.parse('2025-06-25') // 1625097600000
```

### 7.1 Date 的奇怪行为

```javascript
new Date(2025, 5, 25)  // 6月25日（月份 0-based）
new Date(2025, 5)      // 6月1日
new Date(2025)          // 不是2025年！是1970年 + 2025ms

// 正确传参
new Date('2025-06-25')  // ✅
new Date(2025, 5, 25)   // ✅（注意月份 0-based）
```

---

## 八、Error 构造函数

```javascript
// 各种错误类型
new Error('一般错误')
new TypeError('类型不对')
new ReferenceError('引用错误')
new SyntaxError('语法错误')
new RangeError('超出范围')
new URIError('URI 错误')

// 自定义错误
class ValidationError extends Error {
  constructor(message, field) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

try {
  throw new ValidationError('用户名不能为空', 'username')
} catch (e) {
  console.log(e.name)   // 'ValidationError'
  console.log(e.field)  // 'username'
  console.log(e.message) // '用户名不能为空'
  console.log(e.stack)  // 调用栈
}
```

---

## 九、Symbol 构造函数

```javascript
// Symbol 不能带 new！
new Symbol() // ❌ TypeError: Symbol is not a constructor

// 正确用法
Symbol('描述')
Symbol.for('全局') // 注册到全局 Symbol 注册表
Symbol.keyFor(Symbol.for('全局')) // '全局'

// 常见用途
const EVENT = Symbol.for('app:event')
const obj = {
  [EVENT]: 'click',
  // 不会出现在 Object.keys 中
}
```

---

## 十、toStringTag 和 Symbol.species

### 10.1 Symbol.toStringTag

ES6 允许自定义对象的 `[[Class]]` 标签：

```javascript
class MyArray {
  get [Symbol.toStringTag]() {
    return 'MyArray'
  }
}

const ma = new MyArray()
Object.prototype.toString.call(ma) // '[object MyArray]'
```

### 10.2 Symbol.species

控制哪些构造函数用于衍生对象：

```javascript
class MyArray extends Array {
  static get [Symbol.species]() { return Array }
}

const a = new MyArray(1, 2, 3)
const b = a.map(x => x * 2)

console.log(a instanceof MyArray) // true
console.log(b instanceof MyArray) // false（b 是 Array 实例）
// Symbol.species 告诉 map 使用 Array 而不是 MyArray
```

---

## 总结

1. **原生函数带 new 创建包装对象**（typeof 为 object），不带 new 做类型转换
2. **尽量不要手动创建包装对象**——引擎会自动创建
3. **`[[Class]]` 标签**可通过 `Object.prototype.toString.call()` 查看
4. **Array 单参数数字**被当作数组长度（使用字面量 `[]` 避免问题）
5. **Function 构造函数**类似 eval，有安全风险
6. **Date 的月份是 0-based**（0=一月，5=六月）
7. **Error 应该子类化**——自定义错误类型更易调试
8. **Symbol 不能带 new**，它是函数不是构造函数

> 下一篇将深入**强制类型转换**——JavaScript 中最容易被误解的机制。
