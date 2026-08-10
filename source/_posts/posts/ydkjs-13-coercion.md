---
title: "你不知道的JavaScript（十三）：强制类型转换（Coercion）——隐式与显式的完整解析"
date: 2026-06-26
categories: "你不知道的javascript"
description: 'JavaScript 的强制类型转换不是"bug"，而是一套可预测的规则。深入 ToPrimitive、ToString、ToNumber、ToBoolean 的抽象操作'
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

很多开发者说 JavaScript 的类型转换"混乱"：

```javascript
[] + []   // ""
{} + []   // 0 (??)
[] + {}   // "[object Object]"
```

但实际上，类型转换遵循严格的规则。理解这些规则后，这些表达式的结果都是可预测的。

JavaScript 的类型转换分为两种：
- **显式转换**：开发者明确调用转换函数
- **隐式转换**：JavaScript 引擎在运算时自动转换

---

## 一、抽象操作（Abstract Operations）

### 1.1 ToPrimitive

当对象需要转为原始值时，会调用 `ToPrimitive` 操作：

```javascript
// ToPrimitive 的执行过程：
// 1. 调用 obj[Symbol.toPrimitive](hint) — 如果存在
// 2. 否则，根据 hint:
//    - hint === 'string' → toString() → valueOf()
//    - hint === 'number' → valueOf() → toString()
//    - 默认（没有 hint） → 对象通常走 number 路径

// 自定义转换
const obj = {
  valueOf() { return 42 },
  toString() { return 'hello' },
}

String(obj)   // 'hello'（hint: string → toString）
Number(obj)   // 42（hint: number → valueOf）
obj + ''      // 'hello'（hint: string → toString）
+obj           // 42（hint: number → valueOf）
```

### 1.2 ToString

将值转为字符串的规则：

```javascript
String(null)         // 'null'
String(undefined)    // 'undefined'
String(true)         // 'true'
String(false)        // 'false'
String(0)            // '0'
String(-0)           // '0'
String(NaN)          // 'NaN'
String(Infinity)     // 'Infinity'

// 对象
String([])           // ''（空数组）
String([1, 2, 3])    // '1,2,3'
String([null])       // ''（空数组！）
String([undefined])  // ''（也是空的！）

String({})           // '[object Object]'
String({a:1})        // '[object Object]'
```

**JSON.stringify 不是 ToString**：

```javascript
JSON.stringify(null)      // 'null'
JSON.stringify(undefined) // undefined（忽略）
JSON.stringify(Symbol())  // undefined（忽略）
JSON.stringify({a: undefined}) // '{}'（忽略）
JSON.stringify([undefined])    // '[null]'（变成 null）
JSON.stringify(/regex/)  // '{}'（RegExp 变成空对象）
```

### 1.3 ToNumber

```javascript
Number(null)         // 0
Number(undefined)    // NaN
Number(true)         // 1
Number(false)        // 0
Number('')           // 0
Number('   ')        // 0（空格被忽略）
Number('42')         // 42
Number('42px')       // NaN
Number('0x1A')       // 26（十六进制）
Number('0b11')       // 3（二进制）

// 对象
Number([])           // 0
Number([1])          // 1
Number([1, 2])       // NaN
Number(['42'])       // 42
Number({})           // NaN
```

**parseInt vs Number**：

```javascript
parseInt('42px')   // 42（解析到非数字字符停止）
Number('42px')     // NaN（整个字符串必须合法数字）

parseInt('0x1A')   // 26（自动检测十六进制）
parseInt('0x1A', 10) // 0（指定进制后不再自动检测）

// parseInt 第二个参数默认为 16？
parseInt('10')       // 10（猜错了...）
parseInt('0x10')     // 16（检测到 0x 前缀）

// 安全方式
parseInt('10', 10)   // ✅ 明确指定十进制
```

### 1.4 ToBoolean

**不会隐式转换到 boolean 的操作**（保持值的真假性）：

```javascript
// 常见的"假值"转换路径

// 字符串
if (str) { }     // str → boolean → true/false

// 数字
if (count) { }   // count → boolean

// 对象
if (obj) { }     // 总是 true（对象是真值）

// 但注意：假值列表只包含 7 个
// false, 0, -0, 0n, '', null, undefined, NaN
// 其他所有值都是真值
```

---

## 二、显式类型转换

### 2.1 显式转字符串

```javascript
// 推荐
String(value)

// 也可
value.toString()     // 但 null/undefined 会报错
value + ''           // 隐式，但常用
```

### 2.2 显式转数字

```javascript
// 推荐
Number(value)

// 也可
+value               // 一元运算符
parseInt(value, 10)  // 只解析整数
parseFloat(value)    // 解析浮点数

// parseInt 注意第二个参数
parseInt('08')       // 某些旧浏览器可能解释为八进制（0）
parseInt('08', 10)   // 8 ✅ 始终指定进制
```

### 2.3 显式转布尔

```javascript
// 推荐
Boolean(value)

// 也可
!!value              // 双重取反
```

---

## 三、隐式类型转换

### 3.1 字符串拼接（+）

`+` 操作符的规则：

```
如果有一个操作数是字符串，执行字符串拼接
否则，执行数值相加
```

