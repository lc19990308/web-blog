---
title: "学习vue3 计算属性"
date: 2023年08月08日-17点19分
categories: "vue3"
description: "学习vue3，computed，并且computed 设置为可读写"
tags: "Vue3"
copyright: ture
---

##### vue3 当中的计算属性

例子 1.我们有一些价格，条件等着计算。

```

<template>
  <div>价格:{{ price }}</div>
  <div>总价格：{{ totalPirce }}</div>
  <div>优惠价格:{{ discountPrice }}</div>
  <input type="number" min="1" step="5" v-model="num" name="" id="" />
</template>
<script setup>
import { reactive, ref, nextTick, computed } from "vue";
const price = ref(10);
const num = ref(1);
const discount = ref(0.8);
const totalPirce = computed(() => {
  return num.value * price.value;
});
const discountPrice = computed(() => {
  return num.value * price.value * discount.value;
});
</script>
<style scoped></style>



```

**计算属性**，返回值为计算属性 ref，和普通的 ref 一样。在模板里面，会自动解包，我们也可以.value,给他手动解包。

##### 使用计算属性 vs 方法。

计算属性会基于响应式依赖被缓存，只有响应式依赖发生了改变，计算属性才会重新计算。这也就意味着，只要响应式依赖的值不变，无论多少次访问，都会返回之前的结果。不会重复执行 getter 函数。

方法每次都会执行一次 getter 函数。

```

<template>
  <div>价格:{{ price }}</div>
  <div v-for="(item, index) in 10" :key="index">总价格：{{ totalPirce }}</div>
  <div v-for="(item, index) in 10" :key="index">{{ getTotalPirce() }}</div>
  <input type="number" min="1" step="1" v-model="num" name="" id="" />
</template>
<script setup>
import { reactive, ref, nextTick, computed } from "vue";
const price = ref(10);
const num = ref(1);
const totalPirce = computed(() => {
  console.log("计算属性执行了");
  return num.value * price.value;
});
function getTotalPirce() {
  console.log("getTotalPirce性执行了");
  return num.value * price.value;
}
</script>
<style scoped></style>



```

##### 可写计算属性

computed 计算属性默认的只读的，只有在特殊情况下，我们才会用到**可写属性**，我们可以通过提供 getter，和 setter 来创建。

```

<template>
  <div>价格:{{ price }}</div>
  <div>总价格：{{ totalPirce }}</div>
  <div>单个优惠价格：{{ discountsPrice }}</div>
  <input type="number" min="1" step="1" v-model="num" name="" id="" />
  <button @click="setDiscounts">设置折扣</button>
</template>
<script setup>
import { reactive, ref, nextTick, computed } from "vue";
const price = ref(10);
const num = ref(1);
const discounts = ref(0.8);
const totalPirce = computed(() => {
  console.log("计算属性执行了");
  return num.value * price.value; //只去执行一次discounts
});
const discountsPrice = computed({
  get() {
    return price.value * discounts.value;
  },
  set(newValue) {
    console.log(newValue);
    discounts.value = newValue;
  },
});
function setDiscounts() {
  discounts.value = 0.4;
}
</script>
<style scoped></style>

```

[百度脑图](https://naotu.baidu.com/file/024e1df1914ca675571460b922442a99)
