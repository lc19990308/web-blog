---
title: "Vue 计算属性与侦听器：computed vs watch 完全指南"
date: 2021-06-22 21:39:00
updated: 2025-06-23
categories: "Vue"
description: "深入对比 Vue 中 computed 和 watch 的核心差异、适用场景、底层原理，含 Options API 和 Composition API 双版本示例"
tags: "Vue"
copyright: true
---

## 前言

`computed` 和 `watch` 是 Vue 中处理派生状态的两种方式。新手常困惑：**什么时候用 computed？什么时候用 watch？**

核心原则只有一句话：

> **computed 用于派生值，watch 用于执行副作用。**

---

## 一、computed —— 计算属性

### 1.1 基本用法

```vue
<script setup>
import { ref, computed } from 'vue'

const price = ref(10)
const quantity = ref(3)

// 计算属性：依赖变化时重新求值
const total = computed(() => price.value * quantity.value)
</script>

<template>
  <p>总价：¥{{ total }}</p>
</template>
```

### 1.2 带 getter/setter 的计算属性

```vue
<script setup>
import { ref, computed } from 'vue'

const firstName = ref('张')
const lastName = ref('三')

const fullName = computed({
  get: () => `${firstName.value} ${lastName.value}`,
  set: (val) => {
    [firstName.value, lastName.value] = val.split(' ')
  },
})

// 修改 fullName 会触发 setter
fullName.value = '李 四'
console.log(firstName.value) // 李
</script>
```

### 1.3 computed 的特性

| 特性 | 说明 |
|------|------|
| **缓存** | 只有依赖变化时才重新计算（性能优势） |
| **同步** | getter 中不能有异步操作 |
| **无副作用** | 不应修改外部状态（只计算，不操作） |
| **惰性** | 没有被模板或其他 computed 引用时，不会求值 |

**为什么 computed 要缓存？**

```javascript
// ❌ 方法：每次渲染都执行 3 次
totalPrice() { return this.price * this.quantity }

// ✅ computed：只执行 1 次，其他 2 次读缓存
computed: {
  totalPrice() { return this.price * this.quantity }
}
// 模板中使用 3 次，但只计算 1 次
// {{ totalPrice }} {{ totalPrice }} {{ totalPrice }}
```

---

## 二、watch —— 侦听器

### 2.1 基本用法

```vue
<script setup>
import { ref, watch } from 'vue'

const keyword = ref('')

// 侦听单个数据源
watch(keyword, (newVal, oldVal) => {
  console.log(`搜索词从 "${oldVal}" 变为 "${newVal}"`)
  // 执行副作用：发请求
  fetchSearchResults(newVal)
})
</script>

<template>
  <input v-model="keyword" placeholder="搜索..." />
</template>
```

### 2.2 侦听多个数据源

```vue
<script setup>
import { ref, watch } from 'vue'

const x = ref(0)
const y = ref(0)

watch([x, y], ([newX, newY], [oldX, oldY]) => {
  console.log(`坐标变化: (${oldX},${oldY}) → (${newX},${newY})`)
})
</script>
```

### 2.3 深度侦听

```vue
<script setup>
import { ref, watch } from 'vue'

const user = ref({ name: '张三', address: { city: '北京' } })

// ❌ 不加 deep，对象内部变化侦听不到
watch(user, (newVal) => {
  console.log('user 变了') // 引用不变时不触发
})

// ✅ 加 deep，深度侦听内部变化
watch(user, (newVal) => {
  console.log('user 变了')
}, { deep: true })

// ✅ 更精确：只侦听某个字段
watch(() => user.value.address.city, (newVal) => {
  console.log('城市变了:', newVal)
})
</script>
```

### 2.4 立即执行

```vue
<script setup>
import { ref, watch } from 'vue'

const id = ref(1)

// immediate: true → 创建侦听器时立即执行一次
watch(id, async (newId) => {
  const data = await fetch(`/api/user/${newId}`)
  // 初始化时也需要获取数据
}, { immediate: true })
</script>
```

---

## 三、computed vs watch 对比

### 3.1 核心区别

