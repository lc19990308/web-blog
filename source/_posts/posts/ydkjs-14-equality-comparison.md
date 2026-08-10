---
title: "你不知道的JavaScript（十四）：相等比较——== 与 === 的完全指南"
date: 2026-06-26
categories: "你不知道的javascript"
description: "深度解析 == 与 === 的底层区别、宽松相等（==）的完整转换规则表、Object.is 的三路相等，以及各种边界情况的比较结果"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

最常见的建议是："永远用 `===`，不要用 `==`"。

这个建议**过于简化**了。理解 `==` 和 `===` 的本质区别后，你会发现 `==` 在某些场景下是有用的工具，而不是 bug 的来源。

---

## 一、== vs === 的本质区别

### 1.1 一句话总结

> **`==` 允许类型转换，`===` 不允许类型转换。**

```
'42' == 42   // true（允许类型转换：'42' → 42）
'42' === 42  // false（类型不同，直接返回 false）
```

### 1.2 性能差异

```javascript
// === 比 == 快吗？
// 答案：基本没有区别。现代引擎会优化 == 的类型转换步骤
// 但 === 更快是一个普遍存在的误解
```

**正确的关注点不是性能，而是你是否了解 `==` 的类型转换规则。**

---

## 二、=== 严格相等

### 2.1 基本规则

```
1. 类型不同 → false
2. 类型相同 → 比较值
```

### 2.2 特殊值

```javascript
NaN === NaN     // false（NaN 是唯一不等于自身的值）
0 === -0        // true（引擎认为 0 和 -0 相等）
Object.is(0, -0) // false（Object.is 可以区分）
Object.is(NaN, NaN) // true

// 严格相等中的 NaN
let a = NaN
a === a         // false
Number.isNaN(a) // true ✅ 正确判断

// 对象引用比较
{} === {}       // false（不同引用）
const x = {}; x === x // true（同一引用）
```

### 2.3 一些看似奇怪但实际上正确的 ===

```javascript
true === 1      // false（类型不同）
false === 0     // false
'' === 0        // false
null === undefined // false
```

---

## 三、== 宽松相等

`==` 的类型转换规则虽然复杂，但完全可预测。核心规则只有几条：

### 3.1 规则一：null 和 undefined

```javascript
null == undefined    // true
null == null         // true
undefined == undefined // true
null == 0            // false ⚠️
null == ''           // false
null == false        // false
undefined == ''      // false
```

**规则**：`null == undefined` 为 `true`，且它们不与任何其他值相等。

**实用技巧**：

```javascript
// 同时检查 null 和 undefined
if (value == null) {
  // value 是 null 或 undefined
}

// 等价于：
if (value === null || value === undefined) { }
```

### 3.2 规则二：String vs Number

```javascript
// String 转为 Number
42 == '42'     // true（'42' → 42）
42 == '0x2A'   // true（'0x2A' → 42）
0 == ''        // true（'' → 0）
0 == '  '      // true（空格 → 0）
1 == '1e0'     // true（'1e0'  → 1）
```

### 3.3 规则三：Boolean vs 其他

```javascript
// Boolean 先转为 Number
true == 1       // true（true → 1）
true == '1'     // true（true → 1, 1 == '1' → '1' → 1）
true == '2'     // false（true → 1, 1 == '2' → false）
true == [1]     // true（true → 1, [1] → '1' → 1）
false == 0      // true（false → 0）
false == ''     // true（false → 0, '' → 0）
false == '0'    // true（false → 0, '0' → 0）
false == []     // true（false → 0, [] → '' → 0）
```

### 3.4 规则四：Object vs 原始类型

```javascript
// Object 先调用 ToPrimitive（hint: default → number）
// 即 valueOf() → toString()

[1] == 1        // true（[1] → '1' → 1）
['1'] == 1      // true（['1'] → '1' → 1）
[''] == 0       // true（[''] → '' → 0）
[] == 0         // true（[] → '' → 0）
[1, 2] == '1,2' // true（[1,2] → '1,2'）

// 注意：{} == '[object Object]' 只在表达式上下文中成立
// 在语句上下文中（如 if 后），{} 被解释为代码块
// 所以 {}.toString() 才可靠
({} == '[object Object]') // true（括号强制为表达式）

// 注意：对象 == null 永远为 false（除了 null 本身）
{} == null      // false
[] == null      // false
```

---

## 四、完整的转换流程图

```
当 x == y 且类型不同时：

x == y
├── null == undefined → true
├── x是String，y是Number → ToNumber(x) == y
├── x是Boolean → ToNumber(x) == y
├── y是Boolean → x == ToNumber(y)
├── x是String/Number，y是Object → x == ToPrimitive(y)
├── x是Object，y是String/Number → ToPrimitive(x) == y
└── 其他 → false
```

### 逐级推导示例

