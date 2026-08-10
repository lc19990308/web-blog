---
title: "vue路由组件传参"
date: 2021年7月10日-19点23分
categories: "vue"
description: "vue路由组件传参，布尔值模式，对象模式，函数模式。"
tags: "Vue"
copyright : ture
---


### 关于vue router组件的传参

##### 提到，使用router进行传参，你会想到什么。从A页面，到B页面。只使用router，都有那些方式？  
1.  比如vue 动态路由参数匹配？
2.  还是使用vue params，传参，比如通过router上的name，才能跳转，刷新一下参数就掉。
3.  还是比如query，参数拼接到字符串上？




我们假设一个场景，我们在A页面到B页面，要传递一个object。是的，你一定要json一下，
在B页面接收都要做那些步骤。

1. 先写上一段，this.$route.query.object ....（我不说你也得觉得很长）
2. 把拿到的参数josn化。
3. 要把参数赋值到data，然后data再去使用。


##### 发现的问题

###### 1. 你是知道的，A页面想去B页面。那么如果C也想去B页面，并且不打算传参你该如何解决。

解决方案也简单，写个判断语句嘛。if，三元表达式，或者query，传递不同的标识符。这样页面C跳转B也没啥问题了。



###### 2. this.$router.query.object,真的是一种很舒服的传参方式嘛，这么长。
不是。

这就是我要讲vue router 组件传参的意义。


路由传参有三种模式

###### 布尔模式

例子

```
//router部分
  {
    name:'user',
    path: '/user',
    component: () => import('../views/user.vue'),
    props: true //直接开启布尔模式
  },
  
  //跳转
<router-link :to="{name: 'user',params: {name: 'word',  age: '11'}}">user</router-link>

//页面取参数

<template>
  <div>{{name}}{{age}}</div><!--参数是word11-->
</template>

<script>
export default {
    props: ['params','name','age'],

};
</script>

<style>
</style>

```

布尔模式下，props：true的情况下，params的参数会被设置为组件的props。



###### 对象模式


例子如下

```
//  router部分

  {
    name: 'user',
    path: '/user',
    component: () => import('../views/user.vue'),
    props: {
      name: '11',
    }
  },
  
//跳转
  <router-link :to="{name: 'user', params:{name:'word',age:'11',}}">user</router-link>
  
  
  
  页面
  
    <template>
         <div>user{{ name }}{{ age }}</div>
    </template>

<script>
export default {
  props: [ "name", "age"],
};
</script>




```
对象模式只适合给静态类型的数据。。routerlink 传递进去的数据 拿不到。


函数模式

```
//router

  {
    name: 'user',
    path: '/user',
    component: () => import('../views/user.vue'),
    props:route=>({//函数模式，把route的参数给解构了。
      name:route.query.name,
      age:route.query.age,
    })
  },
  
  //跳转
<router-link :to="{path:'/user',query:{name:'word',age:'11'}}">user</router-link>
  
//user页面接收参数

<template>
  <div>user{{ name }}{{ age }}</div>
  <!--参数是word11-->
</template>

<script>
export default {
  props: ['query', "name", "age"],
};
</script>

<style>
</style>
  
```


###### 总结

模式 | 特性 |优点
---|---|---
 布尔值模式| props，属性为true，route.params，自动绑定为属性|不支持query
对象模式 | 适合静态类型|不支持动态类型
函数模式|支持params，query|没啥毛病