| 维度 | computed | watch |
|------|----------|-------|
| **用途** | 派生新值 | 执行副作用 |
| **缓存** | ✅ 有缓存 | ❌ 每次变化都触发 |
| **异步** | ❌ 不支持 | ✅ 支持 |
| **返回值** | 必须有 return | 不需要 |
| **内部修改数据** | ❌ 不推荐 | ✅ 适合 |
| **深度监听** | 自动追踪依赖 | 需要 `deep: true` |
| **初始执行** | 首次被引用时 | 默认不执行（可加 `immediate`）|

### 3.2 选型决策

```
需要根据已有数据产生一个新值？
├─ 是 → computed ✅
└─ 否 → 继续 ↓

需要在数据变化时执行异步操作（发请求、setTimeout）？
├─ 是 → watch ✅
└─ 否 → 继续 ↓

需要在数据变化时修改其他数据？
├─ 是 → watch ✅
└─ 否 → computed ✅
```

### 3.3 实战场景演示

```vue
<script setup>
import { ref, computed, watch } from 'vue'

// ✅ computed 场景：购物车总价
const cart = ref([{ price: 10, num: 2 }, { price: 20, num: 1 }])
const totalPrice = computed(() =>
  cart.value.reduce((sum, item) => sum + item.price * item.num, 0)
)

// ✅ computed 场景：过滤列表
const keyword = ref('')
const list = ref([...])
const filteredList = computed(() =>
  list.value.filter(item => item.name.includes(keyword.value))
)

// ✅ watch 场景：搜索防抖发请求
const searchInput = ref('')
watch(searchInput, (val) => {
  // 防抖
  clearTimeout(timer)
  timer = setTimeout(() => fetchSearch(val), 300)
})

// ✅ watch 场景：路由参数变化时重新获取数据
watch(() => route.params.id, async (newId) => {
  const data = await fetch(`/api/detail/${newId}`)
  detail.value = data
})
</script>
```

---

## 四、watchEffect —— 自动追踪

Vue 3 的 `watchEffect` 自动追踪内部用到的所有响应式数据：

```vue
<script setup>
import { ref, watchEffect } from 'vue'

const id = ref(1)
const data = ref(null)

// 自动追踪 id，id 变化时重新执行
watchEffect(async () => {
  data.value = await fetch(`/api/user/${id.value}`)
})
```

**watch vs watchEffect：**

| 特性 | watch | watchEffect |
|------|-------|-------------|
| 懒执行 | 默认懒执行（加 `immediate` 可立即） | **立即执行** |
| 追踪方式 | 显式指定数据源 | **自动追踪**内部响应式依赖 |
| 旧值 | ✅ 可拿到 | ❌ 拿不到旧值 |
| 适用场景 | 需要旧值的场景 | 不需要旧值、自动收集依赖 |

---

## 五、常见坑点

### 坑 1：watch 对象内部变化

```javascript
// ❌ 没加 deep，不会触发
watch(user, () => { ... })

// ✅ 加 deep
watch(user, () => { ... }, { deep: true })

// ✅ 更优：用 getter 精确侦听
watch(() => user.value.name, () => { ... })
```

### 坑 2：computed 中修改依赖

```javascript
// ❌ 死循环：computed 中修改了自己的依赖
computed: {
  double() {
    this.count++  // 修改依赖 → 再次计算 → 无限循环
    return this.count * 2
  }
}
```

### 坑 3：watch 中修改正在侦听的数据

```javascript
// ❌ 可能死循环
watch(count, (val) => {
  count.value++  // 修改正在侦听的数据 → 再次触发 watch
})
```

---

## 总结

```javascript
// 记住口诀：
// computed → 派生值（像公式）
// watch    → 副作用（像触发器）
// watchEffect → 自动追踪副作用

// 80% 的场景用 computed，15% 用 watch，5% 用 watchEffect
```

**推荐阅读：**
- [Vue 3 计算属性](https://vuejs.org/guide/essentials/computed)
- [Vue 3 侦听器](https://vuejs.org/guide/essentials/watchers)
