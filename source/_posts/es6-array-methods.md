---
title: "ES6+ 新增数组方法：find、flat、flatMap、from、of 与 Typed Arrays"
date: 2026-06-25
categories: "ES6"
description: "全面梳理 ES6 以来新增的数组方法与特性：Array.from、Array.of、find/findIndex、includes、flat/flatMap、fill/copyWithin，以及类型化数组 TypedArray"
tags: ["ES6", "JavaScript"]
copyright: true
---

## 前言

ES6+ 给数组添加了大量实用方法，很多以前需要手写循环或第三方库（lodash）的操作，现在都有原生实现。

| ES5 | ES6+ |
|-----|------|
| `for` 循环 | `find`、`findIndex` |
| `indexOf`（NaN 不匹配） | `includes` |
| 手写展平 | `flat`、`flatMap` |
| `[].slice.call()` 转数组 | `Array.from` |
| 手动创建指定参数数组 | `Array.of` |
| 循环初始化 | `fill` |

---

## 一、Array.from

将**类数组**或**可迭代对象**转为真正的数组：

```javascript
// 1. 类数组 → 数组
function getArgs() {
  return Array.from(arguments)
}
getArgs(1, 2, 3) // [1, 2, 3]

// 2. NodeList → 数组
const divs = document.querySelectorAll('div')
const divArray = Array.from(divs)

// 3. Set/Map → 数组
const set = new Set([1, 2, 3])
Array.from(set) // [1, 2, 3]

// 4. 字符串 → 数组（支持 Unicode）
Array.from('hello')    // ['h', 'e', 'l', 'l', 'o']
Array.from('😀👍')     // ['😀', '👍']（正确，不会拆开）
'😀👍'.split('')       // ['\uD83D', '\uDE00', '\uD83D', '\uDC4D']（错误）
```

### Array.from 的 map 回调

```javascript
// 第二个参数类似 map
Array.from([1, 2, 3], x => x * 2) // [2, 4, 6]

// 生成数字序列
Array.from({ length: 5 }, (_, i) => i + 1) // [1, 2, 3, 4, 5]

// 生成 0 填充的数组
Array.from({ length: 3 }, () => 0) // [0, 0, 0]

// 生成随机颜色
const colors = Array.from({ length: 5 }, () =>
  `#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')}`
)
```

---

## 二、Array.of

`Array.of` 修复了 `new Array()` 的单参数问题：

```javascript
// new Array 的单参数行为诡异
new Array(3)     // [empty × 3]（长度 3 的空数组）
new Array(3, 4)  // [3, 4]（正常当作元素）

// Array.of 始终将参数作为元素
Array.of(3)      // [3] ✅
Array.of(3, 4)   // [3, 4] ✅
Array.of()       // []
```

---

## 三、find / findIndex

在数组中查找符合条件的元素，比 `for` 循环更简洁：

```javascript
const users = [
  { id: 1, name: 'LC', age: 25 },
  { id: 2, name: 'AtomCode', age: 1 },
  { id: 3, name: 'Admin', age: 30 },
]

// find —— 返回第一个符合条件的元素
const found = users.find(user => user.id === 2)
console.log(found) // { id: 2, name: 'AtomCode', age: 1 }

// findIndex —— 返回索引
const index = users.findIndex(user => user.name === 'Admin')
console.log(index) // 2

// 没找到
const notFound = users.find(user => user.id === 99)
console.log(notFound) // undefined

const notFoundIndex = users.findIndex(user => user.id === 99)
console.log(notFoundIndex) // -1
```

### find vs filter vs some

```javascript
// find：返回第一个匹配的元素（或 undefined）
// filter：返回所有匹配的数组
// some：返回 Boolean

const data = [1, 3, 5, 7, 9]

// 我想找到第一个大于 5 的值
const r1 = data.find(x => x > 5)  // 7

// 我想找到所有大于 5 的值
const r2 = data.filter(x => x > 5) // [7, 9]

// 我想知道是否存在大于 5 的值
const r3 = data.some(x => x > 5)  // true
```

### findLast / findLastIndex（ES2023）

```javascript
// 从后往前查找
const arr = [1, 2, 3, 4, 5]

arr.find(x => x > 3)       // 4（第一个）
arr.findLast(x => x > 3)   // 5（最后一个）

arr.findIndex(x => x > 3)      // 3（正数第 3 个）
arr.findLastIndex(x => x > 3)  // 4（倒数第 1 个）
```

---

## 四、includes

判断数组是否包含某个值：

```javascript
const arr = [1, 2, 3, NaN]

// ES5 indexOf —— 不能查找 NaN
arr.indexOf(1)      // 0
arr.indexOf(4)      // -1
arr.indexOf(NaN)    // -1 ❌（NaN !== NaN）

// ES2016 includes —— 可以查找 NaN
arr.includes(1)     // true
arr.includes(4)     // false
arr.includes(NaN)   // true ✅
```

**实用场景**：

```javascript
const roles = ['admin', 'user', 'guest']

