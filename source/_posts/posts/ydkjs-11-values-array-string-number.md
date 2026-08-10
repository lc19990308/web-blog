---
title: "你不知道的JavaScript（十一）：值的底层机制——数组、字符串、数字的特殊行为"
date: 2026-06-26
categories: "你不知道的javascript"
description: "深入 JavaScript 中数组、字符串、数字三大值类型的底层行为：稀疏数组、类数组、数字的整数范围、字符串的码点与码元"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

JavaScript 中的数组、字符串和数字看起来简单，但底层有很多"反直觉"的行为：

- 数组为什么可以用字符串做索引？
- 类数组（Array-Like）到底是什么？
- 字符串的长度为什么不是字符数？
- 数字的安全整数范围是多少？

本文逐一深入这些值的底层机制。

---

## 一、数组

### 1.1 数组不是数组

JavaScript 的"数组"不是真正意义上的数组——它实际上是**对象**：

```javascript
const arr = [1, 2, 3]
console.log(typeof arr) // 'object'
console.log(arr instanceof Array) // true

// 底层：arr 本质上是一个对象
// { '0': 1, '1': 2, '2': 3, length: 3 }
```

### 1.2 可以用字符串做索引

因为数组本质是对象，所以可以用字符串索引：

```javascript
const arr = []
arr[0] = '数字索引'
arr['foo'] = '字符串索引'

console.log(arr[0])      // '数字索引'
console.log(arr['foo'])  // '字符串索引'
console.log(arr.length)  // 1（字符串索引不影响 length）
```

当字符串索引可以转为正整数时，它会像数字索引一样工作：

```javascript
const arr = []
arr['3'] = '第三个位置'
console.log(arr.length) // 4（'3' 被当作数字 3）
console.log(arr[3])     // '第三个位置'
```

### 1.3 稀疏数组（Sparse Arrays）

```javascript
const arr = [1, , , 4]  // 逗号之间有空位
console.log(arr.length) // 4
console.log(arr[0])     // 1
console.log(arr[1])     // undefined（实际是 empty）
console.log(arr[2])     // undefined（empty）
console.log(arr[3])     // 4

// empty 和 undefined 的微妙区别
// empty 表示这个索引"不存在"
console.log(0 in arr)  // true（索引 0 存在）
console.log(1 in arr)  // false（索引 1 不存在！）
console.log(2 in arr)  // false
console.log(3 in arr)  // true
```

**稀疏数组对数组方法的影响**：

```javascript
const sparse = [1, , , 4]
const dense = [1, undefined, undefined, 4]

// forEach 跳过空位
sparse.forEach((v, i) => console.log(i, v)) // 0:1, 3:4
dense.forEach((v, i) => console.log(i, v))  // 0:1, 1:undefined, 2:undefined, 3:4

// map 保留空位
console.log(sparse.map(v => v * 2)) // [2, empty × 2, 8]
console.log(dense.map(v => v * 2))  // [2, NaN, NaN, 8]

// join 把空位处理为空字符串
console.log(sparse.join('-')) // '1--4'
console.log(dense.join('-'))  // '1--4'

// Array.from 填充空位
console.log(Array.from([1, , , 4])) // [1, undefined, undefined, 4]
```

### 1.4 类数组（Array-Like）

具有 `length` 属性和按数字索引的元素的"对象"：

```javascript
// 类数组对象
const arrayLike = {
  0: 'a',
  1: 'b',
  2: 'c',
  length: 3,
}

console.log(arrayLike[0]) // 'a'
console.log(arrayLike.length) // 3

// 类数组不是数组
Array.isArray(arrayLike) // false
arrayLike.push('d')      // ❌ TypeError

// 将类数组转为真正的数组
const arr1 = Array.prototype.slice.call(arrayLike)
const arr2 = Array.from(arrayLike) // ✅ 推荐
const arr3 = [...arrayLike]        // ✅ 需有迭代器（Array.from 更通用）

// 常见的类数组
// arguments（旧式函数）
function foo() {
  console.log(arguments) // Arguments(3) [1, 2, 3]
  console.log(Array.from(arguments)) // [1, 2, 3]
}
foo(1, 2, 3)

// NodeList（DOM）
// document.querySelectorAll('div')
```

---

## 二、字符串

### 2.1 字符串不是字符数组

```javascript
const str = 'hello'

// 可索引（像数组）
console.log(str[0]) // 'h'
console.log(str.length) // 5

// 但不可变
str[0] = 'H'
console.log(str) // 'hello'（没变）

// 没有数组方法
str.push('!')  // ❌ TypeError
str.join('-')  // ❌ TypeError

// 借用数组方法
Array.prototype.join.call(str, '-') // 'h-e-l-l-o'
Array.prototype.filter.call(str, c => c > 'k').join('') // 'l-lo'
```

### 2.2 码元（Code Unit）与码点（Code Point）

JavaScript 使用 **UTF-16** 编码，大部分字符用一个码元（16 位）表示，但有些字符需要两个码元：

```javascript
// BMP 字符（基本多语言平面）：一个码元
'hello'.length     // 5
'A'.length         // 1
'中'.length        // 1

// 辅助平面字符（如 Emoji）：两个码元
'😀'.length        // 2！
'🌍'.length        // 2！
'𠮷'.length        // 2！（这是汉字"吉"的异体）

// 组合字符（字符 + 组合符号）
'é'.length         // 1
'e\u0301'.length   // 2（e + 重音符号）
```

