---
title: "ES6 Map、Set、Symbol 与迭代器实战"
date: 2024-11-22
categories: "ES6"
description: "ES6 新增了 Map/Set/Symbol/Iterator 等数据结构。本文从实战出发，覆盖它们与 Object/Array 的差异、适用场景和常见坑点"
tags: "ES6"
copyright: true
---

## 前言

除了 `let/const` 和箭头函数，ES6 还引入了新的数据结构和类型。掌握它们能让你写出更精确、更高效的代码。

---

## 一、Map——键值对集合

### 1.1 Object vs Map

```javascript
// Object 的局限：key 只能是字符串或 Symbol
const obj = {}
obj['key'] = 'value'
obj[{}] = '对象作为 key'   // 被转为 '[object Object]'

// Map：key 可以是任意类型
const map = new Map()
map.set('string', '字符串')
map.set(123, '数字')
map.set({ a: 1 }, '对象作为 key')  // ✅ 对象作为 key 保持引用
map.set(document.body, 'DOM 元素')
```

### 1.2 Map 实战

```javascript
const userMap = new Map()

// 增删改查
userMap.set(1, { name: '张三', role: 'admin' })
userMap.set(2, { name: '李四', role: 'user' })
userMap.get(1)              // { name: '张三', role: 'admin' }
userMap.has(2)              // true
userMap.delete(1)           // 删除
userMap.size                // 1

// 遍历
userMap.forEach((value, key) => {
  console.log(key, value)
})

for (const [key, value] of userMap) {
  console.log(key, value)
}

// 批量构建
const arr = [['key1', 'val1'], ['key2', 'val2']]
const m = new Map(arr)  // {'key1' => 'val1', 'key2' => 'val2'}
```

| 场景 | 推荐 | 理由 |
|------|------|------|
| 缓存数据 | **Map** | key 可以是对象，方便清理 |
| JSON 序列化 | **Object** | JSON.parse/stringify 原生支持 |
| 频繁增删 | **Map** | 性能优于 Object |
| 需要遍历 | **Map** | 可直接 for...of |

---

## 二、Set——不重复的集合

```javascript
// 基本用法
const set = new Set([1, 2, 2, 3, 3, 4])
console.log(set)          // Set { 1, 2, 3, 4 }
console.log(set.size)     // 4

set.add(5)
set.has(1)                // true
set.delete(1)

// 数组去重
const unique = [...new Set([1, 2, 2, 3, 3, 4])]  // [1, 2, 3, 4]

// 交集
const a = new Set([1, 2, 3])
const b = new Set([2, 3, 4])
const intersection = new Set([...a].filter(x => b.has(x)))  // Set { 2, 3 }

// 并集
const union = new Set([...a, ...b])  // Set { 1, 2, 3, 4 }

// 差集
const difference = new Set([...a].filter(x => !b.has(x)))  // Set { 1 }
```

**Set 适合的场景：**

```javascript
// 标签去重
const tags = ['vue', 'react', 'vue', 'angular', 'react']
const uniqueTags = [...new Set(tags)]  // ['vue', 'react', 'angular']

// 已读列表
const readIds = new Set()
readIds.add(1001)
readIds.add(1002)
readIds.has(1001)  // true（O(1) 查询）
```

---

## 三、Symbol——唯一标识符

```javascript
// 创建唯一值
const s1 = Symbol('描述')
const s2 = Symbol('描述')
console.log(s1 === s2) // false（每次都是唯一的）

// 作为对象属性的 key（防止命名冲突）
const LOGIN = Symbol('login')
const LOGOUT = Symbol('logout')

const eventBus = {
  [LOGIN]: [],
  [LOGOUT]: [],
}

eventBus[LOGIN].push(callback)  // 不会和其他属性冲突
```

---

## 四、Iterator（迭代器）

实现了 `Symbol.iterator` 的对象可以用 `for...of` 遍历：

```javascript
// 原生可迭代对象
for (const item of [1, 2, 3]) { }     // Array
for (const char of 'abc') { }         // String
for (const [k, v] of new Map()) { }   // Map
for (const item of new Set()) { }     // Set

// 自定义可迭代对象
class Range {
  constructor(start, end) {
    this.start = start
    this.end = end
  }

  [Symbol.iterator]() {
    let current = this.start
    const end = this.end
    return {
      next() {
        if (current <= end) {
          return { value: current++, done: false }
        }
        return { done: true }
      },
    }
  }
}

for (const n of new Range(1, 5)) {
  console.log(n)  // 1 2 3 4 5
}
```

---

**推荐阅读：** [MDN: Map](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Map)
