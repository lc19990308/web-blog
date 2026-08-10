---
title: "Vue 3 组合式 API 完全指南：模板、组件、插槽与 v-model"
date: 2024-03-22 17:39:00
updated: 2025-06-22
categories: "Vue3"
description: "从模板语法到组件通讯，从 v-model 到插槽，系统掌握 Vue 3 组合式 API 的核心实战技巧"
tags: "Vue3"
copyright: true
---

## 前言

Vue 3 的 Composition API（组合式 API）让组件逻辑组织更灵活。本文根据实际开发经验，系统梳理 Vue 3 中最核心、最常用的知识点，涵盖模板语法、计算属性、class/style 绑定、组件通讯、v-model、插槽以及 Attributres 继承。

---

## 一、模板语法进阶

### 1.1 v-bind 动态绑定

`v-bind`（简写 `:`）可以动态绑定属性，甚至**一次绑定多个属性**：

```vue
<script setup>
import { ref } from "vue";
const attrs = ref({
  class: "box",
  id: "demo",
  style: "color:red",
  href: "https://www.baidu.com",
});
</script>

<template>
  <!-- 一次性绑定所有属性 -->
  <a :="attrs">demo</a>
  <!-- 渲染结果：<a class="box" id="demo" href="..." style="color:red">demo</a> -->
</template>
```

**组件上使用**：绑定的属性会同时作为 props 和 Attributes 传递。

### 1.2 动态参数

`v-bind` 和 `v-on` 的参数可以是动态的：

```vue
<script setup>
import { ref } from "vue";
const arg = ref("src"); // 可动态切换绑定哪个属性
const url = ref("www.baidu.com");

function run() { console.log("run!"); }

function setClick() {
  url.value = run;
  arg.value = "click";
}
</script>

<template>
  <a :[arg]="url">动态绑定</a>
  <button @click="setClick">切换为 click 事件</button>
</template>
```

### 1.3 修饰符

Vue 提供了丰富的修饰符：

```vue
<template>
  <!-- .once：事件只触发一次 -->
  <button @click.once="submit">只执行一次</button>

  <!-- .prevent：阻止默认行为 -->
  <form @submit.prevent="onSubmit">...</form>

  <!-- .stop：阻止冒泡 -->
  <div @click.stop="handleClick">...</div>

  <!-- .capture：捕获模式 -->
  <div @click.capture="handleCapture">...</div>

  <!-- .self：只有 event.target 是自身才触发 -->
  <div @click.self="handleSelf">...</div>
</template>
```

---

## 二、响应式核心：ref 与 computed

### 2.1 ref 基础

```vue
<script setup>
import { ref } from "vue";

const count = ref(0);        // 基本类型
const obj = ref({ a: 1 });   // 对象类型（自动深层响应）

function increment() {
  count.value++;   // 注意：script 中需要通过 .value 访问
}
</script>

<template>
  <p>{{ count }}</p>  <!-- 模板中自动解包，不需要 .value -->
  <button @click="increment">+1</button>
</template>
```

### 2.2 计算属性 computed

```vue
<script setup>
import { ref, computed } from "vue";

const price = ref(10);
const quantity = ref(2);

// 只读计算属性
const total = computed(() => price.value * quantity.value);

// 可读写计算属性（带 getter/setter）
const firstName = ref("John");
const lastName = ref("Doe");

const fullName = computed({
  get() {
    return `${firstName.value} ${lastName.value}`;
  },
  set(val) {
    [firstName.value, lastName.value] = val.split(" ");
  },
});

// 修改计算属性会触发 setter
fullName.value = "Jane Smith";
</script>

<template>
  <p>总价：¥{{ total }}</p>
  <p>全名：{{ fullName }}</p>
</template>
```

**计算属性 vs 方法：**

| 特性 | computed | 方法 |
|------|----------|------|
| 缓存 | ✅ 依赖不变就不重新计算 | ❌ 每次渲染都执行 |
| 适用场景 | 派生状态、复杂计算 | 事件处理、有副作用的操作 |
| 性能 | 高（避免重复计算） | 低（每次重新渲染都执行） |

**注意事项：**
1. getter 中不要做异步请求、操作 DOM
2. 避免在 getter 中修改计算属性依赖的数据（死循环）

---

## 三、Class 与 Style 绑定

### 3.1 绑定 Class

```vue
<script setup>
import { ref, computed } from "vue";

const isActive = ref(true);
const hasError = ref(false);

// 对象语法
const classObj = computed(() => ({
  active: isActive.value,
  'text-danger': hasError.value,
}));

// 数组语法
const classArr = ref(['box', 'active']);
</script>

<template>
  <!-- 对象绑定 -->
  <div :class="{ active: isActive }">对象绑定</div>

  <!-- 计算属性绑定 -->
  <div :class="classObj">计算属性绑定</div>

  <!-- 数组绑定 -->
  <div :class="classArr">数组绑定</div>

  <!-- 组件上使用 class（自动合并到根元素） -->
  <MyComponent class="my-class" />
</template>
```

