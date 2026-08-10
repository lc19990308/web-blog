---
title: "Vue3 provide/inject 的高级玩法：不止是跨层级传值"
date: 2026-06-11
categories: "Vue3"
description: "深入 Vue3 provide/inject 的高级用法：响应式数据传递、依赖注入封装、组件库设计、组合式函数复用、与 Pinia 的选型对比"
tags: "Vue3"
copyright: true
---

## 前言

`provide` / `inject` 通常被理解为"跨层级传值"的工具，用来避免 props 层层传递。但它的能力远不止于此——它是 Vue 3 中实现**依赖注入**（Dependency Injection）的核心机制。

如果你只把它当"传值"用，那你就错过了它真正的威力。

---

## 一、基础回顾

```vue
<!-- 祖先组件 -->
<script setup>
import { ref, provide } from 'vue'

const theme = ref('light')
const user = ref({ name: '张三' })

provide('theme', theme)
provide('user', user)
provide('updateTheme', (val) => { theme.value = val })
</script>
```

```vue
<!-- 任意后代组件 -->
<script setup>
import { inject } from 'vue'

const theme = inject('theme', 'light')   // 第二个参数是默认值
const user = inject('user')
const updateTheme = inject('updateTheme')
</script>

<template>
  <div :class="theme">
    <p>{{ user.name }}</p>
    <button @click="updateTheme('dark')">切换主题</button>
  </div>
</template>
```

---

## 二、进阶用法

### 2.1 使用 Symbol 避免命名冲突

当项目规模变大，字符串 key 容易冲突：

```javascript
// symbols.js
export const THEME_KEY = Symbol('theme')
export const USER_KEY = Symbol('user')
export const NOTIFICATION_KEY = Symbol('notification')
```

```vue
<script setup>
import { provide } from 'vue'
import { THEME_KEY, USER_KEY } from './symbols'

provide(THEME_KEY, theme)
provide(USER_KEY, user)
</script>
```

```vue
<script setup>
import { inject } from 'vue'
import { THEME_KEY } from './symbols'

const theme = inject(THEME_KEY, 'light')
</script>
```

### 2.2 使用 readonly 保护数据

直接 provide 响应式数据，后代组件可能意外修改它：

```vue
<!-- ❌ 后代组件可以直接修改 -->
<script setup>
const theme = inject('theme')
theme.value = 'dark'  // 直接修改了祖先的数据！难以追踪
</script>

<!-- ✅ 使用 readonly 保护 -->
<script setup>
import { ref, provide, readonly } from 'vue'

const theme = ref('light')

provide('theme', readonly(theme))   // 后代只能读不能改
provide('updateTheme', (val) => {   // 提供修改方法
  theme.value = val
})
</script>
```

### 2.3 默认值与工厂函数

```vue
<script setup>
import { inject } from 'vue'

// 基本默认值
const theme = inject('theme', 'light')

// 工厂函数（创建成本较高的默认值）
const config = inject('config', () => ({
  apiUrl: '/api',
  timeout: 5000,
  retries: 3,
}), true)  // 第三个参数 true 表示使用工厂函数

// 不提供默认值，但期望一定有值（不存在时警告）
const required = inject('requiredKey')
if (!required) {
  console.warn('requiredKey 未被 provide')
}
</script>
```

---

## 三、高级实战：组件库设计

### 3.1 表单组件（el-form 模式）

`provide/inject` 最经典的实战场景是**组件库的复合组件**——比如 Element Plus 的 `el-form`：

```vue
<!-- Form.vue —— 祖先提供上下文 -->
<script setup>
import { provide, ref, readonly } from 'vue'

const props = defineProps({
  model: Object,
  rules: Object,
  labelWidth: { type: String, default: '120px' },
})

const formContext = {
  model: props.model,
  rules: props.rules,
  labelWidth: props.labelWidth,
  addField: (field) => fields.push(field),
  removeField: (field) => fields.splice(fields.indexOf(field), 1),
}

provide('formContext', formContext)
</script>

<template>
  <form class="custom-form">
    <slot />
  </form>
</template>
```

