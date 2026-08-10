---
title: "Pinia 使用边界：什么该放 Store，什么不该放"
date: 2026-06-16
categories: "Vue3"
description: "Pinia 不是万能药。本文深入探讨 Pinia 的使用边界——哪些数据应该放在 Store、哪些应该留在组件局部、Store 的拆分策略、以及何时应该避免使用 Pinia"
tags: "Vue3"
copyright: true
---

## 前言

很多 Vue 3 初学者容易走入一个误区：

> "所有数据都放 Pinia，反正它管理状态很方便。"

结果就是：Store 里塞满了各种数据——表单输入、弹窗显隐、甚至组件的内部状态……最终导致：
- Store 文件膨胀到几百行
- 组件和 Store 紧耦合，难以复用
- 本来应该销毁的组件状态，因为放在 Store 里而"阴魂不散"

**Pinia 不是万能药。知道"什么不该放"比知道"怎么放"更重要。**

---

## 一、核心原则：组件的归组件，共享的归 Store

```markdown
              ┌──────────────────────┐
              │  这个数据是否被多个    │
              │  不相关的组件使用？    │
              └──────────┬───────────┘
                         │
              ┌──────────┴───────────┐
              │ 是                  │ 否
              ▼                     ▼
        ┌────────────┐      ┌──────────────┐
        │  放入 Pinia │      │ 组件局部状态  │
        │  (全局共享) │      │ (ref/reactive)│
        └────────────┘      └──────────────┘
```

### 1.1 应该放 Pinia 的数据

```javascript
// ✅ 用户登录信息——多个页面都需要
export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token'))
  const profile = ref(null)

  const isLoggedIn = computed(() => !!token.value)

  async function login(credentials) { /* ... */ }
  async function logout() {
    token.value = null
    profile.value = null
    localStorage.removeItem('token')
  }

  return { token, profile, isLoggedIn, login, logout }
})
```

```javascript
// ✅ 购物车数据——多个页面共享
export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const totalCount = computed(() => items.value.reduce((s, i) => s + i.num, 0))
  const totalPrice = computed(() => items.value.reduce((s, i) => s + i.price * i.num, 0))

  function addItem(product) { /* ... */ }
  function removeItem(id) { /* ... */ }

  return { items, totalCount, totalPrice, addItem, removeItem }
})
```

```javascript
// ✅ 全局 UI 状态——多个组件控制同一个 UI
export const useUIStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(false)
  const theme = ref('light')
  const notifications = ref([])

  function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value }
  function addNotification(n) { notifications.value.push(n) }

  return { sidebarCollapsed, theme, notifications, toggleSidebar, addNotification }
})
```

### 1.2 不应该放 Pinia 的数据

```vue
<!-- ❌ 单个组件内部的数据 -->
<script setup>
import { ref } from 'vue'

// 这些只在这个组件中使用，不应该放进 Pinia
const inputValue = ref('')         // 表单输入
const isDropdownOpen = ref(false)  // 下拉框显隐
const activeTab = ref('info')      // 组件内的 tab 切换
const localLoading = ref(false)    // 组件自己的加载状态
</script>
```

```vue
<!-- ❌ 组件内部请求的列表数据（如果只在一个页面使用） -->
<script setup>
import { ref, onMounted } from 'vue'

// 这个列表只在这个页面使用，不需要放进 Store
const products = ref([])
const loading = ref(true)

onMounted(async () => {
  products.value = await fetch('/api/products').then(r => r.json())
  loading.value = false
})
</script>
```

---

## 二、Pinia vs 组件局部状态：详细对比

| 维度 | 组件局部状态 | Pinia Store |
|------|------------|-------------|
| **作用域** | 当前组件（和子组件通过 props）| **全局**（任何组件）|
| **生命周期** | 组件销毁时自动销毁 | **持久存在**（除非重置）|
| **测试** | 简单（渲染组件即可） | 需要 createPinia |
| **调试** | Vue DevTools 组件面板 | **Vue DevTools Pinia 面板** |
| **代码量** | 少（ref/reactive） | 多（defineStore + 导出）|
| **复用性** | 通过 props 传给子组件 | **任何组件直接用** |

