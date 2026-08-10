---
title: "vue数组对象赋值问题"
date: 2021年6月25日20点56分
categories: "vue"
description: "使用this.$set更新数据"
tags: "Vue"
copyright : ture
---



##### 数组的更新监测

vue是一个响应式的框架。data里面的数据的改动，会随时随地的传到view视图里面。


但是，对于data里面的object类型的数据，并不是这样的。

数组的更新监测，只有一下这些方法才能触发视图的更新。



触发视图更新的方法 |
---|
push() | 
pop() | 
shift() |
unshift() |
splice() |
sort() |
reverse() |


##### 遇到的问题。


1，我想对一个数组的1号位进行赋值。而且我不想使用数组方法。splie(),什么什么的。但是视图不会更新。


例子如下


```
<template>
  <div>
    <div v-for="(item,index) in arr" :key='index'>{{item}}</div>
    //页面渲染出来的是 1 3 3 4
    <button @click="test">11</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      arr:[1,2,3,4],
    };
  },
  methods: {
    test() {
      this.arr[0] = 11;
      console.log(this.arr);
    },
  },
  created(){
    this.arr[1] = 3;
  },
  mounted() {
    this.arr[2] = 12;
    // console.log(this.arr); [1,3,12,4]
  },
};
</script>


```

为什么会这样，因为 data里面检测不到 对数组的改动。created的赋值，为什么被视图监测到了？


尤大大的文档： 

> 当你把一个普通的 JavaScript 对象传入 ==Vue 实例==作为 data 选项，Vue 将==遍历==此对象所有的 property，并使用 Object.defineProperty 把这些 property 全部转为 ==getter/setter==。Object.defineProperty 是 ES5 中一个无法 shim 的特性，这也就是 Vue 不支持 IE8 以及更低版本浏览器的原因。
> 

> 这些 getter/setter 对用户来说是不可见的，但是在内部它们让 Vue 能够追踪依赖，在 property 被访问和修改时通知变更。这里需要注意的是不同浏览器在控制台打印数据对象时对 getter/setter 的格式化并不同，所以建议安装 vue-devtools 来获取对检查数据更加友好的用户界面

通俗语言解释下

vue创建实例的时候，会把我们data里面的所有数据，全部转为getter 与 setter。

所以created 正是创建vue实例的时候。所以 isok。


但是 如果我们在 mounted生命周期函数里面操作的话，如果我们写个事件对data里面的数组赋值的话。

就必须要使用 this.$set方法。来进行。


##### 使用 $this.set()方法。
```
<template>
  <div>
    <div v-for="(item,index) in arr" :key='index'>{{item}}</div>
    <button @click="test">11</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      arr:[1,2,3,4],
    };
  },
  methods: {
    test() {
      this.$set(this.arr,1,12);
    },
  },
  created(){
    this.$set(this.arr,0,2);
  },
  mounted() {
    // console.log(this.arr)
    this.arr[1] = 3;
  },
};
</script>

<style>
</style>

```

Vue.set( target, propertyName/index, value )