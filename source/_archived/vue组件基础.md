---
title: "vue组件基础"
date: 2021年6月25日20点56分
categories: "vue"
description: "谈谈vue的props，与emit，slot"
tags: "Vue"
copyright : ture
---


#### vue的组件基础
创建一个组件

1，我们在src文件夹下面的components文件下，创建了一个组件。代码如下。

```
<template>
    <div>{{count}}</div>
</template>

<script>
export default {
    name:'cell',
    data(){
        return{
            count:0,
        }
    },
    methods:{

    }
}
</script>

<style lang="less" scoped>

</style>
```
和平常写的vue组件没啥两样。


##### 关于组件的复用


```
  <div>
    <My-cell></My-cell>
    <My-cell></My-cell>
    <My-cell></My-cell>
    <My-cell></My-cell>
  </div>
  
```

每个组件都是独立的。里面的值不会出现窜。

组件的data必须必须必须是一个函数。
所以每个组件实例都会都可以维护一个返回实例的拷贝。


##### 关于组件中的prop。

1,prop是一个单向数据流，数据从组件外，自然而然的流向组件内。
2，组件内顶柜的prop来接收，组件外的指定参数。
3，prop可以校验数据的格式。

组件添加props

props我们可以指定数据类型与格式。
```
  props:{
      title:{
          type:String,
          default:'我想静静',
      },
      content:{
          type:String,
          default:'假装我是一篇文章....'
      },
      number:{
          type:Number,
          default:0,
      }
  },
  

```

添加参数

```
<template>
  <div>
    <My-cell :content="content" :title="title"></My-cell>
  </div>
</template>

<script>
import cell from "../components/cell/index.vue";
export default {
  data() {
    return {
      content:'你好阿，小老弟',
      title:'你好aaaa    ',
      
    };
  },
  components: {
    "My-cell": cell,
  },
};
</script>

<style>
</style>

```

##### 组件事件

使用emit(),抛出事件。
```
<template>
<div>
    <div>{{title}}</div>
    <div>{{content}}</div>
    <div>{{number}}</div>
    <button @click="click()">点击</button>
</div>
</template>

<script>
export default {
  name: "cell",
  props:{
      title:{
          type:String,
          default:'我想静静',
      },
      content:{
          type:String,
          default:'假装我是一篇文章....'
      },
      number:{
          type:Number,
          default:0,
      }
  },
  data(){
      return{

      }
  },
  methods: {
    click() {
        this.$emit('getdata',this.number);//0
    },
  },
};
</script>

<style lang="less" scoped>
</style>

```
getdata 拿到事件抛出的值。


```
<template>
  <div>
    <My-cell :content="content" :title="title" @getdata='getdata'></My-cell>
  </div>
</template>

<script>
import cell from "../components/cell/index.vue";
export default {
  data() {
    return {
      content:'你好阿，小老弟',
      title:'你好aaaa    ',
      
    };
  },
  components: {
    "My-cell": cell,
  },
  methods: {
    getdata(e){
      console.log(e);
    }
  },
  created() {},
  mounted() {},
};
</script>

<style>
</style>


```

##### 组件的插槽，可以命名。让组件更加灵活。

```
<div>
    <slot name="header"></slot>
    <slot name="main"></slot>
    <slot name="footer"></slot>
</div>

```
使用组件的 slot
```
<template>
  <div>
    <My-cell>
      <div slot="header">11</div>
       <div slot="main">22</div>
        <div slot="footer">33</div>
    </My-cell>
  </div>
</template>

<script>
import cell from "../components/cell/index.vue";
export default {
  data() {
    return {
      content:'你好阿，小老弟',
      title:'你好aaaa    ',
      
    };
  },
  components: {
    "My-cell": cell,
  },
  methods: {
    getdata(e){
      console.log(e);
    }
  },
  created() {},
  mounted() {},
};
</script>

<style>
</style>
```

##### 作用域插槽

插槽可以命名，也可以绑定数据。但是必须要使用template 元素



```
<template>
<div>
    <slot name="header" :user='obj'></slot>
    <slot name="main"></slot>
    <slot name="footer"></slot>
</div>
</template>

<script>
export default {
  name: "cell",
  data(){
      return{
          obj:{
              name:'里斯哦',
              age:11,
          }
      }
  },
  methods: {

  },
};
</script>

<style lang="less" scoped>
</style>


```






我们可以使用 scope.user.name,来访问数据。


```
<template>
  <div>
    <My-cell>
      <template v-slot:header='scope'>{{scope.user.name}}</template>
       <div slot="main">22</div>
        <div slot="footer">33</div>
    </My-cell>
  </div>
</template>

<script>
import cell from "../components/cell/index.vue";
export default {
  data() {
    return {
      obj:{
        name:11,
        age:'111'
      }
    };
  },
  components: {
    "My-cell": cell,
  },
  methods: {
    getdata(e){
      console.log(e);
    }
  },
  created() {},
  mounted() {},
};
</script>

<style>
</style>
```


##### 组件的动态切换插槽。

v-slot:[参数]

例子如下，组件我们2个插槽都会给上不同的值。

```
<template>
<div class="zz">
    <slot name="header" :usr='obj'></slot>
    <slot name="main" :username='obj.name'></slot>
    <slot name="footer" :age='obj.age'>
    </slot>
</div>
</template>

<script>
export default {
  name: "cell",
  data(){
      return{
          obj:{
              name:'里斯哦',
              age:11,
          }
      }
  },
  methods: {

  },
};
</script>

<style lang="less" scoped>
</style>
```

```
<template>
  <div>
    <My-cell>
      <template v-slot:header="scope">{{ scope.usr.name }}</template>
      <template v-slot:[name]="scope">{{scope}}</template>
    </My-cell>
  </div>
</template>

<script>
import cell from "../components/cell/index.vue";
export default {
  data() {
    return {
      obj: {
        name: 11,
        age: "111",
      },
      name: "footer",
    };
  },
  components: {
    "My-cell": cell,
  },
  methods: {
    getdata(e) {
      console.log(e);
    },
  },
  created() {},
  mounted() {},
};
</script>

<style>
</style>

```


插槽可以缩写 用#来表示 v-slot:header='scope'


```
    <My-cell>
      <template #header='scope'>{{ scope.usr.name }}</template>
      <template #[name]="scope">{{scope}}</template>
    </My-cell>
```



总结


组件属性 | 特性
---|---
$emit() | 子组件抛出去一个自定义事件，传一个参数。
props | 单向数据流，父传子，监测数据类型，默认值。
slot | 带一个插槽，可以指定名字，也可以成为作用域插槽，#表示缩写。


