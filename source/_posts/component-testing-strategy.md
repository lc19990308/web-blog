---
title: "前端组件测试策略：从渲染测试到交互测试（Vitest + Testing Library）"
date: 2026-06-25
categories: "测试"
description: "完整讲解前端组件测试的方法论与实践，涵盖渲染测试、事件交互、异步等待、Mock 组件依赖，以及 Vue Testing Library 的使用技巧"
tags: ["测试", "Vue3"]
copyright: true
---

## 前言

组件测试和单元测试的最大区别：**组件测试关注"用户看到什么"和"用户操作后发生了什么"，而不是"函数返回了什么"**。

一个好的组件测试应该：
- 像用户一样使用组件（找文字、找按钮、点击、输入）
- 不测试内部实现细节（不关心 ref、不关心 state 结构）
- 覆盖核心交互路径和边界情况

本文使用 **Vitest + Vue Testing Library** 作为测试栈。

---

## 一、工具选型

```bash
# 安装
npm install -D vitest @vue/test-utils happy-dom
npm install -D @testing-library/vue @testing-library/jest-dom
```

```javascript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',       // 轻量 DOM 环境
    globals: true,                   // 全局 describe/it/expect
    setupFiles: ['./tests/setup.ts'],
  },
})
```

```javascript
// tests/setup.ts
import '@testing-library/jest-dom/vitest'
// 提供 toBeInTheDocument、toHaveTextContent 等自定义匹配器
```

---

## 二、渲染测试

### 2.1 基础渲染

```vue
<!-- Greeting.vue -->
<script setup lang="ts">
defineProps<{ name: string }>()
</script>

<template>
  <div class="greeting">
    <h1>你好，{{ name }}！</h1>
  </div>
</template>
```

```javascript
// Greeting.test.ts
import { render, screen } from '@testing-library/vue'
import Greeting from './Greeting.vue'

describe('Greeting', () => {
  it('渲染用户名称', () => {
    render(Greeting, { props: { name: 'LC' } })

    expect(screen.getByText('你好，LC！')).toBeInTheDocument()
  })

  it('没有名称时显示默认文案', () => {
    render(Greeting, { props: { name: '' } })

    expect(screen.getByText(/你好/)).toBeInTheDocument()
  })
})
```

### 2.2 组件快照

```javascript
it('快照保持一致', () => {
  const { container } = render(Greeting, { props: { name: 'LC' } })
  expect(container.innerHTML).toMatchSnapshot()
})
```

---

## 三、交互测试

### 3.1 按钮点击

```vue
<!-- Counter.vue -->
<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <div>
    <p data-testid="count">计数: {{ count }}</p>
    <button @click="count++">增加</button>
    <button @click="count = 0">重置</button>
  </div>
</template>
```

```javascript
import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import Counter from './Counter.vue'

describe('Counter', () => {
  it('点击增加按钮计数+1', async () => {
    const user = userEvent.setup()
    render(Counter)

    const button = screen.getByRole('button', { name: '增加' })
    await user.click(button)

    expect(screen.getByTestId('count')).toHaveTextContent('计数: 1')
  })

  it('重置按钮将计数归零', async () => {
    const user = userEvent.setup()
    render(Counter)

    // 先增加几次
    await user.click(screen.getByRole('button', { name: '增加' }))
    await user.click(screen.getByRole('button', { name: '增加' }))
    expect(screen.getByTestId('count')).toHaveTextContent('计数: 2')

    // 再重置
    await user.click(screen.getByRole('button', { name: '重置' }))
    expect(screen.getByTestId('count')).toHaveTextContent('计数: 0')
  })
})
```

### 3.2 输入框测试

```vue
<!-- SearchBox.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ onSearch: (q: string) => void }>()
const query = ref('')

watch(query, (val) => {
  if (val.length >= 2) props.onSearch(val)
})
</script>

<template>
  <div>
    <input v-model="query" placeholder="搜索..." data-testid="search-input" />
    <p v-if="query.length > 0 && query.length < 2" class="hint">至少输入 2 个字符</p>
  </div>
</template>
```