### 2.1 典型误区：把组件的 props 也放 Pinia

```vue
<!-- ❌ 错误：直接把 props 存到 Store -->
<script setup>
import { useUserStore } from '@/stores/user'

const props = defineProps({
  userId: String,
})

// 只是为了子组件能访问，就把 userId 存到了 Store
const store = useUserStore()
store.currentUserId = props.userId
// 直接传 props 给子组件就完了！
</script>

<!-- ✅ 正确：用 props 传递 -->
<template>
  <UserDetail :user-id="userId" />
</template>
```

---

## 三、Store 的拆分策略

### 3.1 按领域拆分，不要按页面拆分

```javascript
// ❌ 错误：按页面拆分（导致 Store 之间大量交叉引用）
stores/
  home.js       // 首页：banner、推荐、热搜混在一起
  product.js    // 商品页
  cart.js       // 购物车
  user.js       // 个人中心

// ✅ 正确：按领域拆分（职责单一）
stores/
  user.js       // 用户认证 + 个人信息
  product.js    // 商品数据（首页、搜索、详情共用）
  cart.js       // 购物车
  ui.js         // 全局 UI 状态（侧栏、主题、通知）
```

### 3.2 Store 应该多大？

```markdown
┌────────────────────────────────────────┐
│  Store 的理想大小                        │
│                                        │
│  ✅ 一个 Store 不超过 100 行              │
│  ✅ 3-5 个 state                         │
│  ✅ 5-8 个 actions/getters               │
│                                        │
│  ⚠️ 超过 200 行 → 考虑拆分              │
│  ❌ 超过 500 行 → 必须拆分              │
└────────────────────────────────────────┘
```

### 3.3 实战：大 Store 拆分示例

```javascript
// ❌ 一个巨大的 Store（200+ 行）
export const useBigStore = defineStore('big', () => {
  // 用户相关
  const token = ref(null)
  const profile = ref(null)

  // 商品相关
  const products = ref([])
  const categories = ref([])

  // 购物车相关
  const cart = ref([])
  const totalPrice = computed(() => { /* ... */ })

  // 订单相关
  const orders = ref([])
  const currentOrder = ref(null)

  // 太多了……
})
```

```javascript
// ✅ 拆分为多个小 Store
export const useUserStore = defineStore('user', () => {
  const token = ref(null)
  const profile = ref(null)
  // ...
})

export const useProductStore = defineStore('product', () => {
  const products = ref([])
  const categories = ref([])
  // ...
})

export const useCartStore = defineStore('cart', () => {
  const cart = ref([])
  const totalPrice = computed(() => { /* ... */ })
  // ...
})
```

### 3.4 Store 之间可以互相调用

拆分后不用担心"数据不在一个 Store 里"——Store 之间可以直接引用：

```javascript
export const useOrderStore = defineStore('order', () => {
  const orders = ref([])

  async function createOrder() {
    // ✅ 正确：Store 之间可以互相调用
    const cartStore = useCartStore()
    const userStore = useUserStore()

    if (!userStore.isLoggedIn) throw new Error('请先登录')

    const order = await api.createOrder(cartStore.items)
    orders.value.push(order)
    cartStore.clearCart()  // 下单后清空购物车
    return order
  }

  return { orders, createOrder }
})
```

---

## 四、何时彻底不用 Pinia

### 4.1 组件内部状态管理

```vue
<!-- 表单状态——完全不需要 Store -->
<script setup>
import { ref } from 'vue'

const form = ref({
  name: '',
  email: '',
  message: '',
})

async function submit() {
  await fetch('/api/contact', { method: 'POST', body: JSON.stringify(form.value) })
  form.value = { name: '', email: '', message: '' }
}
</script>
```

### 4.2 组件实例的单次请求数据