**正确计算"字符"数**：

```javascript
function charCount(str) {
  // 方法1：使用扩展运算符
  return [...str].length
}

function charCount(str) {
  // 方法2：Array.from
  return Array.from(str).length
}

console.log(charCount('😀'))  // 1（正确）
console.log(charCount('𠮷'))  // 1（正确）
```

### 2.3 反转字符串

```javascript
// 简单反转
function reverse(str) {
  return str.split('').reverse().join('')
}

reverse('hello') // 'olleh'

// 但这样不能处理 Emoji
reverse('hello😀') // '��olleh'（Emoji 被拆开）

// 正确反转
function reverseSafe(str) {
  return [...str].reverse().join('')
}

reverseSafe('hello😀') // '😀olleh' ✅
```

---

## 三、数字

### 3.1 数字的表示范围

```javascript
// 最大值
Number.MAX_VALUE        // 1.7976931348623157e+308
Number.MIN_VALUE        // 5e-324（正数最小值）

// 安全整数范围（能精确表示的整数）
Number.MAX_SAFE_INTEGER // 9007199254740991 (2^53 - 1)
Number.MIN_SAFE_INTEGER // -9007199254740991

// 不安全整数示例
9007199254740991 + 1     // 9007199254740992 ✅
9007199254740991 + 2     // 9007199254740992 ❌（精度丢失！）
9007199254740991 + 3     // 9007199254740994 ❌
```

**为什么是 2^53 - 1？**

64 位双精度浮点数中，1 位符号位，11 位指数位，52 位尾数位。加上隐含的 1，实际上可以精确表示 53 位二进制整数。超过这个范围就会出现精度丢失。

### 3.2 整数的判断

```javascript
// 判断是否为整数
Number.isInteger(42)       // true
Number.isInteger(3.14)     // false
Number.isInteger(42.0)     // true（42.0 === 42）

// 判断是否为安全整数
Number.isSafeInteger(42)               // true
Number.isSafeInteger(9007199254740991) // true
Number.isSafeInteger(9007199254740992) // false！

// 老方式的整数判断
function isInteger(num) {
  return typeof num === 'number' && num % 1 === 0
}
```

### 3.3 数字的各种进制

```javascript
// 二进制
0b1111  // 15
0b1010  // 10

// 八进制（严格模式只能使用前缀 0o）
0o17    // 15（推荐）
// 017   // 旧写法，严格模式禁用

// 十六进制
0xFF    // 255
0x1A    // 26

// 转换成其他进制
(255).toString(16)  // 'ff'
(255).toString(2)   // '11111111'
(255).toString(8)   // '377'

// 从其他进制解析
parseInt('ff', 16)  // 255
parseInt('11111111', 2) // 255
parseInt('377', 8)  // 255

// 注意：parseInt 的第二个参数默认为 16（不是 10）！
parseInt('0x10')  // 16
parseInt('10')    // 10
```

### 3.4 数字的几种奇怪比较

```javascript
// 1. +0 与 -0
Object.is(0, -0)   // false
0 === -0           // true ❌
1 / 0   // Infinity
1 / -0  // -Infinity

// 2. NaN 与 NaN
Object.is(NaN, NaN) // true（Object.is 可以正确比较）
NaN === NaN         // false（经典 bug）
Number.isNaN(value) // ✅ 正确判断

// 3. 浮点数
0.1 + 0.2 === 0.3  // false（浮点数精度问题）
```

---

## 四、值的复制

### 4.1 浅复制 vs 深复制

```javascript
// 浅复制：只复制第一层
const original = { a: 1, b: { c: 2 } }

// 浅复制方法
const copy1 = Object.assign({}, original)
const copy2 = { ...original }

console.log(copy1.b === original.b) // true（共享引用）
copy1.b.c = 99
console.log(original.b.c) // 99（被改了！）
```

```javascript
// 深复制：完全独立的副本

// 方法1：JSON（有限制）
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}
// 问题：不支持 undefined、Symbol、函数、循环引用

// 方法2：structuredClone（现代浏览器，Node 17+）
const copy = structuredClone(original)
// 支持大多数类型，但不支持函数、Symbol

// 方法3：递归实现
function deepClone(value, cache = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value

  // 处理循环引用
  if (cache.has(value)) return cache.get(value)

  // 处理 Date
  if (value instanceof Date) return new Date(value)

  // 处理 RegExp
  if (value instanceof RegExp) return new RegExp(value)

  // 处理数组
  if (Array.isArray(value)) {
    const result = []
    cache.set(value, result)
    value.forEach((item, index) => {
      result[index] = deepClone(item, cache)
    })
    return result
  }

  // 处理普通对象
  const result = {}
  cache.set(value, result)
  Object.keys(value).forEach(key => {
    result[key] = deepClone(value[key], cache)
  })
  return result
}
```

---

## 总结

1. **数组本质是对象**，可以有空位（sparse），类数组可通过 `Array.from` 转换
2. **字符串是 UTF-16 编码**，Emoji 等辅助平面字符占 2 个码元（length 为 2）
3. **安全整数范围**：`-(2^53-1)` 到 `2^53-1`，超过可能精度丢失
4. **值与引用**：原始类型按值传递，对象按引用传递
5. **深复制**推荐使用 `structuredClone`（浏览器/Node 17+）或递归实现

> 下一篇将深入**原生函数**——String、Number、Boolean 等内置构造函数的秘密。
