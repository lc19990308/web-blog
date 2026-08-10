---
title: "Vue nextTick 原理与应用：DOM 更新后执行"
date: 2023-11-07 15:31:00
updated: 2026-06-23
categories: "Vue"
description: "理解 Vue 的 nextTick 机制——为什么数据变了但 DOM 没变？何时需要 nextTick？原理是什么？附实战场景"
tags: "Vue"
copyright: true
---

## 前言

很多 Vue 初学者会遇到这样的问题：

```javascript
const count = ref(0)

function handleClick() {
  count.value++
  console.log(document.getElementById('count').textContent) // ❌ 还是旧值
}
```

这是因为 Vue 的 DOM 更新是**异步**的。而 `nextTick` 就是在 DOM 更新完成后执行回调的工具。

---

## 一、为什么需要 nextTick

### 1.1 Vue 的异步更新策略

```vue
<script setup>
import { ref, nextTick } from 'vue'

const list = ref([])

function addItem() {
  list.value.push('新项目')

  // ❌ DOM 还没更新
  console.log(list.value.length)            // 1（数据已变）
  console.log(document.querySelectorAll('li').length) // 0（DOM 未更新）

  // ✅ 等 DOM 更新后再操作
  nextTick(() => {
    console.log(document.querySelectorAll('li').length) // 1
  })
}
</script>

<template>
  <ul>
    <li v-for="item in list" :key="item">{{ item }}</li>
  </ul>
</template>
```

### 1.2 性能优化

```javascript
function addMultiple() {
  // 同步修改数据多次
  list.value.push('A')
  list.value.push('B')
  list.value.push('C')

  // ✅ DOM 只会更新一次——Vue 会批量处理
  // 而不是修改一次就重新渲染一次
}
```

Vue 将同一事件循环中的数据变更缓冲起来，在下一次事件循环中批量更新 DOM——这就是**异步更新队列**。

---

## 二、nextTick 的用法

### 2.1 组合式 API（Vue 3）

```vue
<script setup>
import { ref, nextTick } from 'vue'

const inputRef = ref(null)
const showInput = ref(false)

async function showAndFocus() {
  showInput.value = true

  // 方式一：回调函数
  nextTick(() => {
    inputRef.value.focus()
  })

  // 方式二：async/await（推荐）
  await nextTick()
  inputRef.value.focus()
}
</script>

<template>
  <input v-if="showInput" ref="inputRef" type="text" />
</template>
```

### 2.2 选项式 API（Vue 2/3）

```javascript
export default {
  data() { return { showInput: false } },
  methods: {
    showAndFocus() {
      this.showInput = true
      this.$nextTick(() => {
        this.$refs.input.focus()
      })
    },
  },
}
```

---

## 三、实战场景

### 3.1 获取更新后的 DOM 尺寸

```vue
<script setup>
import { ref, nextTick } from 'vue'

const content = ref('')
const boxRef = ref(null)

async function updateContent(text) {
  content.value = text

  // 等待 DOM 更新，获取实际渲染高度
  await nextTick()
  const height = boxRef.value.offsetHeight
  console.log('内容高度:', height)
}
</script>
```

### 3.2 列表滚动到底部

```vue
<script setup>
import { ref, nextTick } from 'vue'

const messages = ref([])
const listRef = ref(null)

async function addMessage(msg) {
  messages.value.push(msg)

  // 等新消息渲染完后滚动到底部
  await nextTick()
  listRef.value.scrollTop = listRef.value.scrollHeight
}
</script>

<template>
  <div ref="listRef" class="message-list">
    <div v-for="msg in messages" :key="msg.id">{{ msg.text }}</div>
  </div>
</template>
```

### 3.3 与第三方库配合

```vue
<script setup>
import { ref, nextTick, onMounted } from 'vue'
import Chart from 'chart.js'

const chartRef = ref(null)

onMounted(async () => {
  // 确保 DOM 渲染完成
  await nextTick()

  // 初始化图表
  new Chart(chartRef.value, {
    type: 'bar',
    data: { /* ... */ },
  })
})
</script>
```

---

## 四、nextTick 原理

### 4.1 实现原理

Vue 的 nextTick 本质上使用了 JavaScript 的**微任务**机制：

```javascript
// 简化版实现
const callbacks = []
let pending = false

function nextTick(cb) {
  callbacks.push(cb)

  if (!pending) {
    pending = true
    // 使用 Promise 创建微任务
    Promise.resolve().then(flushCallbacks)
  }
}

function flushCallbacks() {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  copies.forEach(cb => cb())
}
```

### 4.2 执行顺序

```
同步代码执行
  │
  ├── Vue 数据变更（data changed）
  │     ↓
  ├── 放入异步更新队列（watcher queue）
  │     ↓
  ├── nextTick(callback) → 回调放入微任务队列
  │     ↓
  ├── 同步代码执行完毕
  │     ↓
  ├── 微任务队列执行
  │     ├── Vue 批量更新 DOM
  │     └── nextTick 回调执行（此时 DOM 已更新）
  │     ↓
  └── 宏任务（setTimeout 等）
```

---

## 五、注意事项

### 5.1 nextTick 不是 setTimeout

```javascript
// nextTick：微任务，DOM 更新后立即执行
nextTick(() => { /* DOM 已更新 */ })

// setTimeout：宏任务，要等下一轮事件循环
setTimeout(() => { /* DOM 已更新 */ })
```

两者都能等到 DOM 更新，但 `nextTick` 更早执行，性能更好。

### 5.2 不必要的 nextTick

```javascript
// ❌ 不需要 nextTick 的场景
// 如果你只是获取响应式数据，不需要等 DOM
const data = ref({ name: 'test' })

function update() {
  data.value.name = 'new'
  console.log(data.value.name) // 直接访问数据，不需要 nextTick
}
```

---

## 六、调试技巧

```vue
<script setup>
import { nextTick } from 'vue'

// 追踪 DOM 更新时间
const start = performance.now()

someData.value = 'new value'

nextTick(() => {
  const elapsed = performance.now() - start
  console.log(`DOM 更新耗时: ${elapsed.toFixed(2)}ms`)
})
</script>
```

---

## 总结

```javascript
// nextTick 核心：
// 1. 解决"数据变了，但 DOM 没变"的问题
// 2. Vue 异步更新 DOM → nextTick 在 DOM 更新后回调
// 3. 基于 Promise（微任务）

// 适用场景：
// - 获取更新后的 DOM 尺寸/位置
// - 操作 v-if/v-for 渲染后的元素
// - 与第三方 DOM 库配合
// - 列表滚动到底部

// 不建议：
// - 仅访问响应式数据（不需要等 DOM）
// - 替代 watch（watch 更语义化）
```

**推荐阅读：**
- [Vue 3 nextTick 文档](https://vuejs.org/api/general.html#nexttick)
- [Vue 异步更新队列](https://vuejs.org/guide/essentials/reactivity-fundamentals.html#async-update-queue)