### 3.2 绑定 Style

```vue
<script setup>
import { ref } from "vue";

const styleObj = ref({
  width: "100px",
  height: "100px",
  backgroundColor: "red",  // 推荐 camelCase
});

const styleArr = ref([
  { width: "100px" },
  { border: "1px solid blue" },
]);
</script>

<template>
  <!-- 对象语法 -->
  <div :style="styleObj"></div>

  <!-- 数组语法（合并多个样式对象） -->
  <div :style="styleArr"></div>
</template>
```

---

## 四、模板引用（ref）

### 4.1 访问 DOM 元素

```vue
<script setup>
import { ref, onMounted } from "vue";

const inputRef = ref(null);

onMounted(() => {
  inputRef.value.focus(); // 自动聚焦
});
</script>

<template>
  <input ref="inputRef" type="text" placeholder="自动聚焦" />
</template>
```

### 4.2 父组件访问子组件

> 使用 `<script setup>` 的组件**默认是私有的**，父组件无法直接访问内部方法和属性。需要通过 `defineExpose` 显式暴露。

**父组件：**
```vue
<script setup>
import { ref, onMounted } from "vue";
import Child from "./Child.vue";

const childRef = ref(null);

onMounted(() => {
  childRef.value.childMethod(); // 调用子组件暴露的方法
});
</script>

<template>
  <Child ref="childRef" />
</template>
```

**子组件（Child.vue）：**
```vue
<script setup>
import { ref } from "vue";

const count = ref(0);

function childMethod() {
  console.log("Child method called");
}

// 显式暴露给父组件
defineExpose({ childMethod, count });
</script>
```

---

## 五、组件通讯：Props 与 Events

### 5.1 Props 定义

```vue
<script setup>
// 运行时声明（支持类型校验）
defineProps({
  title: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
  items: {
    type: Array,
    default: () => [],  // 对象/数组必须用工厂函数
  },
  // 多种类型
  width: [String, Number],
});
</script>
```

### 5.2 一次性传递多个 Props

```vue
<script setup>
import { ref } from "vue";

const post = ref({
  title: "Vue 3 指南",
  content: "这是一篇好文章",
  author: "LC",
});
</script>

<template>
  <!-- v-bind 不带参数：将对象所有属性作为 props 传递 -->
  <BlogPost v-bind="post" />
  <!-- 等价于 -->
  <BlogPost :title="post.title" :content="post.content" :author="post.author" />
</template>
```

### 5.3 Props 单向数据流

> **Props 是单向数据流**：子组件不能直接修改 props。

```vue
<script setup>
import { ref, computed } from "vue";

const props = defineProps({ initialCount: Number });

// ✅ 方案一：用 ref 复制一份
const localCount = ref(props.initialCount);

// ✅ 方案二：用计算属性派生
const doubleCount = computed(() => props.initialCount * 2);
</script>
```

### 5.4 组件事件与校验

```vue
<script setup>
const emit = defineEmits({
  // 带校验的事件：返回 true 表示通过
  submit: ({ email, password }) => {
    if (email && password) return true;
    console.warn("Invalid submit payload!");
    return false;
  },
  // 无校验的事件
  close: null,
});

function handleSubmit(email, password) {
  emit("submit", { email, password });
}
</script>

<template>
  <button @click="handleSubmit('test@test.com', '123456')">提交</button>
</template>
```

---

## 六、v-model 双向绑定

### 6.1 defineModel 基础用法

Vue 3.4+ 推荐使用 `defineModel` 宏，它大大简化了自定义组件的双向绑定：

```vue
<!-- Child.vue -->
<script setup>
const model = defineModel({ required: true });
</script>

<template>
  <input type="text" v-model="model" placeholder="请输入" />
  <p>实时输入：{{ model }}</p>
</template>
```

```vue
<!-- Parent.vue -->
<script setup>
import { ref } from "vue";
import Child from "./Child.vue";

const msg = ref("");
</script>

<template>
  <p>父组件接收：{{ msg }}</p>
  <Child v-model="msg" />
</template>
```

### 6.2 多个 v-model

```vue
<!-- Child.vue -->
<script setup>
const name = defineModel("name", { required: true });
const password = defineModel("password", { required: true });
</script>

<template>
  <input v-model="name" placeholder="姓名" />
  <input v-model="password" type="password" placeholder="密码" />
</template>
```

```vue
<!-- Parent.vue -->
<Child v-model:name="name" v-model:password="password" />
```

### 6.3 v-model 修饰符

自定义修饰符通过 `defineModel` 的返回值获取：

```vue
<script setup>
const [model, modifiers] = defineModel("text", {
  set(value) {
    // 如果使用了 .capitalize 修饰符，首字母大写
    if (modifiers?.capitalize) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value;
  },
});
</script>
```

```vue
<!-- 使用 .capitalize 修饰符 -->
<Child v-model:text.capitalize="text" />
```