```javascript
// ['0'] == false

// 步骤1：Boolean → Number
// false → 0
// ['0'] == 0

// 步骤2：Object → 原始值（hint: number）
// ['0'].valueOf() → ['0']（不是原始值，继续）
// ['0'].toString() → '0'
// '0' == 0

// 步骤3：String → Number
// '0' → 0
// 0 == 0 → true ✅

// 结果：['0'] == false → true
```

---

## 五、各种奇怪的 == 结果

下面这些结果看起来奇怪，但遵循规则后都是可预测的：

```javascript
// 一个经典的
[] == ![]     // true

// 推导：
// 1. ![] → false（[] 是真值，取反为 false）
// [] == false
// 2. Boolean → Number: false → 0
// [] == 0
// 3. Object → Primitive: [] → '' → 0
// 0 == 0 → true ✅


'' == 0       // true（'' → 0）
'\n' == 0     // true（字符串空格 → 0）
'\t' == 0     // true

' ' == '    '  // false（字符串比较，空格不同）
' ' == 0       // true（字符串转为数字后都为 0）

[[]] == 0     // true（[[]] → '' → 0）
[[[]]] == 0   // true（[[[]]] → '' → 0）

// 以下结果为 false
[] == []      // false（不同对象引用）
[] == ![]     // true（刚刚推导过）
[] == {}      // false（不同类型对象）
[1] == true   // true（[1] → '1' → 1, true → 1）
[2] == true   // false（[2] → '2' → 2 ≠ 1）
```

---

## 六、Object.is 三路相等

ES6 引入的 `Object.is` 解决了 `===` 的两个边界问题：

```javascript
// === 的"问题"
NaN === NaN   // false
0 === -0      // true（-0 和 0 被认为是相等的）

// Object.is 的修正
Object.is(NaN, NaN) // true ✅
Object.is(0, -0)    // false ✅
Object.is(-0, -0)   // true

// 其他情况与 === 一致
Object.is('hello', 'hello') // true
Object.is({}, {})           // false
Object.is(null, null)       // true
```

**polyfill**：

```javascript
Object.is = function(x, y) {
  if (x === y) {
    // 处理 +0 和 -0
    return x !== 0 || 1 / x === 1 / y
  }
  // 处理 NaN
  return x !== x && y !== y
}
```

---

## 七、实际开发中的相等判断

### 7.1 实用建议

```javascript
// 1. 知道自己在比较什么
// 明确知道类型时，用 == 或 === 都可以
if (typeof x === 'string') { }  // 始终用 ===
if (x == null) { }             // 允许 ==（同时匹配 null/undefined）

// 2. 与字面量比较，优先 ===
if (x === 42) { }     // ✅
if (x === 'hello') { } // ✅

// 3. 与 0、''、false 比较时，用 === 避免隐式转换
if (x === 0) { }      // ✅ 明确数字 0
if (x === '') { }     // ✅ 明确空字符串

// 4. 深度比较对象
function deepEqual(a, b) {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false

  return keysA.every(key => deepEqual(a[key], b[key]))
}
```

### 7.2 面试题

```javascript
// 题目1：下列表达式结果是什么？
console.log(
  undefined == null,   // true
  NaN == NaN,          // false
  null == 0,           // false
  '' == false,         // true
  [] == false,         // true
  {} == false,         // false
)

// 题目2：写出下列判断的函数
function isEqual(a, b) {
  // 要求：
  // 1. 能判断 NaN 等于自身
  // 2. 能区分 0 和 -0
  // 3. 其他情况与 === 一致
}

// 答案
function isEqual(a, b) {
  return Object.is(a, b)
}
```

---

## 八、=== 适用的约定

| 场景 | 推荐操作符 | 原因 |
|------|-----------|------|
| 与 42 比较 | `===` | 明确类型是数字 |
| 与 'hello' 比较 | `===` | 明确类型是字符串 |
| 与 true/false 比较 | `===` | 避免隐式转换 |
| 检查 null/undefined | `== null` | 简洁，可读性好 |
| 检查 `typeof` 结果 | `===` | 始终返回字符串 |
| 检查 `instanceof` | 不涉及 | 无影响 |
| 对象引用相同 | `===` | 正确比较 |
| 数组/对象深度比较 | 自定义 deepEqual | 递归比较内容 |

---

## 总结

1. **`==` 允许类型转换，`===` 不允许**——这是唯一的区别
2. **`null == undefined`** 是 `==` 的唯一推荐使用场景
3. **`==` 的类型转换规则完全可预测**：Boolean → Number → String/Primitive → 比较
4. **`===` 不处理 NaN 和 -0**——`Object.is` 弥补了这两个不足
5. **实际开发**：95% 的情况用 `===`，5% 的情况用 `== null`，极少情况用 `Object.is`

> 下一篇将深入**事件循环与回调**，理解 JavaScript 的异步执行模型。