```vue
<!-- FormItem.vue —— 后代注入上下文 -->
<script setup>
import { inject, onMounted, onUnmounted } from 'vue'

const formContext = inject('formContext')
if (!formContext) {
  throw new Error('FormItem 必须放在 Form 组件内使用')
}

const props = defineProps({
  prop: String,       // 对应 model 的字段名
  label: String,
})

const field = {
  prop: props.prop,
  validate: () => { /* 校验逻辑 */ },
}

onMounted(() => formContext.addField(field))
onUnmounted(() => formContext.removeField(field))
</script>

<template>
  <div class="form-item">
    <label :style="{ width: formContext.labelWidth }">{{ label }}</label>
    <slot />
    <p class="error" v-if="error">{{ error }}</p>
  </div>
</template>
```

```vue
<!-- 使用 -->
<Form :model="form" :rules="rules" label-width="100px">
  <FormItem prop="name" label="姓名">
    <input v-model="form.name" />
  </FormItem>
  <FormItem prop="email" label="邮箱">
    <input v-model="form.email" />
  </FormItem>
</Form>
```

**关键设计：**
- Form 提供上下文（model、rules、方法）
- FormItem 注入上下文，自动注册校验
- 子组件无需 props 层层传递

### 3.2 选项卡组件（Tabs）

```vue
<!-- Tabs.vue -->
<script setup>
import { provide, ref } from 'vue'

const activeTab = ref('')
const tabs = ref([])

provide('tabsContext', {
  activeTab,
  registerTab: (tab) => tabs.value.push(tab),
  unregisterTab: (tab) => {
    tabs.value = tabs.value.filter((t) => t !== tab)
  },
  setActive: (name) => { activeTab.value = name },
})
</script>

<template>
  <div class="tabs">
    <div class="tab-headers">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        :class="{ active: activeTab === tab.name }"
        @click="activeTab = tab.name"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="tab-content">
      <slot />
    </div>
  </div>
</template>
```

```vue
<!-- TabPanel.vue -->
<script setup>
import { inject, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps({
  name: { type: String, required: true },
  label: { type: String, required: true },
})

const tabsContext = inject('tabsContext')

const isActive = computed(() => tabsContext.activeTab.value === props.name)

onMounted(() => {
  tabsContext.registerTab({ name: props.name, label: props.label })
  // 默认激活第一个 tab
  if (!tabsContext.activeTab.value) {
    tabsContext.activeTab.value = props.name
  }
})

onUnmounted(() => {
  tabsContext.unregisterTab({ name: props.name })
})
</script>

<template>
  <div v-show="isActive">
    <slot />
  </div>
</template>
```

---

## 四、Vue3 组合式函数中的 provide/inject

provide/inject 可以在组合式函数中使用，实现**跨组件的状态共享**：

### 4.1 封装为 composable

```javascript
// composables/useTheme.js
import { ref, provide, inject, readonly } from 'vue'

const THEME_KEY = Symbol('theme')

// 在祖先组件中调用——提供主题
export function useThemeProvider() {
  const theme = ref('light')
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  provide(THEME_KEY, {
    theme: readonly(theme),
    toggleTheme,
  })

  return { theme, toggleTheme }
}

// 在任何后代组件中调用——使用主题
export function useTheme() {
  const context = inject(THEME_KEY)

  if (!context) {
    // 如果没有被 provide，返回默认值（独立使用时不报错）
    const theme = ref('light')
    const toggleTheme = () => {
      theme.value = theme.value === 'light' ? 'dark' : 'light'
    }
    return { theme, toggleTheme }
  }

  return context
}
```

```vue
<!-- 祖先组件 -->
<script setup>
import { useThemeProvider } from './composables/useTheme'

const { theme } = useThemeProvider()  // provide 主题
</script>

<template>
  <div :class="theme">
    <Child />
  </div>
</template>
```

```vue
<!-- 任何后代组件 -->
<script setup>
import { useTheme } from './composables/useTheme'

const { theme, toggleTheme } = useTheme()  // inject 主题
</script>

<template>
  <button @click="toggleTheme">当前主题：{{ theme }}</button>
</template>
```

### 4.2 模态框管理