---

## 七、Slot 插槽

### 7.1 默认插槽与后备内容

```vue
<!-- Button.vue -->
<template>
  <button class="btn">
    <slot>Submit</slot>  <!-- 父组件未提供内容时显示 "Submit" -->
  </button>
</template>
```

```vue
<Button />                <!-- 渲染：<button>Submit</button> -->
<Button>保存</Button>     <!-- 渲染：<button>保存</button> -->
```

### 7.2 具名插槽

```vue
<!-- Layout.vue -->
<template>
  <header><slot name="header" /></header>
  <main><slot /></main>          <!-- 默认插槽 -->
  <footer><slot name="footer" /></footer>
</template>
```

```vue
<Layout>
  <template #header>顶部导航</template>
  <template #default>主要内容</template>
  <template #footer>底部信息</template>
</Layout>
```

### 7.3 作用域插槽（Scoped Slot）

插槽可以访问子组件的数据：

```vue
<!-- List.vue -->
<script setup>
defineProps({
  items: { type: Array, default: () => [] },
});
</script>

<template>
  <ul>
    <li v-for="item in items" :key="item.id">
      <slot name="item" v-bind="item" />
    </li>
  </ul>
</template>
```

```vue
<!-- Parent.vue -->
<List :items="productList">
  <template #item="{ id, name, price }">
    <div>
      <span>ID: {{ id }}</span>
      <span>名称: {{ name }}</span>
      <span>价格: ¥{{ price }}</span>
    </div>
  </template>
</List>
```

### 7.4 动态插槽名

```vue
<script setup>
const slotName = ref("header");
</script>

<template>
  <Layout>
    <template #[slotName]>动态插槽内容</template>
  </Layout>
</template>
```

---

## 八、Attributes 继承

### 8.1 默认行为

当组件外部传入了未声明为 props 的属性/事件，它们会自动"透传"到组件的**根元素**上：

```vue
<!-- 父组件 -->
<MyComponent class="box" @click="handleClick" />

<!-- 子组件 (根元素是 div) -->
<template>
  <div class="child">
    <!-- 实际渲染：<div class="child box" @click="..."> -->
  </div>
</template>
```

**class 合并**：外部传入的 `box` 会和子组件根元素的 `child` 合并。
**事件合并**：父组件和子组件根元素的同名事件会**一起触发**。

### 8.2 禁用 Attribute 继承

```vue
<script setup>
defineOptions({ inheritAttrs: false });
</script>

<template>
  <div class="wrapper">
    <!-- 手动绑定到指定元素 -->
    <input v-bind="$attrs" placeholder="属性透传到这里" />
  </div>
</template>
```

### 8.3 多根节点

当组件有多个根节点时，不会自动继承 Attributes，必须显式绑定 `v-bind="$attrs"`，否则会抛出运行时警告：

```vue
<template>
  <header>头部</header>
  <main v-bind="$attrs">内容区</main>  <!-- 必须显式绑定 -->
  <footer>底部</footer>
</template>
```

### 8.4 JavaScript 中访问 $attrs

```vue
<script setup>
import { useAttrs } from "vue";

const attrs = useAttrs();
console.log(attrs.class);   // 注意：大小写保持原始格式
console.log(attrs.onClick); // 事件以 onXxx 形式访问
</script>
```

---

## 九、常用模式与最佳实践

### 9.1 defineOptions 配置组件选项

```vue
<script setup>
defineOptions({
  name: "MyComponent",          // 组件名称（调试时有用）
  inheritAttrs: false,          // 禁用属性继承
});
</script>
```

### 9.2 组件设计原则

| 原则 | 说明 | 示例 |
|------|------|------|
| **单一职责** | 一个组件只做一件事 | 按钮组件只负责渲染按钮 |
| **Props 尽量少** | Props 太多说明职责过重 | 用对象传递关联数据 |
| **细粒度插槽** | 用具名插槽增加灵活性 | 头部/内容/底部区分 |
| **单向数据流** | 子组件不直接改 props | 用 emit 通知父组件 |
| **v-model 统一** | 能用 v-model 就不拆 props+emit | 用 defineModel 简化 |

---

## 总结

| 知识点 | 核心要点 |
|--------|---------|
| **模板语法** | v-bind 动态参数、修饰符 |
| **响应式** | ref、computed（缓存 vs 方法） |
| **Class/Style** | 对象/数组/计算属性绑定 |
| **模板引用** | ref 获取 DOM、defineExpose |
| **Props/Events** | 单向数据流、事件校验 |
| **v-model** | defineModel、多个 v-model、修饰符 |
| **Slots** | 默认/具名/作用域插槽 |
| **Attributes** | 透传、禁用、$attrs、useAttrs |

**推荐阅读：**
- [Vue 3 官方文档](https://vuejs.org/guide/introduction.html)
- [Vue 3 组合式 API 常见问题](https://vuejs.org/guide/extras/composition-api-faq)
