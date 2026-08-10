---
title: "从零开始学习vue3-4"
date: 2024 年 3 月 26 日-17 点 13 分
categories: "vue3学习笔记"
description: "学习了vue3，slot插槽，默认内容，具名插槽，作用域具名插槽"
tags: "Vue3"
copyright: ture
---

#### 插槽

##### 组件使用插槽

组件外部

```
  <div class="">
    <Child>
      <div>123456789</div>
      <p>先帝创业未半</p>
    </Child>
  </div>

```

组件内部

```
<script setup></script>

<template>
  <div>
    插槽演示：
    <slot></slot>
  </div>
</template>

```

##### 渲染作用域

因为插槽模版里面的内容本身就在父组件模版定义的,所以插槽可以访问到父组件数据作用域

父组件

```
<script setup>
import Child from "../../components/Child.vue";
import { ref } from "vue";
const msg = ref("先帝创业未半");
</script>

<template>
  <div class="">
    <Child>
      <div>123456789</div>
      <p>{{ msg }}</p>
    </Child>
  </div>
</template>

```

子组件

```
<template>
  <div class="">
    <Child>
      <div>123456789</div>
      <p>{{ msg }}</p>
    </Child>
  </div>
</template>


```

##### 插槽的默认内容

当父组件没有提供插槽内容当时候，在子组件的内部，slot 标签之间，写入内容，就会成为插槽的默认内容。

子组件

```
<script setup></script>

<template>
  <button class="button">
    <slot>Submit</slot>
  </button>
</template>

<style>
.button {
  width: 100px;
  margin: 0 20px;
  text-align: center;
  height: 40px;
  color: #fff;
  line-height: 40px;
  background-color: blue;
}
</style>

```

父组件

```
<script setup>
import Child from "../../components/Child.vue";
import { ref } from "vue";
const msg = ref("先帝创业未半");
</script>

<template>
  <div class="">
    <Child> </Child>
  </div>
</template>

```

默认会把 Submit 渲染出来。

当我们在 <Child> </Child>标签之间加入内容 Submit 就会被替换。

##### 具名插槽

当一个组件里面有多个 slot 的时候，我们就需要给插槽起不同的名字。

使用 template v-slot:xxxx 指定插槽名字，或者#表示

```
    <Child>
      <template v-slot:header> <div>header</div> </template>
      <template #main><div>main</div></template>
      <template v-slot:footer><div>footer</div></template>
    </Child>

```

动态插槽名

```
<script setup>
import Child from "../../components/Child.vue";
import { ref } from "vue";
const slot1 = ref("header");
const slot2 = ref("main");
</script>

<template>
  <div class="">
    <Child>
      <template v-slot:[slot1]> <div>header</div> </template>
      <template #[slot2]><div>main</div></template>
      <template v-slot:footer><div>footer</div></template>
    </Child>
  </div>
</template>


```

##### 具名作用域插槽的使用

写法

```
#slot='slotporps'
:v-slot:slot='slotPorps'
```

子组件

```
    <Child :title="title" :msg="msg">
      <template v-slot:header="slotProps">
        <div>{{ slotProps.title }}</div>
      </template>
      <template #main="slotProps">
        <div>{{ slotProps.msg }}</div>
      </template>
    </Child>

```

父组件

```
<script setup>
import Child from "../../components/Child.vue";
import { ref } from "vue";
const title = ref("1122");
const msg = ref("hello,word");
</script>

<template>
  <div class="">
    <Child :title="title" :msg="msg">
      <template v-slot:header="slotProps">
        <div>{{ slotProps.title }}</div>
      </template>
      <template #main="slotProps">
        <div>{{ slotProps.msg }}</div>
      </template>
    </Child>
  </div>
</template>


```

##### 使用具名插槽渲染高级列表组件示例

子组件

```
<script setup>
import { ref } from "vue";
defineProps({
  tableList: {
    type: Array,
    default: () => {
      return [];
    },
  },
});
</script>

<template>
  <div class="list-item">
    <slot
      v-for="(item, index) in tableList"
      name="item"
      :="item"
      :key="index"
    ></slot>
  </div>
</template>

```

父组件

```
<script setup>
import Child from "../../components/Child.vue";
import { ref } from "vue";
const tableList = ref([
  { id: 1, name: "Apple", price: 10.5 },
  { id: 2, name: "Banana", price: 8.25 },
  { id: 3, name: "Orange", price: 9.75 },
  { id: 4, name: "Mango", price: 12.0 },
  { id: 5, name: "Grape", price: 7.5 },
  { id: 6, name: "Lemon", price: 6.25 },
  { id: 7, name: "Strawberry", price: 11.0 },
  { id: 8, name: " Kiwi", price: 9.5 },
  { id: 9, name: "Pineapple", price: 13.5 },
  { id: 10, name: "Melon", price: 15.0 },
]);
</script>

<template>
  <div class="">
    <ul>
      <li>
        <Child :tableList="tableList">
          <template #item="itemProps">
            <div>
              <div>id：{{ itemProps.id }}</div>
              <div>名字{{ itemProps.name }}</div>
              <div>价格：{{ itemProps.price }}</div>
            </div>
          </template>
        </Child>
      </li>
    </ul>
  </div>
</template>
```

总结：

**组件内，slot 标签可以定义插槽**
**插槽拥有默认内容，组件插槽没有被使用的情况下，会展示默认的内容，如果组件外部定义的插槽被使用的情况下，默认展示的内容会隐藏。**
**具名插槽定义方式 可以通过# 或者 v-slot:slotName 来使用，组件内部，使用 slot 标签，name 属性定义 slot 名字，具名插槽需要使用 template 标签**
**动态插槽，根据变量的名字。动态切换插槽的**
**作用域具名插槽，使用 v-slot：slotName='slotNamePorps,或者简写#slotName='slotNamePorps'使用，组件内部，slot 标签上接受定义 props 参数**![9c65ca00d56fdc759dcc9d7c69e02405.png](evernotecid://380A18B5-B2B6-49D8-B378-B52EEE14CC18/appyinxiangcom/39592154/ENResource/p84)