```javascript
// composables/useModal.js
import { ref, provide, inject } from 'vue'

const MODAL_KEY = Symbol('modal')

// 管理模态框的打开/关闭
export function useModalProvider() {
  const modals = ref([])

  const openModal = (name, data = {}) => {
    modals.value.push({ name, data })
  }

  const closeModal = (name) => {
    modals.value = modals.value.filter((m) => m.name !== name)
  }

  const closeAll = () => {
    modals.value = []
  }

  provide(MODAL_KEY, { modals, openModal, closeModal, closeAll })

  return { modals, openModal, closeModal, closeAll }
}

// 在任意后代组件中打开/关闭模态框
export function useModal() {
  const context = inject(MODAL_KEY)
  if (!context) {
    throw new Error('useModal() 必须在 useModalProvider() 之后使用')
  }
  return context
}
```

---

## 五、provide/inject vs Pinia

| 特性 | provide/inject | Pinia |
|------|---------------|-------|
| **作用域** | 组件树**局部** | **全局** |
| **适用场景** | 组件库、复合组件 | 全局状态 |
| **TypeScript** | 需手动类型推导 | **天然类型安全** |
| **DevTools** | ❌ 不支持 | ✅ 完整支持 |
| **测试** | 需要提供上下文 | 直接导入 store |
| **团队规范** | 难追踪数据来源 | 集中管理 |

### 选型建议

```markdown
├─ 组件库内部通信（Form/FormItem, Tabs/TabPanel）
│   └─ provide/inject ✅
│
├─ 跨多级组件共享配置（主题、语言、用户信息）
│   └─ provide/inject ✅（更轻量）
│
├─ 全局状态（登录状态、购物车、通知数）
│   └─ Pinia ✅（DevTools 支持）
│
├─ 需要时间旅行调试
│   └─ Pinia ✅
│
└─ 简单跨级传值（2-3 层）
    └─ provide/inject ✅
```

**可以组合使用：**

```vue
<script setup>
import { useUserStore } from '@/stores/user'
import { provide } from 'vue'

const userStore = useUserStore()

// 将 Pinia 的 store 注入到组件树中
provide('user', userStore)

// 后代通过 inject('user') 获取 store
// 比直接 import store 更有"依赖注入"的语义
</script>
```

---

## 六、注意事项

### 6.1 响应式丢失

```javascript
// ❌ 响应式丢失
provide('count', 0)  // 传的是普通值，不是 ref

// ✅ 保持响应式
const count = ref(0)
provide('count', count)

// 或者传递计算属性
provide('double', computed(() => count.value * 2))
```

### 6.2 数据来源不明确

```markdown
provide/inject 的一个缺点：你很难快速找到数据是从哪里 provide 的。

❌ 跨 10 层组件树的 provide — 追踪困难
✅ 2-3 层内的 provide — 清晰可维护

建议：
- 组件库内部的 provide 用 Symbol 命名
- 应用级别的 provide 在 composable 中封装（如 useTheme）
- 超过 3 层或跨多个页面 → 考虑 Pinia
```

### 6.3 与 Options API 的兼容

```javascript
// Options API 中使用 inject
export default {
  inject: ['theme', 'user'],
  // 或带默认值
  inject: {
    theme: { default: 'light' },
    user: { default: () => ({ name: '匿名' }) },
  },
  created() {
    console.log(this.theme)
  },
}
```

---

## 总结

```vue
<script setup>
import { provide, inject, readonly, ref } from 'vue'

// provide 是"发布"
// inject 是"订阅"

// 最佳实践：
// 1. 用 Symbol 作为 key，避免命名冲突
// 2. 用 readonly 保护数据，提供修改方法
// 3. 封装为 composable，提供类型安全
// 4. 组件库内部通信 → provide/inject
// 5. 全局状态 → Pinia
</script>
```

| 阶段 | 用法 | 场景 |
|------|------|------|
| 基础 | `provide(key, value)` + `inject(key)` | 跨层级传值 |
| 进阶 | Symbol key + readonly + 回调 | 安全的依赖注入 |
| 高级 | 封装 composable + 组件库上下文 | Form/Tabs/Modal 组件 |
| 扩展 | + Pinia 组合使用 | 局部注入全局状态 |

**推荐阅读：**
- [Vue 3: provide / inject](https://vuejs.org/guide/components/provide-inject.html)
- [Vue 3: 依赖注入](https://vuejs.org/guide/components/provide-inject.html#working-with-reactivity)
- [Element Plus 源码](https://github.com/element-plus/element-plus)（大量 provide/inject 实战）
