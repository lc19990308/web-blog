---
title: "Vue 3.5 更新了什么：模板引用、SSR 与 Watch 控制"
date: 2025-03-18
categories: "Vue3"
description: "Vue 3.5 增加了 useId、useTemplateRef、响应式 props 解构、Watcher 暂停恢复和延迟激活。本文只保留可直接使用的 API 与适用边界。"
tags: "Vue3"
copyright: true
---

Vue 3.5 主要改善了组件开发和 SSR 场景的细节。升级前先确认运行时、编译器和 `@vue/language-tools` 的版本保持一致；只升级 `vue` 而保留旧编译器，往往会得到难以解释的类型或构建问题。

下面的 API 都要求项目实际运行在 Vue 3.5 或更高版本。

## `useTemplateRef` 让模板引用更明确

`useTemplateRef` 用字符串和模板中的 `ref` 对应，类型工具可以据此给出更好的提示。它尤其适合组合式函数需要拿到元素引用的场景。

```vue
<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'

const inputRef = useTemplateRef<HTMLInputElement>('name-input')

onMounted(() => {
  inputRef.value?.focus()
})
</script>

<template>
  <input ref="name-input" name="name" />
</template>
```

它不会让引用在挂载前可用，访问 DOM 的时机仍然是 `onMounted` 或后续的事件回调。

## `useId` 解决可访问性与 SSR ID 对齐

表单控件需要稳定地关联 `label`、说明和错误信息。手写随机 ID 在 SSR 时容易和客户端渲染不一致，`useId` 为此提供了稳定的 ID 序列。

```vue
<script setup>
import { useId } from 'vue'

const inputId = useId()
const hintId = useId()
</script>

<template>
  <label :for="inputId">姓名</label>
  <input :id="inputId" :aria-describedby="hintId" />
  <p :id="hintId">请输入证件上的姓名。</p>
</template>
```

它适合组件内部生成关联 ID，不适合拿来当数据库主键或跨请求的业务标识。

## 响应式 props 解构与 Watch 控制

在 `<script setup>` 中，Vue 3.5 会把同一作用域内解构出来的 props 访问编译为响应式访问。默认值也可以直接放在解构表达式里：

```vue
<script setup lang="ts">
import { watch } from 'vue'

const { title, pageSize = 20 } = defineProps<{
  title: string
  pageSize?: number
}>()

const handle = watch(
  () => pageSize,
  (value) => console.log('pageSize', value)
)

handle.pause()
handle.resume()
handle.stop()
</script>
```

`watch()` 返回的句柄没有 `restart()`。调用返回函数或 `stop()` 后，Watcher 会永久停止；需要暂时跳过回调时用 `pause()` 和 `resume()`。

## 延迟激活只适用于 SSR 异步组件

Vue 3.5 的 Lazy Hydration 不是一个内置的 `<LazyHydrate>` 组件。它通过异步组件的 `hydrate` 选项控制服务端已渲染内容何时在客户端激活：

```ts
import { defineAsyncComponent, hydrateOnVisible } from 'vue'

export const HeavyChart = defineAsyncComponent({
  loader: () => import('./HeavyChart.vue'),
  hydrate: hydrateOnVisible()
})
```

这适合 SSR 页面上首屏之外、交互成本较高的组件。延迟激活期间组件尚不能响应事件，因此不要放在立即需要操作的表单、导航或关键按钮上。

## 升级后检查什么

- 在 SSR 和纯客户端页面分别验证 `useId` 生成的关联是否稳定。
- 用 TypeScript 检查 `useTemplateRef` 的元素类型，而不是靠断言掩盖空值。
- 对暂停的 Watcher 明确恢复时机，避免在隐藏页面中一直保留订阅。
- 测量延迟激活是否真正减少了首屏工作量，并确认用户滚动后组件能正常交互。

参考：[Vue 3.5 发布说明](https://blog.vuejs.org/posts/vue-3-5) 与 [Vue Watch API](https://vuejs.org/api/reactivity-core.html#watch)。