// 以前
if (roles.indexOf('admin') !== -1) { }

// 现在
if (roles.includes('admin')) { }

// 多个条件判断
const hasPermission = ['admin', 'superadmin'].includes(user.role)
```

---

## 五、flat / flatMap

### 5.1 flat — 数组展平

```javascript
const nested = [1, [2, [3, [4]]]]

// 默认展平一层
nested.flat()     // [1, 2, [3, [4]]]

// 指定层数
nested.flat(2)   // [1, 2, 3, [4]]
nested.flat(3)   // [1, 2, 3, 4]
nested.flat(Infinity) // [1, 2, 3, 4]（全部展平）

// 去掉数组中的空位
[1, , 2, , 3].flat() // [1, 2, 3]
```

### 5.2 flatMap — 先 map 再 flat(1)

```javascript
const sentences = ['hello world', 'foo bar']

// map 后再 flat
sentences.map(s => s.split(' ')).flat()
// ['hello', 'world', 'foo', 'bar']

// flatMap 一步完成
sentences.flatMap(s => s.split(' '))
// ['hello', 'world', 'foo', 'bar']
```

**实用场景**：

```javascript
// 1. 展开嵌套数组
const orders = [
  { id: 1, items: ['A', 'B'] },
  { id: 2, items: ['C'] },
]
const allItems = orders.flatMap(order => order.items)
// ['A', 'B', 'C']

// 2. 过滤 + 转换
const arr = [1, -2, 3, -4, 5]
const positives = arr.flatMap(x => x > 0 ? [x * 2] : [])
// [2, 6, 10]

// 3. 生成多个值
const words = ['hello', 'world']
const pairs = words.flatMap((w, i) => [w, w.length])
// ['hello', 5, 'world', 5]
```

---

## 六、fill

用指定值填充数组：

```javascript
// 全量填充
new Array(3).fill(0)   // [0, 0, 0]

// 指定起止位置
[1, 2, 3, 4, 5].fill(0, 2, 4) // [1, 2, 0, 0, 5]（索引 2-4 填 0）

// 注意：fill 对象时是共享引用
const matrix = new Array(3).fill([])
matrix[0].push(1)
console.log(matrix) // [[1], [1], [1]] ❌ 全部被改

// ✅ 正确做法：Array.from
const matrix2 = Array.from({ length: 3 }, () => [])
matrix2[0].push(1)
console.log(matrix2) // [[1], [], []] ✅
```

---

## 七、copyWithin

在数组内部复制元素（不改变数组长度）：

```javascript
const arr = [1, 2, 3, 4, 5]

// copyWithin(target, start, end)
arr.copyWithin(0, 3, 5) // [4, 5, 3, 4, 5]
// 把索引 3-5 的元素（4, 5）复制到索引 0 开始的位置
```

---

## 八、类型化数组（TypedArrays）

处理二进制数据（Canvas、WebGL、文件操作）：

```javascript
// 创建 8 字节的缓冲区
const buffer = new ArrayBuffer(8)

// 以不同"视图"读写
const int32View = new Int32Array(buffer)
int32View[0] = 42
console.log(int32View[0]) // 42

// 单元化数组类型
const types = [
  Int8Array,    // 8 位有符号整数
  Uint8Array,   // 8 位无符号整数
  Uint8ClampedArray, // 8 位无符号（Canvas 用）
  Int16Array,   // 16 位有符号
  Uint16Array,  // 16 位无符号
  Int32Array,   // 32 位有符号
  Uint32Array,  // 32 位无符号
  Float32Array, // 32 位浮点
  Float64Array, // 64 位浮点
]
```

---

## 九、数组方法速查表

| 方法 | 版本 | 作用 | 是否修改原数组 |
|------|------|------|--------------|
| `Array.from` | ES6 | 类数组/可迭代转数组 | — |
| `Array.of` | ES6 | 参数转数组 | — |
| `find` | ES6 | 查找第一个匹配元素 | ❌ 不修改 |
| `findIndex` | ES6 | 查找第一个匹配索引 | ❌ 不修改 |
| `fill` | ES6 | 填充数组 | ✅ 修改 |
| `copyWithin` | ES6 | 内部复制 | ✅ 修改 |
| `includes` | ES2016 | 是否包含某值 | ❌ 不修改 |
| `flat` | ES2019 | 展平数组 | ❌ 不修改 |
| `flatMap` | ES2019 | map + flat | ❌ 不修改 |
| `findLast` | ES2023 | 从后查找第一个 | ❌ 不修改 |
| `findLastIndex` | ES2023 | 从后查找索引 | ❌ 不修改 |

> 核心原则：**能用原生方法就不要手写循环**。原生方法经过引擎高度优化（如 V8 的内置函数），比自己写 for 循环更快，代码也更简洁。
