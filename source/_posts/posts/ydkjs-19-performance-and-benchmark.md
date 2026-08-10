---
title: "你不知道的JavaScript（十九）：JavaScript 性能测试与优化——基准分析与 JIT 陷阱"
date: 2026-06-26
categories: "你不知道的javascript"
description: "深入了解 JavaScript 引擎的 JIT 编译优化机制、基准测试的正确方法、性能测量工具（Benchmark.js、Performance API），以及常见的优化陷阱"
tags: ["你不知道的javascript", "JavaScript", "性能优化"]
copyright: true
---

## 前言

"`for` 循环比 `forEach` 快"、"`++i` 比 `i++` 快"——你可能听说过无数类似的"优化建议"。

但真相是：**在现代 JavaScript 引擎中，大多数微优化（Micro-optimizations）没有意义。** 引擎的 JIT（Just-In-Time）编译器会进行大量优化，你"优化"后的代码甚至可能因为破坏了某些优化条件而变得更慢。

---

## 一、JavaScript 引擎与 JIT

### 1.1 解释执行 vs JIT 编译

以前的 JavaScript 引擎是**解释器**——逐行执行，速度慢。

现代引擎（V8、SpiderMonkey、JavaScriptCore）是**JIT 编译器**——先编译再执行，并对热点代码进行优化：

```
执行过程：
1. 解析（Parsing）→ AST（抽象语法树）
2. 解释执行（Ignition，V8 的解释器）
3. 热点代码识别（识别被频繁执行的函数）
4. 编译优化（TurboFan，V8 的优化编译器）
5. 生成优化后的机器码
```

### 1.2 优化的前提条件

JIT 优化的一个核心假定：**类型是稳定的**。

```javascript
// 容易优化的代码——类型稳定
function add(a, b) {
  return a + b
}

// 多次调用时，a 和 b 始终是 number
add(1, 2)    // 类型：number, number
add(3, 4)    // 类型：number, number

// 引擎优化：直接编译为 add_number_number 专有函数
```

```javascript
// 不容易优化的代码——类型不稳定
function add(a, b) {
  return a + b
}

add(1, 2)         // number, number
add('hello', ' ') // string, string
add([1], [2])     // object, object

// 引擎无法优化——每次类型都不同
// 必须使用通用的（更慢的）执行路径
```

### 1.3 去优化（Deoptimization）

当引擎已经优化了一个函数，但随后出现了一个"意外"的类型：

```javascript
let counter = 0

function process(value) {
  counter++
  return value * 2  // 假设 value 是 number
}

// 前 10000 次都是 number
for (let i = 0; i < 10000; i++) {
  process(42)
}

// 第 10001 次突然变成 string
process('hello') // 导致去优化！

// 后果：
// 1. 引擎丢弃之前的优化代码
// 2. 回退到解释执行
// 3. 重新收集类型信息，再次尝试优化
// 4. 该函数的执行速度大幅下降
```

---

## 二、正确的基准测试方法

### 2.1 不要手动测量

```javascript
// ❌ 错误的测量方法
const start = Date.now()
for (let i = 0; i < 100000; i++) {
  // 被测试的代码
}
const end = Date.now()
console.log(`耗时: ${end - start}ms`)

// 问题：
// 1. Date.now() 精度不够（毫秒级）
// 2. 没有考虑 JIT 预热
// 3. 内联缓存（IC）没有建立
// 4. GC 会影响结果
```

### 2.2 使用 Benchmark.js

```javascript
// 安装：npm install benchmark

const Benchmark = require('benchmark')
const suite = new Benchmark.Suite()

// 添加测试
suite
  .add('Array.push', function() {
    const arr = []
    for (let i = 0; i < 1000; i++) {
      arr.push(i)
    }
  })
  .add('Array[索引]', function() {
    const arr = []
    for (let i = 0; i < 1000; i++) {
      arr[i] = i
    }
  })
  .on('cycle', function(event) {
    console.log(String(event.target))
  })
  .on('complete', function() {
    console.log(`最快的: ${this.filter('fastest').map('name')}`)
  })
  .run({ async: true })

// 输出示例：
// Array.push x 1,234,567 ops/sec ±0.85%
// Array[索引] x 1,345,678 ops/sec ±1.02%
// 最快的: Array[索引]
```

