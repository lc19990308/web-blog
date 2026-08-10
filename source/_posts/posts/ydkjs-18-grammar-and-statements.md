---
title: "你不知道的JavaScript（十八）：JavaScript 语法详解——表达式、语句、ASI 与分号"
date: 2026-06-26
categories: "你不知道的javascript"
description: "深入 JavaScript 的语法细节：表达式（Expression）与语句（Statement）的区别、自动分号插入（ASI）、分号规则、以及各种边界语法行为"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

很多开发者写 JavaScript 多年，但还是分不清"表达式"和"语句"的区别。

更不用说关于**分号**的争论了——加还是不加？实际上，理解 ASI（Automatic Semicolon Insertion）规则后，这个争议就不存在了：你知道什么时候可以省略，什么时候必须加。

---

## 一、表达式（Expression）vs 语句（Statement）

### 1.1 核心区别

**表达式（Expression）产生一个值，语句（Statement）执行一个动作。**

```javascript
// 表达式：产生值
42                    // 值 42
'hello'               // 值 'hello'
1 + 2                 // 值 3
a                     // 变量 a 的值
a > b ? a : b         // 条件表达式
[1, 2, 3]             // 数组表达式
{ x: 1 }              // 对象表达式（在表达式上下文中）
function() {}         // 函数表达式
a => a * 2            // 箭头函数表达式

// 语句：执行动作
if (a > b) { return a }
for (let i = 0; i < 10; i++) {}
while (true) {}
var a = 1             // 声明语句
return 42             // 返回语句
```

### 1.2 表达式 vs 语句的上下文

```javascript
// 同样的代码在不同上下文含义不同

// 代码块（语句上下文）
{
  // 这是代码块（statement）
  var a = 1
}

// 对象字面量（表达式上下文）
const obj = {
  // 这是对象（expression）
  a: 1,
}

// 这是标签语句
{
  label: console.log('hello')
}
// 实际上 { label: ... } 是一个代码块，label 是标签语句
// 不是对象字面量！
```

### 1.3 语句完成值

JavaScript 中**语句也有完成值**（Completion Value），但你不能直接获取它：

```javascript
// 在浏览器控制台，你会看到完成值
var a = 42
// undefined（var 语句的完成值是 undefined）

b = 42
// 42（赋值表达式的完成值是右侧的值）

if (true) { 42 }
// 42（块的完成值是最后一条语句的值）
```

**eval 可以拿到完成值**：

```javascript
const result = eval('if (true) { 42 }')
console.log(result) // 42（eval 返回块的完成值）
```

---

## 二、自动分号插入（ASI）

### 2.1 ASI 不是"自动加分号"

ASI 的完整意思是：

> 当 JavaScript 引擎**解析时遇到语法错误**，它会尝试在特定位置**插入一个分号**来修复代码。

换句话说：ASI 是一个**错误恢复机制**，不是"在每行末尾加分号"。

### 2.2 ASI 触发的三个条件

```
1. 当下一行代码以 "(" "[" "/" "+" "-" 开头时
2. 当遇到 "}" 时（如果缺少分号）
3. 当遇到 return/throw/break/continue 后紧跟换行时
```

```javascript
// 条件1：下一行以 ( 开头
var a = 42
(function() { })()
// → var a = 42(function() {}()) ❌ 类型错误

// 条件2：遇到 }
function foo() {
  // 这里不需要分号，但引擎隐式在 } 前插入
}

// 条件3：return 后换行（重要）
function foo() {
  return          // ASI 在这里插入分号！
    42
}
foo() // undefined（不是 42！）
```

### 2.3 常见的 ASI 陷阱

```javascript
// 陷阱1：return 换行
function foo() {
  return
  { value: 42 }
}
foo() // undefined ❌

// 应该：
function bar() {
  return {
    value: 42,
  }
}

// 陷阱2：数组起始行
const a = [1, 2, 3]
[4, 5, 6].forEach(v => console.log(v))
// → const a = [1, 2, 3][4, 5, 6].forEach(...)
// 取下标 5（即第三个元素），然后调用 forEach ❌

// 修复：加分号
const a = [1, 2, 3];
[4, 5, 6].forEach(v => console.log(v))

// 陷阱3：函数表达式起始行
const a = 42
(function() { console.log('hello') })()
// → const a = 42(function() { ... }()) ❌
// 42(...) 是不合法的

// 修复：加分号
const a = 42;
(function() { console.log('hello') })()

// 陷阱4：以 / 开头
console.log('hello')
/[a-z]/.test('a')
// → console.log('hello')/[a-z]/.test('a')
// 除法运算 ❌
```

---

## 三、分号的最佳实践

### 3.1 两种流派

```javascript
// 流派 A：始终加分号（更安全）
const a = 1;
const b = 2;
(function() {
  console.log('safe');
})();

// 流派 B：不加分号（更简洁）
const a = 1
const b = 2
;(function() {
  console.log('safe')   // 但行首要加分号！
})()
```

### 3.2 安全省略分号的三条规则

如果你选择不加分号（流派 B），必须遵守：

```javascript
// 规则1：语句以 ( 开头时，前面加分号
const a = 42
;(function() { })()    // ✅

// 规则2：语句以 [ 开头时，前面加分号
const b = 42
;[1, 2, 3].forEach(fn) // ✅

// 规则3：以字符串模版开头时，前面加分号
const c = 42
;`hello ${c}`           // ✅
```

### 3.3 使用 ESLint 保持统一

