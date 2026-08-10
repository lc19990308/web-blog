---
title: "你不知道的JavaScript（五）：闭包（Closure）——从原理到实战"
date: 2026-06-26
categories: "你不知道的javascript"
description: "闭包是 JavaScript 最核心也最常被误解的概念。本文从底层原理到实际应用场景，彻底讲透闭包的工作机制"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

闭包的定义很简单：

> **闭包是函数"记住"并访问其词法作用域的能力，即使函数在当前作用域之外执行。**

但"记住作用域"到底是什么意思？为什么需要这种能力？本文从底层原理到实际场景逐一拆解。

---

## 一、闭包是如何产生的？

### 1.1 最经典的闭包

```javascript
function createCounter() {
  let count = 0            // createCounter 的局部变量

  return function() {      // 返回一个内部函数
    count++                // 引用了外层函数的变量
    console.log(count)
  }
}

const counter = createCounter()
counter() // 1
counter() // 2
counter() // 3
```

**关键问题**：
- `createCounter()` 执行完后，`count` 按理说应该被垃圾回收
- 但 `counter()` 仍然能访问 `count`
- 因为内部函数**创建了一个闭包**，让 `count` 继续存活

### 1.2 闭包的底层原理

当 JavaScript 引擎执行 `createCounter` 时：

1. 创建 `createCounter` 的执行上下文，包含 `count = 0`
2. 创建内部函数的"作用域链"——它引用了 `createCounter` 的作用域
3. 即使 `createCounter` 执行完毕，内部函数的作用域链**仍然持有对 `count` 的引用**
4. 垃圾回收器看到 `count` 还在被引用，不会回收

```
createCounter 调用
  ├── count: 0
  └── 返回函数 ──→ [[Scopes]]: [createCounter 的变量环境]
                         ↑ 这个引用让 count 不被 GC
```

---

## 二、识别闭包的三种方式

### 2.1 方式一：作为返回值

```javascript
function foo() {
  var a = 2
  function bar() {
    console.log(a) // 闭包引用
  }
  return bar
}

var baz = foo()
baz() // 2 — 闭包
```

### 2.2 方式二：作为参数传递

```javascript
function foo() {
  var a = 2
  function baz() {
    console.log(a) // 闭包
  }
  bar(baz)
}

function bar(fn) {
  fn() // 这里调用了 baz，它仍然能访问 foo 里的 a
}

foo() // 2
```

### 2.3 方式三：间接引用

```javascript
var fn

function foo() {
  var a = 2
  function baz() {
    console.log(a)
  }
  fn = baz // 把引用传给外部变量
}

foo()
fn() // 2 — 闭包
```

**核心判断标准**：一个函数在定义它的词法作用域之外执行，且仍然能访问该作用域的变量 → **这就是闭包**。

---

## 三、闭包的三个典型应用

### 3.1 模块模式

```javascript
const UserModule = (function() {
  // 私有变量
  let users = []
  let nextId = 1

  // 私有方法
  function validateUser(user) {
    return user.name && user.name.length > 0
  }

  // 公共 API
  return {
    addUser(name) {
      if (!validateUser({ name })) return false
      const user = { id: nextId++, name }
      users.push(user)
      return user
    },
    
    getUser(id) {
      return users.find(u => u.id === id)
    },
    
    getAll() {
      return [...users] // 返回副本，防止外部修改
    },
    
    removeUser(id) {
      const index = users.findIndex(u => u.id === id)
      if (index >= 0) {
        users.splice(index, 1)
        return true
      }
      return false
    }
  }
})()

UserModule.addUser('LC')
UserModule.addUser('AtomCode')
console.log(UserModule.getAll()) // [{ id: 1, name: 'LC' }, { id: 2, name: 'AtomCode' }]
console.log(UserModule.users) // undefined（私有）
```

**模块模式的三要素**：
1. IIFE 创建独立作用域
2. 在 IIFE 内声明私有变量和方法
3. 返回对象暴露公共接口——这些方法通过闭包访问私有变量

### 3.2 循环绑定事件

```javascript
// 错误示范
for (var i = 0; i < 5; i++) {
  document.getElementById(`btn${i}`).onclick = function() {
    console.log(i) // 总是 5
  }
}

// 修正方案1：IIFE 创建新作用域
for (var i = 0; i < 5; i++) {
  (function(j) {
    document.getElementById(`btn${j}`).onclick = function() {
      console.log(j) // 正确的索引
    }
  })(i)
}

// 修正方案2：let（推荐）
for (let i = 0; i < 5; i++) {
  document.getElementById(`btn${i}`).onclick = function() {
    console.log(i) // 正确的索引
  }
}
```

### 3.3 函数防抖与节流

```javascript
// 防抖：一段时间内只执行最后一次调用
function debounce(fn, delay = 300) {
  let timer = null // 闭包保存 timer

  return function(...args) {
    if (timer) clearTimeout(timer)
    
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

// 使用
const saveInput = debounce(function(value) {
  console.log('保存:', value)
}, 500)

saveInput('a')
saveInput('ab')
saveInput('abc')
// 只会在最后一次调用 500ms 后输出 '保存: abc'
```