### 2.3 使用 Performance API

```javascript
// 浏览器中的精确测量
function measure(fn, iterations = 100000) {
  // 预热：让 JIT 优化
  for (let i = 0; i < 100; i++) fn()

  // 正式测量
  const start = performance.now()
  for (let i = 0; i < iterations; i++) fn()
  const end = performance.now()

  const total = end - start
  const avg = total / iterations

  return {
    total: total.toFixed(2) + 'ms',
    average: (avg * 1000).toFixed(2) + 'μs',
    ops: (1000 / avg).toFixed(0) + '/ms',
  }
}

// 使用
const result1 = measure(() => [1, 2, 3].indexOf(2))
const result2 = measure(() => [1, 2, 3].includes(2))

console.table({ indexOf: result1, includes: result2 })
```

---

## 三、常见的微优化误区

### 3.1 循环优化

```javascript
// ❌ 以下这些"优化"在现代引擎中没有任何效果

// 1. 缓存数组长度
for (let i = 0, len = arr.length; i < len; i++) { } // 不必要
for (let i = 0; i < arr.length; i++) { }             // 引擎会优化

// 2. ++i vs i++
for (let i = 0; i < 100; i++) { }  // 等价
for (let i = 0; i < 100; ++i) { } // 等价

// 3. while vs for
let i = 0
while (i < 100) { i++ }            // 等价于 for
for (let i = 0; i < 100; i++) { } // 等价于 while

// ✅ 真正有效的选择是：选择正确的迭代方式
// for 循环（数字索引）→ 最快
// for...of → 稍慢，但可读性更好
// forEach → 有函数调用开销
```

### 3.2 字符串拼接

```javascript
// ❌ 旧说法："+= 比数组 join 慢"
// 现代引擎中，+= 已经被高度优化

let str = ''
for (const chunk of chunks) {
  str += chunk   // 现代引擎中很快
}

// 但如果 chunks 非常大（> 100k），数组 join 可能更好
const str = chunks.join('')
```

### 3.3 try-catch 开销

```javascript
// ❌ 旧说法："try-catch 会拖慢性能"
// 实际上：只有当异常被抛出时才有性能开销
// 没有异常抛出时，现代引擎对 try-catch 的优化已经很好

function withoutTry(arr) {
  return arr[0].name
}

function withTry(arr) {
  try {
    return arr[0].name
  } catch {
    return null
  }
}

// 正常情况下，两者性能几乎相同
```

---

## 四、实际有效的优化

没有把代码写"慢"比"快速代码"更重要。以下是真正影响性能的因素：

### 4.1 隐藏类（Hidden Class）

```javascript
// ❌ 不稳定的属性顺序
function createPoint(x, y) {
  const obj = {}
  obj.x = x    // 先添加 x
  obj.y = y    // 再添加 y
  return obj
}

// ✅ 稳定的属性顺序
function createPoint(x, y) {
  return {
    x: x,  // 一次性创建
    y: y,  // 保证属性顺序一致
  }
}

// 为什么？引擎内部使用"隐藏类"来优化属性访问
// 如果每次创建对象的属性顺序不同，引擎需要创建新的隐藏类
// 导致去优化
```

### 4.2 内联缓存（Inline Cache, IC）

```javascript
// ✅ 保持类型稳定
function getValue(obj) {
  return obj.value
}

// 如果 obj 始终是同一类型
getValue({ value: 1 })    // obj 类型：Object
getValue({ value: 2 })    // 相同类型 → 引擎内联缓存命中

// ❌ 混合类型导致缓存失效
getValue({ value: 1 })          // 普通对象
getValue({ value: 'hello' })    // 相同形状，但值类型不同？
```

### 4.3 内存与 GC 优化

```javascript
// ❌ 在闭包中创建大对象
function createHandler() {
  const largeData = new Array(10000).fill('x')

  return function(event) {
    // 这个闭包引用了 largeData
    // 即使没有使用它，largeData 也不会被 GC
    console.log(event.type)
  }
}

// ✅ 用完后释放引用
function createHandler() {
  const largeData = new Array(10000).fill('x')
  // 只用一次
  const result = process(largeData)

  return function(event) {
    // 只使用 result，不再引用 largeData
    console.log(event.type, result)
  }
}

// ✅ 不需要闭包时避免创建
function createHandler() {
  // 如果不需要大对象，就用空闭包
  return function(event) {
    console.log(event.type)
  }
}
```

