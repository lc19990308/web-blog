---
title: "学习vue3 响应式基础"
date: 2023年08月08日-17点19分
categories: "vue3"
description: "学习vue3，响应式基础，ref和reactive，如何声明一个响应式变量，ref和reactive的区别"
tags: "Vue3"
copyright: ture
---

#### vue 响应式基础

##### 我们可以使用 reactive，创建出一个响应式的对象。

这里的响应指的是，如同 vue2 一样，我们在 data 函数里面创建的数据，都能被实时的更新到，模板里面。

例子如下，

```

<template>
  <div>
    <input type="text" v-model="state.count" />
    <button id="Dim" class="num" @click="increment">{{ state.count }}++</button>
  </div>
</template>
<script setup>
import { reactive, ref, nextTick } from "vue";
const state = reactive({ count: 0 });
function increment() {
  state.count++;
}
</script>


```

##### 响应数据具备深层响应性，响应式的引用类型数据的任何变动，vue 响应式都能检测得到。

```

import { reactive, ref, nextTick } from "vue";
const state = reactive({ count: 0, list: [{ data: [{ name: "li" }] }] });
const object = ref({
  name: {
    list: [
      {
        key: "name",
      },
    ],
  },
});
object.value.name.list[0].key = "王五";
state.list[0].data[0].name = "赵四";
console.log(object.value.name.list[0].key, state.list[0].data[0].name); //王五，赵四


```

##### 响应式对象与原始对象，并不相等，虽然数据结构一样

```

import { reactive, ref, nextTick } from "vue";
const state = reactive({ count: 0, list: [{ data: [{ name: "li" }] }] });
let object = { count: 0, list: [{ data: [{ name: "li" }] }] };
//响应式对象与原始对象并不相等
console.log(state === object, state == object);



```

**reactive API 有两条局限性**

1. 只对集合类型，像 array，set，map，object 有效，不支持 string，number 这样的。

2. vue 响应系统是根据，属性访问进行追踪的，，这意味着我们必须保持对响应式对象的相同引用，这意味着我们不可以随意替换一个响应式对象。这将导致响应性连接的丢失。

对响应式对象追踪断开的例子如下，

```

let state = reactive({ count: 101 }); //这个响应对象已经被断开
state = reactive({ count: 102 });
console.log(state.count);

```

如果我们将响应式对象，赋值或者解构给，变量的话，那么我们会失去响应性

```

import { reactive, ref, nextTick } from "vue";
let state = reactive({ count: 101 }); //这个响应对象已经被断开
let count = state.count;
state.count = 102;
console.log(count, state.count);



```

##### 使用 ref 来定义响应式变量

```
const count = ref(0);
```

**ref()会把参数，包装成为一个带.value 的对象**

```
const count = ref(0);
console.log(count.value);//0
```

**ref()在模板当中会存在解包**

```
<template>
  <div>
    <input type="number" v-model="count" />
    <!--模板里面使用count不需要带上value-->
    <button id="Dim" class="num">{{ count }}++</button>
  </div>
</template>
<script setup>
import { reactive, ref, nextTick } from "vue";
const count = ref(0);
console.log(count.value);
</script>
```

**ref 作为渲染模板上下文的顶层属性的情况下，才会自动解包**
此处顶层属性是，object，所以，object.foo,才是 ref 响应变量。所以无法进行解包

```

<template>
  <div>
    <div>{{ object.foo + 1 }}</div>
  </div>
</template>
<script setup>
import { reactive, ref, nextTick } from "vue";
//ref 作为模板渲染上下文的顶层属性的话，才会自动解包。
const object = {
  foo: ref(1),
};
object.foo.value++; //[object Object]1
</script>
<style scoped></style>


```

**我们把 object.foo 作为渲染模板上下文的顶层就可以自动解包了**

```
<template>
  <div>
    <div>{{ object.foo }}</div>
  </div>
</template>
<script setup>
import { reactive, ref, nextTick } from "vue";
//ref 作为模板渲染上下文的顶层属性的话，才会自动解包。
const object = {
  foo: ref(1),
};
</script>
<style scoped></style>
```

```
<template>
  <div>
    <div>{{ foo + 1 }}</div>
  </div>
</template>
<script setup>
import { reactive, ref, nextTick } from "vue";
//ref 作为模板渲染上下文的顶层属性的话，才会自动解包。
const object = {
  foo: ref(1),
};
object.foo.value++;
const { foo } = object; //3
</script>
<style scoped></style>
```

当 ref 响应变量，作为响应对象内部的值，那么会在响应对象内部进行自己解包。

```

<template>
  <div>
    <div>{{ state.count + 11 }}</div>
  </div>
</template>
<script setup>
import { reactive, ref, nextTick } from "vue";
const count = ref(0);
const state = reactive({
  count,
});
state.count = 10;
state.count = count;
console.log(state.count);
</script>
<style scoped></style>


```

**如果把 ref 属性替换掉已经关联响应式对象的 ref 属性，那么就会把旧的换掉。**

```

<template>
  <div>
    <div>{{ state.count + 11 }}</div>
  </div>
</template>
<script setup>
import { reactive, ref, nextTick } from "vue";
const count = ref(0);
const state = reactive({
  count,
});
// const count1 = ref(1);
state.count = 10;
state.count = count1;
console.log(state.count);//12
</script>
<style scoped></style>



```

**ref 作 reactive，或者其他集合的一部分的时候，无法自动解包**

```

<template>
  <div>
    <div>{{ array[2].value + 1 }}</div>
  </div>
</template>
<script setup>
import { reactive, ref, nextTick } from "vue";
let array = reactive([1, 1, ref(1)]);
let num = ref(0);
console.log(array[2].value);
</script>
<style scoped></style>



```

[脑图](https://naotu.baidu.com/file/0dd37b5d9b398c8b8353960406e49141)