```javascript
// .eslintrc
{
  "rules": {
    // 要么：
    "semi": ["error", "always"],  // 必须加分号
    // 要么：
    "semi": ["error", "never"],   // 从不加分号（但需要正确使用 ASI）
  }
}
```

---

## 四、几种特殊语法

### 4.1 标签语句（Label Statement）

```javascript
// 给循环加标签，用于 break/continue 跳出多层
outer: for (let i = 0; i < 5; i++) {
  inner: for (let j = 0; j < 5; j++) {
    if (i === 2 && j === 2) {
      break outer  // 跳出外层循环
    }
    console.log(i, j)
  }
}
// 输出 (0,0) (0,1) ... (2,1)，然后退出
```

```javascript
// 标签语句的另一个用法——用 break 退出代码块
{
  console.log('执行')
  break myblock
  console.log('不会执行')
}
// 这可以用在条件性地跳过代码块
myblock: {
  if (condition) break myblock
  // 只有 condition 为 false 时才会执行这里
  expensiveOperation()
}
```

### 4.2 逗号操作符

```javascript
// 逗号操作符：从左到右依次执行，返回最后一个表达式的值
const a = (1, 2, 3)
console.log(a) // 3

// 典型应用
for (let i = 0, j = 10; i < j; i++, j--) {
  console.log(i, j)
}

// 另一种应用：简化条件分支
const result = condition
  ? (doSomething(), doSomethingElse(), 'done')
  : 'skipped'

console.log(result) // 'done' 或 'skipped'
```

### 4.3 void 操作符

```javascript
// void 操作符：执行表达式，返回 undefined
void 0        // undefined
void (1 + 1)  // undefined
void fetch('/api') // undefined（但仍会发起请求）

// 常见用途
// 1. 确保表达式返回 undefined
<a href="javascript:void(0)">点击</a>

// 2. void 用于立即执行函数表达式，比 () 包裹更安全
// 因为 void 明确将后面的内容作为表达式处理
void function() {
  console.log('IIFE with void')
}()
// 对比：(function() { ... }()) — 括号包裹法
// void 方式避免了 ASI 问题（行首无 ( 开头）

// 3. 避免箭头函数返回对象被误解
const fn = () => void doSomething()
// 明确返回 undefined，而不是 doSomething 的返回值
```

### 4.4 typeof 的安全特性

```javascript
// typeof 永远不会报错——即使变量不存在
typeof undeclaredVariable // 'undefined'

// 其他操作符会报 ReferenceError
undeclaredVariable // ❌ ReferenceError

// 用来检测全局 API 是否存在
if (typeof Promise !== 'undefined') {
  // 支持 Promise
}
```

---

## 五、运算符优先级与结合性

### 5.1 优先级

```javascript
// 优先级高的先执行
1 + 2 * 3     // 7（乘法优先）
(1 + 2) * 3   // 9（括号提高优先级）

// 完整表（从高到低部分）
// 1. 成员访问 . []
// 2. new (带参数)
// 3. 函数调用 ()
// 4. 一元 ! ~ + - typeof void
// 5. 乘法 * / %
// 6. 加法 + -
// 7. 比较 < > <= >= instanceof
// 8. 相等 == === != !==
// 9. &&
// 10. ||
// 11. 三目 ?:
// 12. 赋值 = += -=
// 13. 逗号 ,
```

### 5.2 结合性

```javascript
// 左结合：从左到右计算
// 大多数运算符是左结合
a - b - c     // (a - b) - c
a = b = c     // 赋值是右结合：a = (b = c)

// 右结合：从右到左计算
a = b = c            // a = (b = c)
typeof typeof 42     // typeof (typeof 42) → typeof 'number' → 'string'
a ? b : c ? d : e    // a ? b : (c ? d : e)
```

### 5.3 常见陷阱

```javascript
// 1. 条件与赋值的优先级
if (a = b) { }      // ❌ 赋值表达式返回 b 的值，总是真值
if (a === b) { }    // ✅ 正确的比较

// 2. 逗号与赋值的优先级
const a = (1, 2, 3) // 3（逗号表达式）
const b = 1, 2, 3   // ❌ SyntaxError

// 3. new 的优先级
new Foo()           // 带参数：优先级最高
new Foo             // 不带参数：优先级较低
new Foo().bar()     // (new Foo()).bar()
new Foo.bar()       // new (Foo.bar())
```

---

## 六、面试题

```javascript
// 题目1：输出什么？
function foo() {
  return
  {
    value: 42
  }
}
console.log(foo()) // undefined（ASI 在 return 后加了分号）

// 题目2：输出什么？
console.log(typeof a)     // 'undefined'
console.log(typeof b)     // 'undefined'
// 注意：b 没有声明，但 typeof 不会报错

// 题目3：输出什么？
const x = 1
const y = 2
const z = x, y, (x + y)
console.log(z) // 1（逗号操作符的优先级问题）

// 题目4：输出什么？
const a = 1
const b = 2
const result = (a++, b++, a + b)
console.log(a, b, result) // 2, 3, 5
```

---

## 总结

1. **表达式产生值，语句执行动作**——这是最根本的区别
2. **ASI 是错误恢复机制**，不是自动在行尾加分号
3. **三种触发 ASI 的场景**：行首以 `(` `[` `/` 开头、遇到 `}`、return 后换行
4. **不加分号时要手动加分号**在 `(` `[` `` ` `` 开头的行前
5. **善用逗号操作符**在一行中执行多个表达式
6. **`typeof` 从不报错**——它是检测变量是否存在的安全方式

> 下一篇将深入 **JavaScript 的性能测试**——基准分析、JIT 优化陷阱和测量方法。