```vue
<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({ id: String })
const detail = ref(null)

onMounted(async () => {
  // 只在组件挂载时请求一次，存组件局部状态就够
  detail.value = await fetch(`/api/detail/${props.id}`).then(r => r.json())
})
</script>
```

### 4.3 父子组件通过 props/emit 就够了

```vue
<!-- 不需要 Store，props 直接传递 -->
<script setup>
defineProps({
  title: String,
  items: Array,
})
defineEmits(['select', 'delete'])
</script>
```

### 4.4 使用 provide/inject 更合适的场景

```vue
<script setup>
import { provide } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const store = useProductStore()

// 如果只有组件树局部需要，provide/inject 比 Pinia 更合适
provide('productContext', {
  product: store.currentProduct,
  addToCart: store.addToCart,
})
</script>
```

---

## 五、决策速查表

```markdown
想用 Pinia 之前，问自己 3 个问题：

Q1: 这个数据被多少个组件使用？
    ├─ 1 个 → 组件局部 ref ✅
    └─ 2+ 个 → 继续问 Q2

Q2: 这些组件是父子关系吗？
    ├─ 是 → props + emit ✅
    └─ 否（兄弟/跨层级）→ 继续问 Q3

Q3: 数据频率和生命周期？
    ├─ 临时数据（表单、弹窗）→ 组件局部 ✅
    ├─ 页面级数据（列表、详情）→ 组件局部 ✅
    ├─ 跨页面共享（用户、购物车）→ Pinia ✅
    └─ 跨组件树共享（主题、Modal）→ Pinia 或 provide/inject
```

### 具体场景对照表

| 场景 | 方案 | 理由 |
|------|------|------|
| 表单输入 | `ref` / `reactive` | 一次性数据，组件销毁即消失 |
| 弹窗显隐 | `ref` 或 `v-model` | 组件内部状态 |
| Tab 切换 | `ref` | 不影响其他组件 |
| 请求加载状态 | `ref` | 组件局部 |
| 用户登录信息 | **✅ Pinia** | 全局需要 |
| 购物车 | **✅ Pinia** | 跨页面共享 |
| 主题/语言 | **✅ Pinia** 或 provide | 全局配置 |
| 通知列表 | **✅ Pinia** | 跨页面 |
| 表单校验状态 | `ref` | 组件局部 |
| 列表搜索参数 | `ref` 或 URL query | 页面级 |

---

## 六、代码组织建议

### 目录结构

```
src/
  stores/
    user.js         # 用户认证 + 个人信息
    product.js      # 商品数据
    cart.js         # 购物车
    ui.js           # 全局 UI 状态
    notification.js # 通知系统
    index.js        # 统一导出（可选）
```

### Store 文件名与 useXxxStore 一致

```javascript
// ✅ 清晰映射
stores/user.js     → useUserStore
stores/product.js  → useProductStore
stores/cart.js     → useCartStore

// ❌ 不一致
stores/userData.js → useAuthStore  // 文件名和 Store 名对不上
```

---

## 总结

```javascript
// Pinia 使用边界核心原则：

// 1. ✅ 要放 Store：全局共享的、跨页面的、需要持久化的
// 2. ❌ 不放 Store：组件内部状态、一次性数据、父子 props

// 3. ✅ 按领域拆分：user/product/cart/ui
// 4. ❌ 不要超大 Store：超过 100 行考虑拆分

// 5. ✅ Store 之间可以互相调用
// 6. ❌ 不要把 props 存到 Store

// 7. ✅ 组件用 ref/reactive 管理自己的状态
// 8. ❌ 不需要所有数据都进 Pinia

// 一句话：先问"这个数据只有这个组件需要吗？"
//         是 → ref，否 → 考虑 Pinia
```

**推荐阅读：**
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Pinia 最佳实践](https://pinia.vuejs.org/cookbook/composables.html)
- [Vue 3 状态管理](https://vuejs.org/guide/scaling-up/state-management.html)
