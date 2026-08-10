---
title: "从零开始学习vue3-2"
date: 2024 年 3 月 22 日-17 点 39 分
categories: "vue3学习笔记"
description: "学习了vue3，props，组件事件，v-model"
tags: "Vue3"
copyright: ture
---

#### props 的绑定

**v-bing 的不指定名字，会把 object 对象当中符合 object 的参数，给作为 props，传递过去。
**

```
<template>
  <HelloWorld @enlarge-text="enlarge" :="object" />
</template>
<script setup>
import { ref, onMounted } from "vue";
const object = ref({
  title: "泰酷辣",
  h3: "泰酷辣",
  msg: "泰酷辣",
  class: "box",
  id: "box1",
});
```

\*_props 是单项数据流，在子组件不要去修改，我们可以根据 props 传递的初始化值，把它给添加到响应式变量里面，去使用。这样不会影响到 props。或者，对 props 使用计算属性。_

```

<script setup>
import { ref } from "vue";
const props = defineProps({
  msg: {
    type: String,
    default: "hello",
  },
  title: String,
  h3: String,
});
const msg1 = ref(props.msg);
setTimeout(() => {
  msg1.value = "qwertyuiop";
}, 4000);
</script>

<template>
  <div>
    <h1>{{ msg }}</h1>
    <h2>{{ title }}</h2>
    <h3>{{ h3 }}</h3>
    <h4>{{ msg1 }}</h4>
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>

```

#### 组件事件

##### 事件校验

如果注册的事件，符合条件就去触发，不符合条件就不触发。。

```
<script setup>
import { ref } from "vue";
const emit = defineEmits({
  submit: ({ email, password }) => {
    if (email && password) {
      return true;
    } else {
      console.warn("Invalid submit event payload!");
      return false;
    }
  },
});
const props = defineProps({
  msg: {
    type: String,
    default: "hello",
  },
  title: String,
  h3: String,
});
const msg1 = ref(props.msg);
setTimeout(() => {
  msg1.value = "qwertyuiop";
}, 4000);
function submitForm(email, password) {
  emit("submit", { email, password });
}
</script>

```

#### v-model

##### v-model 双向绑定使用

vue3 当中的双向绑定
组合式 api 推荐双向绑定使用 defineModel 宏。

但是在子组件使用了，**defineModel 宏 is not found**
需要在 vite.config 文件里面，把 defineModel 设置为 true

```
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      script: {
        defineModel: true,
      },
    }),
  ],
});


```

因为在 vue3 当中 defineModel 宏 默认是关闭的。

##### vue3v-model 上的参数

child.vue

```

<script setup>
const model = defineModel("value", { required: true });
</script>

<template>
  <input type="text" v-model="model" placeholder="请输入" />
  <p>子组件输入:{{ model }}</p>
</template>
```

parent.vue

```
<script setup>
import Child from "../../components/Child.vue";
import { ref } from "vue";
const msg = ref("");
</script>

<template>
  <h1>{{ msg }}</h1>
  <Child v-model:value="msg" />
</template>
```

defineModel 第一个参数，指定 v-model 的参数，required: true，v-model，必须要在父组件里面指定属性。

defineModel 不要给他默认指定参数，否则父组件默认值和子组件 defineModel 参数不同，会导致不同。

##### 多个 v-model 绑定

**parent.vue**

```
<script setup>
import Child from "../../components/Child.vue";
import { ref } from "vue";
const name = ref("");
const password = ref("");
</script>

<template>
  <p>父name：{{ name }}</p>
  <p>父password：{{ password }}</p>
  <Child v-model:name="name" v-model:password="password" />
</template>

```

**child.vue**

```
<script setup>
const name = defineModel("name", { required: true, default: "hi" });
const password = defineModel("password", { required: true, default: "hi" });
</script>

<template>
  <div>
    <input type="text" v-model="name" placeholder="请输入" />
    <p>子组件name输入:{{ name }}</p>
  </div>
  <div>
    <input type="text" v-model="password" placeholder="请输入" />
    <p>子组件password输入:{{ password }}</p>
  </div>
</template>

```

##### 处理 v-model 修饰符

其实 v-model 的修饰符，会把符合转换的数据，转换成修饰符要求的数据。

**自定义修饰符**
vue3.4 版本的使用

**child.vue**

```
<script setup>
const name = defineModel("name");
const password = defineModel("password", { required: true });
const [model, modifiers] = defineModel("model", {
  set(value) {
    if (modifiers.capitalize) {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value;
  },
});
</script>

<template>
  <div>
    <input type="text" v-model="name" placeholder="请输入" />
    <p>子组件name输入:{{ name }}</p>
  </div>
  <div>
    <input type="text" v-model="password" placeholder="请输入" />
    <p>子组件password输入:{{ password }}</p>
  </div>
  <div>
    <input type="text" v-model="model" placeholder="请输入" />
    <p>子组件model输入:{{ model }}</p>
  </div>
</template>


```

**parent.vue**

```

<script setup>
import Child from "../../components/Child.vue";
import { ref } from "vue";
const name = ref("");
const password = ref("");
const model = ref("");
</script>

<template>
  <p>父name：{{ name }}</p>
  <p>父password：{{ password }}</p>
  <Child
    v-model:name="name"
    v-model:password="password"
    v-model:model.capitalize="model"
  />
</template>

```