### 4.4 数组操作优化

```javascript
// ❌ 删除数组中间元素
arr.splice(5, 1) // 需要移动后续元素

// ❌ 频繁改变数组长度
for (let i = 0; i < 1000; i++) {
  arr.push(i)
}

// ✅ 预分配（当大小已知时）
const arr = new Array(1000)
for (let i = 0; i < 1000; i++) {
  arr[i] = i
}
```

---

## 五、性能优化的正确思路

### 5.1 优先算法复杂度

微优化带来的收益可能是 10-20%，但算法优化带来的收益可能是 100-1000%：

```javascript
// ❌ O(n²) 算法
function findDuplicates(arr) {
  const result = []
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) {
        result.push(arr[i])
      }
    }
  }
  return result
}

// ✅ O(n) 算法
function findDuplicates(arr) {
  const seen = new Set()
  const duplicates = new Set()

  for (const item of arr) {
    if (seen.has(item)) {
      duplicates.add(item)
    }
    seen.add(item)
  }

  return [...duplicates]
}
```

### 5.2 减少不必要的 DOM 操作

```javascript
// ❌ 每次更新都操作 DOM
function renderList(items) {
  for (const item of items) {
    document.body.appendChild(createItem(item))
  }
}

// ✅ 使用 DocumentFragment 批量操作
function renderList(items) {
  const fragment = document.createDocumentFragment()
  for (const item of items) {
    fragment.appendChild(createItem(item))
  }
  document.body.appendChild(fragment)
}
```

### 5.3 使用正确的数据处理工具

```javascript
// ✅ 选择最合适的数据结构
// 频繁查找：Set/Map（O(1)）> 数组（O(n)）
// 频繁插入/删除：LinkedList > Array
// 保持有序：Sorted Array / Tree

// Set 查找
const set = new Set([1, 2, 3])
set.has(2) // true（O(1)）

// Map 映射
const map = new Map([['key', 'value']])
map.get('key') // 'value'（O(1)）
```

---

## 六、性能测试工具

### 6.1 Chrome DevTools Performance

```javascript
// 用 console.time 标记关键路径
console.time('数据处理')
processData()
console.timeEnd('数据处理') // 输出耗时

// 用 performance.mark 做精确标记
performance.mark('data-start')
// ... 执行代码 ...
performance.mark('data-end')
performance.measure('数据处理', 'data-start', 'data-end')

const measures = performance.getEntriesByType('measure')
console.table(measures)
```

### 6.2 Lighthouse / PageSpeed Insights

关注三个核心指标：
- **LCP（Largest Contentful Paint）**：最大内容渲染
- **CLS（Cumulative Layout Shift）**：布局稳定性
- **INP（Interaction to Next Paint）**：交互响应

---

## 七、性能优化清单

```
✅ 使用正确的算法和数据结构
✅ 保持类型稳定（利于 JIT）
✅ 减少闭包中不必要的引用（利于 GC）
✅ 批量 DOM 操作（DocumentFragment）
✅ 避免不必要的 reflow/render
✅ CSS 动画优于 JS 动画
✅ 图片延迟加载
✅ 代码拆分（Code Splitting）

❌ 不必纠结微优化（++i vs i++）
❌ 不必手动缓存数组 length
❌ 不必担心正常的 try-catch
❌ 不必魔法优化（如位运算代替数学运算）
```

---

## 总结

1. **JIT 编译**让 JavaScript 越来越快，但**类型不稳定**是它最大的敌人
2. **保持类型稳定**比任何微优化都重要
3. **基准测试要用专业工具**（Benchmark.js），不要用手动计时
4. **微优化没有意义**——引擎比你想象的聪明
5. **真正有效的优化**：算法选择、GC 管理、DOM 操作批量处理、渲染性能
6. **先测量再优化**——没有数据的优化都是猜测

> 下一篇将深入**元编程（Metaprogramming）**——Symbol、Proxy、Reflect 的高级用法。
