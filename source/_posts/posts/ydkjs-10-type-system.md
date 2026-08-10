---
title: "你不知道的JavaScript（十）：JavaScript 的类型系统——七大内置类型深度解析"
date: 2026-06-26
categories: "你不知道的javascript"
description: "JavaScript 有七种内置类型：null、undefined、boolean、number、string、object、symbol。深入解析每种类型的本质、边界情况和常见误区"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

JavaScript 的类型系统经常被评价为"有坑"。但实际上，理解这些"坑"背后的原则后，一切都是可预测的。

JavaScript 有 **7 种内置类型**（ES2020 新增 BigInt 后为 8 种）：

```
原始类型（Primitive）：undefined, null, boolean, number, string, symbol, bigint
引用类型（Object）：object（包括 array, function, date, regexp 等）
```

---

## 一、typeof 操作符

`typeof` 用于检测值的类型，但它并不完全准确：

```javascript
typeof undefined     // 'undefined'
typeof true          // 'boolean'
typeof 42           // 'number'
typeof 'hello'      // 'string'
typeof Symbol()     // 'symbol'
typeof 123n         // 'bigint'
typeof {}           // 'object'

// 特殊
typeof null         // 'object'  ❌ 这是一个著名的 bug
typeof function(){} // 'function' ✅ 但 function 不是一种单独的类型
typeof []           // 'object'
```

### 1.1 为什么 typeof null === 'object'？

这是 JavaScript 的第一个版本就存在的 bug。当时的值用 32 位存储，类型标签用低 3 位表示：

```
000: object
001: int
010: double
100: string
110: boolean
```

`null` 的机器码是**全 0**（0x00），被误识别为 `object` 类型（000）。

虽然这个 bug 在后续版本中可以修复，但修复后会破坏大量现有代码，所以**官方决定保留这个 bug**。

**正确判断 null**：

```javascript
function isNull(value) {
  return value === null
}
// 注意：!value && typeof value === 'object' 不能判断 null
// 因为 0、''、false 也会使 !value 为 true
```

---

## 二、undefined vs null

### 2.1 语义区别

| | undefined | null |
|------|-----------|------|
| **语义** | 未赋值、不存在 | 空值、无值 |
| **类型** | 单独类型 | 特殊对象 |
| **typeof** | `'undefined'` | `'object'` |
| **JSON** | 序列化时被忽略 | 序列化为 `null` |
| **默认值** | 变量未赋值 | 开发者主动设置 |
| **数值转换** | `Number(undefined)` → `NaN` | `Number(null)` → `0` |

### 2.2 常见产生 undefined 的场景

```javascript
// 1. 未赋值的变量
let a
console.log(a) // undefined

// 2. 访问对象不存在的属性
const obj = {}
console.log(obj.x) // undefined

// 3. 函数没有 return
function foo() {}
console.log(foo()) // undefined

// 4. 函数参数未传
function bar(x) {
  console.log(x) // undefined
}
bar()

// 5. 数组中不存在的元素
const arr = [1, , 3]
console.log(arr[1]) // undefined
```

### 2.3 使用建议

```javascript
// ✅ 主动设置"空值"用 null
let user = null // 用户对象还没加载

// ✅ 未初始化的变量
let config         // 准备赋值但还没确定

// ✅ 函数返回"无结果"
function findUser(id) {
  // ... 没找到返回 null
  return null
}

// 区分 "还没有"（undefined）和"就是没有"（null）
```

---

## 三、boolean

### 3.1 假值（Falsy Values）

以下值在转换为布尔时为 `false`：

```javascript
Boolean(false)        // false
Boolean(0)            // false
Boolean(-0)           // false
Boolean(0n)           // false
Boolean('')           // false
Boolean(null)         // false
Boolean(undefined)    // false
Boolean(NaN)          // false
```

**其他所有值**都是真值（Truthy）。

### 3.2 常见的真值陷阱

```javascript
// 空数组是真值
if ([]) {
  console.log('执行了') // 会执行！
}

// 空对象是真值
if ({}) {
  console.log('执行了') // 会执行！
}

// 'false' 字符串是真值
if ('false') {
  console.log('执行了') // 会执行！
}

// 检查数组是否为空
function isEmpty(arr) {
  return arr.length === 0 // ✅ 正确
  // return !arr          // ❌ [] 是真值
}
```

---

## 四、number

### 4.1 JavaScript 只有一种数字类型

**JavaScript 没有整数类型**——所有数字都是 64 位双精度浮点数（IEEE 754）：

```javascript
typeof 42    // 'number'
typeof 3.14 // 'number'
typeof NaN  // 'number'
typeof Infinity // 'number'
```

### 4.2 浮点数精度问题

```javascript
0.1 + 0.2 === 0.3 // false！
// 实际是 0.30000000000000004

// 为什么？
// 0.1 和 0.2 在二进制中都是无限循环小数
// 0.1 → 0.00011001100110011...（无限循环）
// 计算机只能截取有限位，导致精度丢失
```

**解决方案**：

```javascript
// 方案1：设置容差
function isEqual(a, b, epsilon = Number.EPSILON) {
  return Math.abs(a - b) < epsilon
}
isEqual(0.1 + 0.2, 0.3) // true

// 方案2：转为整数运算
function add(a, b) {
  const factor = 10 ** Math.max(
    (a.toString().split('.')[1] || '').length,
    (b.toString().split('.')[1] || '').length,
  )
  return (a * factor + b * factor) / factor
}
add(0.1, 0.2) // 0.3

// 方案3：使用像 decimal.js 这样的库
```

### 4.3 NaN