```javascript
describe('SearchBox', () => {
  it('输入少于 2 字符时不触发搜索', async () => {
    const onSearch = vi.fn()
    const user = userEvent.setup()
    render(SearchBox, { props: { onSearch } })

    const input = screen.getByTestId('search-input')
    await user.type(input, 'a')

    expect(onSearch).not.toHaveBeenCalled()
  })

  it('输入 2 字符时触发搜索', async () => {
    const onSearch = vi.fn()
    const user = userEvent.setup()
    render(SearchBox, { props: { onSearch } })

    const input = screen.getByTestId('search-input')
    await user.type(input, 'ab')

    expect(onSearch).toHaveBeenCalledWith('ab')
  })

  it('显示输入提示', async () => {
    const user = userEvent.setup()
    render(SearchBox, { props: { onSearch: vi.fn() } })

    await user.type(screen.getByTestId('search-input'), 'a')

    expect(screen.getByText('至少输入 2 个字符')).toBeInTheDocument()
  })
})
```

### 3.3 异步更新

```vue
<!-- AsyncList.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{ fetchItems: () => Promise<string[]> }>()
const items = ref<string[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    items.value = await props.fetchItems()
  } catch (e) {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <p v-if="loading">加载中...</p>
    <p v-if="error" class="error">{{ error }}</p>
    <ul v-else>
      <li v-for="item in items" :key="item">{{ item }}</li>
    </ul>
  </div>
</template>
```

```javascript
describe('AsyncList', () => {
  it('加载完成后显示列表', async () => {
    const fetchItems = vi.fn().mockResolvedValue(['Vue', 'React', 'Solid'])
    render(AsyncList, { props: { fetchItems } })

    // 等待异步更新
    await waitFor(() => {
      expect(screen.getByText('Vue')).toBeInTheDocument()
      expect(screen.getByText('React')).toBeInTheDocument()
    })
  })

  it('加载失败时显示错误信息', async () => {
    const fetchItems = vi.fn().mockRejectedValue(new Error('Network Error'))
    render(AsyncList, { props: { fetchItems } })

    await waitFor(() => {
      expect(screen.getByText('加载失败')).toBeInTheDocument()
    })
  })

  it('加载中显示 loading 状态', async () => {
    const fetchItems = vi.fn().mockReturnValue(new Promise(() => {})) // 永远 pending
    render(AsyncList, { props: { fetchItems } })

    expect(screen.getByText('加载中...')).toBeInTheDocument()
  })
})
```

---

## 四、模拟子组件

```javascript
// Mock 子组件，隔离测试
import { shallowMount } from '@vue/test-utils'
// shallowMount 不会渲染子组件，只渲染当前组件

// 或用 Testing Library 的方式：
vi.mock('./ChildComponent.vue', () => ({
  default: {
    template: '<div data-testid="mocked-child" />',
  },
}))
```

---

## 五、表单测试

```vue
<!-- LoginForm.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ submit: [data: { email: string; password: string }] }>()
const email = ref('')
const password = ref('')
const errors = ref<{ email?: string; password?: string }>({})

function handleSubmit() {
  errors.value = {}
  if (!email.value) errors.value.email = '邮箱不能为空'
  if (!password.value) errors.value.password = '密码不能为空'
  if (Object.keys(errors.value).length > 0) return

  emit('submit', { email: email.value, password: password.value })
}
</script>

<template>
  <form @submit.prevent="handleSubmit" data-testid="login-form">
    <div>
      <label>邮箱</label>
      <input v-model="email" data-testid="email-input" />
      <p v-if="errors.email" class="error">{{ errors.email }}</p>
    </div>
    <div>
      <label>密码</label>
      <input v-model="password" type="password" data-testid="password-input" />
      <p v-if="errors.password" class="error">{{ errors.password }}</p>
    </div>
    <button type="submit" data-testid="submit-btn">登录</button>
  </form>
</template>
```