```javascript
// 节流：一段时间内只执行一次
function throttle(fn, interval = 300) {
  let lastTime = 0 // 闭包保存上次执行时间

  return function(...args) {
    const now = Date.now()
    if (now - lastTime >= interval) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}
```

---

## 四、闭包与循环的经典面试题

```javascript
// 题目1：输出什么？
for (var i = 0; i < 3; i++) {
  setTimeout(function() {
    console.log(i)
  }, 1000)
}
// 答案：1 秒后输出 3, 3, 3
// 原因：var i 是全局的，循环结束时 i = 3

// 题目2：输出什么？
for (let i = 0; i < 3; i++) {
  setTimeout(function() {
    console.log(i)
  }, 1000)
}
// 答案：1 秒后输出 0, 1, 2
// 原因：let 每次迭代创建一个新的绑定

// 题目3：下面的 IIFE 能工作吗？
for (var i = 0; i < 3; i++) {
  (function() {
    setTimeout(function() {
      console.log(i) // i 来自外部，不是参数
    }, 1000)
  })()
}
// 答案：仍然输出 3, 3, 3（IIFE 没有捕获 i）

// 题目4：修正题目3
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(function() {
      console.log(j) // j 是 IIFE 的参数，被闭包捕获
    }, 1000)
  })(i)
}
// 答案：0, 1, 2
```

---

## 五、闭包与内存管理

### 5.1 闭包可能导致内存泄漏

```javascript
function setupHandler() {
  const largeData = new Array(1000000).fill('some data')

  document.getElementById('btn').onclick = function() {
    // 这个闭包引用了 largeData
    console.log('button clicked')
    // 但函数体内根本没有用到 largeData！
  }
}
```

**问题**：闭包持有 `largeData` 的引用，即使没有使用它，它也不会被垃圾回收。

**解决**：

```javascript
function setupHandler() {
  const largeData = new Array(1000000).fill('some data')

  document.getElementById('btn').onclick = (function() {
    // 把不需要的东西去掉
    const handler = function() {
      console.log('button clicked')
    }
    // 解除大对象的引用
    largeData = null
    return handler
  })()
}
```

### 5.2 及时释放闭包

```javascript
function getCounter() {
  let count = 0

  return function() {
    count++
    console.log(count)
  }
}

// 使用完后解除引用，让 GC 回收
let counter = getCounter()
counter()
counter()

counter = null // 闭包和 count 现在可以被 GC 回收了
```

---

## 六、闭包的深度理解

### 6.1 每次调用都创建新的闭包

```javascript
function makeCounter() {
  let count = 0
  return function() {
    return ++count
  }
}

const c1 = makeCounter()
const c2 = makeCounter()

console.log(c1()) // 1
console.log(c1()) // 2
console.log(c2()) // 1（c2 有自己独立的 count）
console.log(c1()) // 3
```

每次调用 `makeCounter()` 都会创建：
- 一个新的 `count` 变量
- 一个新的闭包函数
- 它们互不影响

### 6.2 闭包可以访问多个外层变量

```javascript
function createPerson(name) {
  let age = 0

  return {
    getName() { return name },
    getAge() { return age },
    growUp() { age++ },
    setName(newName) { name = newName },
  }
}

const person = createPerson('LC')
console.log(person.getName()) // LC
person.growUp()
person.growUp()
console.log(person.getAge()) // 2
person.setName('AtomCode')
console.log(person.getName()) // AtomCode
```

---

## 七、闭包的应用场景一览

| 场景 | 闭包的作用 | 示例 |
|------|-----------|------|
| **模块模式** | 隐藏内部状态，暴露公共接口 | 单例、工具库 |
| **柯里化** | 预填充参数，延迟执行 | `bind()`, 偏函数 |
| **防抖/节流** | 保存 timer/时间戳状态 | 搜索输入、滚动事件 |
| **事件绑定** | 保存循环中的索引 | 列表项点击事件 |
| **React Hooks** | 保存组件状态和副作用 | useState 的闭包陷阱 |
| **高阶函数** | 返回增强函数 | `once()`, `memoize()` |

### React 中的闭包陷阱

```javascript
function Counter() {
  const [count, setCount] = useState(0)

  // 闭包陷阱：setTimeout 捕获了旧的 count
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log(count) // 始终是 0（闭包捕获了初始值）
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return <button onClick={() => setCount(count + 1)}>+1</button>
}
```

**解决**：使用 ref 或 functional update 打破闭包。

---

## 总结

1. **闭包 = 函数 + 函数定义时的词法作用域**
2. 闭包在函数**定义时创建**，在函数**于定义的作用域外执行时**体现
3. 三种识别方式：返回值、参数传递、间接引用
4. 三大应用：**模块模式**（信息隐藏）、**防抖节流**（状态保持）、**事件绑定**（循环捕获）
5. 注意 **内存管理**：不需要的闭包要及时解除引用
6. 闭包不是"特性"——它是**词法作用域的必然结果**

> 下一篇将深入 **this 的四种绑定规则**，彻底搞懂 JavaScript 中最令人困惑的关键字。