`NaN`（Not a Number）是一个特殊的 number：

```javascript
typeof NaN // 'number'

// 产生 NaN 的场景
Number('abc') // NaN
Math.sqrt(-1) // NaN
0 / 0        // NaN
undefined + 1 // NaN
```

**NaN 的特性**：

```javascript
NaN === NaN // false（NaN 是唯一不等于自身的值）

// 正确判断 NaN
isNaN(NaN)               // true
Number.isNaN(NaN)        // true（推荐）
Object.is(NaN, NaN)      // true（Object.is 可以正确比较 NaN）

// 坑：全局 isNaN 会先做类型转换
isNaN('hello')     // true（'hello' 被转换为 NaN）
Number.isNaN('hello') // false（不会先转换）
```

### 4.4 零的两种形态

```javascript
0 === -0 // true（但它们在底层表示不同）

// 区别它们的唯一方式
Object.is(0, -0)  // false

// -0 的实际用途
1 / 0   // Infinity
1 / -0  // -Infinity
```

---

## 五、string

### 5.1 不可变性

字符串是**不可变**的——任何操作都返回新字符串：

```javascript
let str = 'hello'
str[0] = 'H'  // 没有效果，也不报错（严格模式才报错）
console.log(str) // 'hello'

// 必须重新赋值
str = 'H' + str.slice(1) // 'Hello'
```

### 5.2 字符串与字符数组

```javascript
// 字符串不是数组！
const str = 'hello'
const arr = ['h', 'e', 'l', 'l', 'o']

console.log(str.length)  // 5
console.log(arr.length)  // 5

// 但可以用数组方法
Array.prototype.join.call(str, '-') // 'h-e-l-l-o'
Array.prototype.map.call(str, c => c.toUpperCase()) // ['H', 'E', 'L', 'L', 'O']
```

### 5.3 特殊字符

```javascript
// Emoji 实际由两个码点组成
'😀'.length // 2（不是 1！）

// 正确计算字符数
[...'😀'].length          // 1
Array.from('😀').length  // 1

// 反向索引的问题
'hello'[-1]  // undefined（不是 'o'）
'hello'.slice(-1) // 'o' ✅
```

---

## 六、symbol

Symbol 是 ES6 引入的**唯一且不可变**的原始类型：

```javascript
// 创建
const s1 = Symbol()
const s2 = Symbol('description') // 描述仅用于调试

// 每次创建都是唯一的
Symbol() === Symbol() // false

// 可以用作对象属性的键
const id = Symbol('id')
const user = { name: 'LC' }
user[id] = 12345

// Symbol 属性不会被常规方法遍历
Object.keys(user)   // ['name']
JSON.stringify(user) // '{"name":"LC"}'
Object.getOwnPropertySymbols(user) // [Symbol(id)]

// 内置的 Symbol
Symbol.iterator  // 用于迭代器
Symbol.toStringTag // Object.prototype.toString 使用
Symbol.hasInstance // instanceof 使用
```

---

## 七、Object（引用类型）

### 7.1 原始类型 vs 引用类型

```javascript
// 原始类型：值比较
let a = 42
let b = 42
a === b // true（值相等）

// 引用类型：引用比较
let c = { x: 1 }
let d = { x: 1 }
c === d // false（不同引用）
let e = c
c === e // true（同一引用）
```

### 7.2 包装对象

原始类型不是对象，但 JavaScript 提供了"包装对象"（Wrapper Object）：

```javascript
// 原始类型本身没有方法
const str = 'hello'
str.toUpperCase() // 'HELLO' — 等一下，原始类型怎么有方法？

// 实际过程：
// 1. 引擎临时创建 String 包装对象: new String(str)
// 2. 在这个包装对象上调用 toUpperCase
// 3. 用完就丢弃

// 类似的还有：
const num = 42
num.toFixed(2) // '42.00'（Number 包装对象）

const bool = true
bool.toString() // 'true'（Boolean 包装对象）
```

**不建议手动创建包装对象**：

```javascript
// ❌ 不要这样做
const str = new String('hello')
typeof str // 'object'（不是 'string'！）

// ✅ 直接用原始值
const str = 'hello'
```

---

## 八、类型判断综合

```javascript
// 最可靠的类型判断方式
function getType(value) {
  // null 特殊处理
  if (value === null) return 'null'

  // 基本类型
  const type = typeof value
  if (type !== 'object') return type

  // 对象类型使用 toString
  return Object.prototype.toString
    .call(value)
    .slice(8, -1)
    .toLowerCase()
}

console.log(getType(null))              // 'null'
console.log(getType([]))               // 'array'
console.log(getType({}))               // 'object'
console.log(getType(new Date()))       // 'date'
console.log(getType(/regex/))          // 'regexp'
console.log(getType(new Map()))        // 'map'
console.log(getType(new Set()))        // 'set'
console.log(getType(Promise.resolve())) // 'promise'
```

---

## 总结

1. **JavaScript 有 7 种基本类型**：undefined, null, boolean, number, string, symbol, object
2. **`typeof null === 'object'`** 是一个无法修复的历史 bug
3. **`undefined`** 表示"未赋值"，**`null`** 表示"空值"
4. **所有数字都是浮点数**，注意浮点数精度问题（0.1 + 0.2 ≠ 0.3）
5. **NaN 是唯一的"不等于自身"的值**
6. **字符串不可变**，Emoji 长度是 2
7. **Symbol** 提供唯一标识，不会在遍历中出现
8. **引用类型按引用比较**，原始类型按值比较

> 下一篇将深入研究**值**——数组、字符串、数字的特殊行为。