```javascript
describe('LoginForm', () => {
  it('空表单提交时显示校验错误', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(LoginForm, { props: { onSubmit } })

    await user.click(screen.getByTestId('submit-btn'))

    expect(screen.getByText('邮箱不能为空')).toBeInTheDocument()
    expect(screen.getByText('密码不能为空')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('填写完整表单后触发表单提交', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(LoginForm, { props: { onSubmit } })

    await user.type(screen.getByTestId('email-input'), 'test@example.com')
    await user.type(screen.getByTestId('password-input'), '123456')
    await user.click(screen.getByTestId('submit-btn'))

    expect(onSubmit).toHaveBeenCalled()
  })
})
```

---

## 六、测试指令

### 6.1 Query 优先级

```javascript
// 推荐优先级（越靠前越好）
getByRole()         // 通过 ARIA 角色找（最接近用户感知）
getByLabelText()    // 通过 label 找（表单输入框）
getByPlaceholderText() // 通过 placeholder 找
getByText()         // 通过文字内容找
getByDisplayValue() // 通过表单值找
getByAltText()      // 通过 alt 属性找（图片）
getByTitle()        // 通过 title 属性找
getByTestId()       // 通过 data-testid 找（最后手段）
```

```javascript
// ✅ 好的
screen.getByRole('button', { name: '提交' })
screen.getByLabelText('用户名')

// ❌ 不好的
screen.getByTestId('submit-btn')  // 依赖实现细节
```

### 6.2 Query 方法

```javascript
// getBy*：找不到或找到多个时抛错
screen.getByText('确定')
// findBy*：返回 Promise，等待异步出现
await screen.findByText('加载完成')
// queryBy*：找不到返回 null（不抛错）
expect(screen.queryByText('加载中')).not.toBeInTheDocument()

// getAllBy / findAllBy / queryAllBy：找到多个
screen.getAllByRole('listitem')
```

---

## 七、自定义事件

```vue
<!-- Dropdown.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{ select: [value: string] }>()
const open = ref(false)
const items = ['选项 A', '选项 B', '选项 C']

function toggle() { open.value = !open.value }

function select(value: string) {
  emit('select', value)
  open.value = false
}

// 点击外部关闭
function handleClickOutside(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('[data-dropdown]')) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
```

```javascript
describe('Dropdown', () => {
  it('点击选项触发 select 事件', async () => {
    const user = userEvent.setup()
    const { emitted } = render(Dropdown)

    // 打开下拉
    await user.click(screen.getByRole('button'))
    // 选择选项
    await user.click(screen.getByText('选项 B'))

    expect(emitted().select).toBeTruthy()
    expect(emitted().select[0]).toEqual(['选项 B'])
  })
})
```

---

## 八、测试策略建议

### 8.1 什么组件需要测试？

```javascript
// ✅ 应该测试
// - 表单（校验、提交、错误显示）
// - 列表（加载、空态、错误态、渲染）
// - 交互组件（弹窗、下拉、拖拽）
// - 有复杂业务逻辑的组件
// - 被多个页面复用的组件

// ❌ 不需要测试
// - 纯展示型组件（没有交互逻辑）
// - 简单的包装组件
// - 第三方组件（维护方测试过了）
```

### 8.2 测试力度

```javascript
// 页面级别测试：覆盖一次核心流程
// 组件级别测试：覆盖所有交互路径
// 工具函数测试：覆盖所有边界情况
```

---

## 总结

| 测试类型 | 验证内容 | 常用 API |
|---------|---------|---------|
| **渲染测试** | 组件是否正确渲染 | `render()`、`screen.getByText()` |
| **交互测试** | 用户操作是否产生预期结果 | `userEvent.click()`、`userEvent.type()` |
| **异步测试** | 异步更新是否正常 | `waitFor()`、`findBy*()` |
| **快照测试** | UI 是否意外变化 | `toMatchSnapshot()` |
| **事件测试** | emit 事件是否触发 | `emitted()` |
| **Mock 组件** | 隔离子组件 | `vi.mock()`、`shallowMount()` |

> 组件测试的核心原则：**测试行为，而不是实现**。不要断言 `count.value === 1`，而是断言页面上显示 "计数: 1"。这样重构时测试不会碎。