```javascript
'42' + 0     // '420'（字符串拼接）
42 + '0'     // '420'
42 + 0       // 42（都是数字）

// 表达式求值顺序
42 + '' + 0  // '420' (42 + '' = '42', '42' + 0 = '420')
42 + 0 + ''  // '42' (42 + 0 = 42, 42 + '' = '42')

// 对象
{} + []      // 0（{} 被解释为代码块，+[] = 0）
[] + {}      // '[object Object]'
```

### 3.2 其他操作符

```javascript
// 减法、乘法、除法：始终转为数字
'42' - 0      // 42
'42' * 1      // 42
'42' / 1      // 42
'42' - '10'   // 32
[] - 1        // -1（[] → '' → 0, 0 - 1 = -1）
['x'] - 1     // NaN（['x'] → 'x' → NaN）

// ~ 操作符：按位非（将数字转为 32 位有符号整数）
~42           // -43
~-1           // 0

// 常用于 indexOf 检查
if (~str.indexOf('hello')) { } // 如果找到（> -1），~的结果是真值
```

### 3.3 布尔隐式转换场景

布尔隐式转换**只发生在以下场景**：

```
1. if (condition)
2. for (; condition; ) {}
3. while (condition), do { } while (condition)
4. condition ? a : b
5. || 和 && 的逻辑运算
```

```javascript
// || 和 && 不是返回布尔值！而是返回操作数之一
// ||：返回第一个真值，或最后一个
// &&：返回第一个假值，或最后一个

const a = 0 || 'default'
console.log(a) // 'default'

const b = 42 && 'hello'
console.log(b) // 'hello'

const c = null && 'hello'
console.log(c) // null（短路）

// 使用场景
const name = user.name || '匿名'    // 默认值
isAdmin && showAdminPanel()          // 条件执行
```

---

## 四、经典类型转换表达式解析

```javascript
// 1. [] + []
[] → ''（空数组转字符串）
'' + '' = ''

// 2. {} + []
// 在表达式上下文中，{} 被解释为代码块（不是空对象）
// +[] = 0

// 3. [] + {}
[] → ''
{} → '[object Object]'
'' + '[object Object]' = '[object Object]'

// 4. { } + { } // 在不同浏览器中可能不同
// Chrome: "[object Object][object Object]"
// Firefox: NaN

// 5. '5' + 3 → '53'
// 6. '5' - 3 → 2
// 7. !!'非空字符串' → true
// 8. !!'' → false
```

---

## 五、宽松相等（==）的类型转换

`==` 在类型不同时执行类型转换（与 `===` 的区别就是类型不同时是否转换）：

```javascript
// 规则 1：null == undefined → true
null == undefined     // true
null == 0             // false
undefined == 0        // false

// 规则 2：String vs Number → 字符串转数字
'42' == 42    // true（'42' → 42）
'0' == 0      // true

// 规则 3：Boolean vs 其他 → boolean 转数字
true == 1     // true（true → 1）
false == 0    // true（false → 0）
true == '1'   // true（true → 1, 1 === '1'? 不，继续规则 2, '1' → 1）

// 规则 4：Object vs String/Number → 对象 ToPrimitive（通常 hint: number）
[1] == 1      // true（[1] → '1' → 1）
['0'] == false // true（false → 0, ['0'] → '0' → 0）
[''] == 0     // true（[''] → '' → 0）
[] == 0       // true（[] → '' → 0）
```

### 5.1 怪异的 ==

```javascript
// 1. [] == ![]
// 步骤：![] → false，false → 0
// [] == 0 → [] → '' → 0 → 0 === 0 → true！
[] == ![] // true ❓

// 2. [null] == ''
[null] → '' → '' == '' → true

// 3. [undefined] == ''
[undefined] → '' → '' == '' → true

// 4. '0' == false
// false → 0, '0' → 0, 0 === 0 → true
'0' == false // true

// 5. '' == false
// false → 0, '' → 0, 0 === 0 → true
'' == false // true ✅ 但 '' 不是假值吗？
```

---

## 六、类型转换实战建议

### 6.1 使用显式转换

```javascript
// ❌ 隐式 — 容易引起困惑
const total = value + ''
const count = +str
const flag = !!str

// ✅ 显式 — 意图明确
const total = String(value)
const count = Number(str)
const flag = Boolean(str)
```

### 6.2 避开 == 的坑

```javascript
// ✅ 安全原则：只和 null/undefined 使用 ==
if (value == null) { } // 同时匹配 null 和 undefined

// 等价于
if (value === null || value === undefined) { }

// ❌ 其他情况始终使用 ===
value === 42
value === 'hello'
```

### 6.3 类型转换测试助手

```javascript
function typeConversionDemo(value) {
  return {
    原始: value,
    类型: typeof value,
    字符串: String(value),
    数字: Number(value),
    布尔: Boolean(value),
    'JSON': JSON.stringify(value),
  }
}

console.table(typeConversionDemo([1, 2]))
```

---

## 总结

1. **类型转换有严格的规则**，不是"随机的"
2. **抽象操作**：ToPrimitive、ToString、ToNumber、ToBoolean
3. **显式转换**：`String()`、`Number()`、`Boolean()` — 意图明确
4. **隐式转换**发生在：+ 字符串拼接、- * / 运算、if/while/&&/||
5. **== 的类型转换规则可预测但复杂**，建议除 `== null` 外都用 `===`
6. **`||` 返回第一个真值**，`&&` 返回第一个假值（不是布尔值）

> 下一篇将深入 **== 与 === 的完整对比**，以及如何安全地比较各种类型。
