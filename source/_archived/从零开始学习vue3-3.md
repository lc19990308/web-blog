---
title: "从零开始学习vue3-3"
date: 2024 年 3 月 22 日-17 点 39 分
categories: "vue3学习笔记"
description: "学习了vue3，Attributes继承"
tags: "Vue3"
copyright: ture
---

#### Attributes 继承

##### 组件根元素继承

Attributes 继承指的是，当我们的一个**组件**，以根元素为渲染的时候，穿透的 Attributes 会自动被添加到根元素上。。

组件外部

```
  <Child
    class="box"
    ss
    v-model:name="name"
    v-model:password="password"
    v-model:model.capitalize="model"
  />
```

组件内部代码

```
  <div class='child'>
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
  </div>
```

组件的 class box 和组件内部的 class，child，与 ss，都被添加到了根元素上头。

##### v-on 监听器继承

如果在组件上通过 v-on 绑定一个事件，在组件内部，根元素也绑定一个相同的事件，2 个事件都会被触发。

组件外部

```
<script setup>
import Child from "../../components/Child.vue";
function click() {
  console.log("父亲");
}
</script>

<template>
  <Child
    @click="click"
  />
</template>
```

组件内部

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
function click() {
  console.log("xxx");
}
</script>

<template>
  <div class="child" @click="click">
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
  </div>
</template>
```

绑定的 2 个 click 方法都会被触发。

##### 禁用 Attributes 继承

首先在组件内部，使用 defineOptions，把 inheritAttrs 设置为 false

```
defineOptions({
  inheritAttrs: false
})
```

**Attributes 禁用继承的使用场景**通过就是我们希望控制 Attributes 继承到非根元素的元素上。这个时候，穿透进来的，attribute，我们可以在模版里通过表达式中用 **$attrs**访问

透传 attributes 在 js 当中，保留了原始大小写，所以像 box-1，我们需要通过$attrs['box-1']访问。

```
  <div class="child">
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
    <!-- v-bind="$attrs" -->
    <span :class="$attrs['class']" @click="$attrs['onClick']"
      >Fallthrough attribute:</span
    >
  </div>

```

##### 多根节点的 Attributes 继承

当组件存在多个根节点的情况下，我们没有给穿透的 Attributes 指定继承到那个节点，将会抛出一个运行时警告。

child.vue

```
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

这样会抛出一个运行警告

##### 在 JavaScript 中访问透传 Attributes

<script setup> 中使用 useAttrs() API 来访问一个组件的所有透传 attribute：
```
import { useAttrs } from 'vue'
const attrs = useAttrs()


```


总结：
**Attributes默认，组件外部的属性事件和组件内部的属性合并，继承到一起。**

**组件外部定义的事件和组件内部根元素定义的相同时间，会一起触发**

**通过defineOptions，inheritAttrs: false可以禁止组件外部的属性，继承到组件内部合并到一起**

**通过$attrs访问 可以在其他元素上使用，继承到属性，和props不同，大小写，不会转换，事件要访问$attrs.onclick**

**存在多个根节点的情况下的时候，如果$attrs 没有绑定到任何一个元素上，defineOptions，inheritAttrs: false会报一个运行警告**


**通过useAttrs，const attrs = useAttrs()，可以在js当中访问到Attributes的所有属性**
