---
title: "从0开始学习vuex"
date: 2022年12月21日-3点36分
categories: "js"
description: "vuex当中的state，getter，mutation，action是干什么的？如何使用，如何开启vuex命名空间，如何模块化使用vuex"
tags: "Vue"
copyright : ture
---

#### 什么是vuex

>Vuex 是一个专为 Vue.js 应用程序开发的状态管理模式 + 库。它采用集中式存储管理应用的所有组件的状态，并以相应的规则保证状态以一种可预测的方式发生变化。

用通俗的话，来说，当一个vue项目，复杂起来的时候，就需要一个vue 组件全局状态管理的工具。vuex就是一个这样的工具。




#### vuex的state


把vuex 当中的state，在组件里展示出来。


```
export default {
  state: {
    token: "",
    count: 1,
  },
};


<template>
  <div class="home">
    {{ count }}
  </div>
</template>

<script>
export default {
  name: "HomeView",
  computed: {
    count() {
      return this.$store.state.user.count;
    },
  },
};
</script>

```

使用mapState 辅助函数

当我们需要在一个组件state当中获取到，多个状态的时候。

代码如下，


```
<script>
import { mapState } from "vuex";
export default {
  name: "HomeView",
  data() {
    return {
      num: 10,
    };
  },
  computed: mapState({
    count: (state) => state.user.count,
    token: (state) => state.user.token,
    countPlusLocalState(state) {
      return state.user.count + this.num;
    },
    msg: "msg",
  }),
};
</script>


```

mapState,可以帮助我们更好的生成计算属性，获取到store里面的状态。

当映射的计算属性的名称与 state 的子节点名称相同时，我们也可以给 mapState 传一个字符串数组。



```
computed: mapState([
  // 映射 this.count 为 store.state.count
  'count'
])

```


mapState，是一个对象，刚才的那种写法影响到了，我们使用计算属性。这时候我们可以用对象展开运算符写法，以免这样的情况发生。


```

  computed: {
    // 使用对象展开运算符将此对象混入到外部对象中
    ...mapState({
      count: (state) => state.user.count,
      plus: (state) => {
        console.log(thit.num);
        return state.user.count;
      },
    }),
    plusNum: () => {
      return thit.num + 10;
    },
  },
  created() {
    thit = this;
  },
};

```

我们可以在计算属性，照常使用，data里面的参数，与store里面的参数相加。

也能把computed，mapState分开来。




对于需要经常去进行通讯的组件来说，vuex，极大了弥补了，单向数据流带来的不足。
vuex，更方便调试，更直观。但是，却不好维护，所以，非必要的情况下，组件的局部状态还是保存到局部为好。





#### vuex当中的Getter


>有时候我们需要从 store 中的 state 中派生出一些状态，比如store里面有个count，我们需要对count，进行加倍。这个时候，使用getter，就非常好使。


举个例子


```
  computed: {
    dounceCount() {
      return this.$store.getters.doubleCount;
    },
  },

```

getter通过属性访问。


```
    <div>超级加倍{{ $store.getters.doubleCount }}</div>


```

getter通过方法去访问。


```
  computed: {
    doubleCount() {
      return thit.$store.getters.doubleCount;
    },
  },

```


mapGetters辅助函数，当我们需要多个getter的时候，可以使用mapGetters函数，将store里面的getter属性映射到，computed上。

```
    ...mapGetters(["doneCount"]),
```

如果你想将一个 getter 属性另取一个名字，使用对象形式：


```
    ...mapGetters([{doneCount:doneCount}]),
```




#### vuex mutation的使用


修改，store里面的状态的唯一方法就是，mutation。


首先我们要在mutation方法里面注册一个，更改store的事件或者是方法。



```
  mutations: {
    pluNum(state, payload) {
      console.log(state.count, payload);
      state.count += payload;
    },
  },

```


mutation会有一个type，一个回调函数，实际上，pluNum，就是我们事件类型的type，而pluNum，就是我们的回调函数，是我们修改，它会接受state，作为一个参数，第二个参数为payload。

在回调函数内部，对store当中的state进行修改。



如何提交一个mutation呢？

```
  <div @click="$store.commit('pluNum', 10)">count自增</div>

```
store.commit()，第一个注册的mutation名字，第二个是传递过来的参数。




以对象的方式，提交mutation,


```

    <div
      @click="
        $store.commit({
          type: 'pluNum',
          data: 10,
        })
      "
    >
      count自增
    </div>
   mutations: {
    pluNum(state, payload) {
      console.log(payload);
      state.count += payload.data;
    },
  },

```

接受的时候，payload.data,就是要传递过来的参数。


使用常量代替mutation事件类型。


创建一个mutation-types.js文件来保存常量。使用export 导出。


```
export const PLUS_NUM = "PLUS_NUM";

```

store模块代码

```
  import { PLUS_NUM } from "../mutation-types.js";
  
  mutations: {
    [PLUS_NUM](state, payload) {
      console.log(payload);
      state.count += payload.data;
    },
  },

```


提交store.commit

```
    <div
      @click="
        $store.commit({
          type: 'PLUS_NUM',
          data: 10,
        })
      "
    >
      count自增
    </div>

```

Mutation必须是一个同步函数。


使用mapMutations提交 mutation函数。


```
<div @click="add({ data: 12 })">count自增</div>

import { mapState, mapGetters, mapMutations } from "vuex";


  methods: {
    ...mapMutations({
      add: "PLUS_NUM",
    }),
  },


```


#### vuex Action

action类似于mutation，不同是，


action是异步，action，可以提交mutation，但是不能直接改变，state的状态。


注册一个action

```
  actions: {
    increment({ commit }) {
      setTimeout(() => {
        commit("PLUS_NUM", 12);
      }, 3000);
    },
  },
```


action的分发。


actioon接受一个叫，context，和store实例对象相同的对象。
context，内置了，getter，commit，state，

载荷方式分发

```
  this.$store.dispatch("increment", { data: 15 });
```
以对象形式分发

```
   this.$store.dispatch({
     type: "increment",
     data: 15,
   });

```


    
在组件里面分发，action。



```
    <div @click="increment({ data: 15 })">count自增</div>
    import {  mapActions } from "vuex";
    methods: {
        ...mapActions(["increment"]),
    },
```


组合式Action。


```
  actions: {
    actionA({ commit }, params) {
      return new Promise((resolve) => {
        setTimeout(() => {
          console.log(params);
          commit("PLUS_NUM", params);
          resolve("actionA方法执行成功");
        }, 1000);
      });
    },
    actionB({ dispatch }) {
      return dispatch("actionA", { data: 11 }).then(() => {
        console.log("actionB方法执行成功");
      });
    },
  },
  
    methods: {
    add() {
      this.$store.dispatch("actionB", { data: 11 }).then((res) => {
        console.log(res);
      });
    },
  },

```


#### vuex module的使用

由于使用单一状态树，所有的应用状态，都会集中到一个对象上，会导致整个store，变大，难易维护。为了解决这个问题，vuex允许我们，把store分割为module模块，每个模块拥有
state，getter，mutation，action。



关于module的命名空间。

默认的情况下，action，mutation，和getter，注册的是全局命名空间。这样以来，会导致，多个模块对同一个action，或者getter mutation做出响应。


假设我们在一个大项目，我们希望我们的模块有更高的复用性，封装度。可以开启模块的命名空间。。



给我们的user模块，打开命名空间。  namespaced: true,

一旦打开命名空间后，我们获取到的，getter派生出来的值，提交mutition，action都会发生变化。。



先从，getter说起来。


```
    //vuex模块，
    getters: {
        doneCount(state) {
            return state.count * 2;
        },
    },
    ...mapGetters(["doneCount"]),

```

这个时候控制台就会报错，error，[vuex] unknown getter: doneCount。因为，获取，state的时候，我们是这些写的


```
    ...mapState({
      count: (state) => state.user.count,
      plus: (state) => {
        return state.user.count;
      },
    }),

```
直接从，state.user模块，导出了，state的值。



开启命名空间后，获取user模块下面的getter，就得通过，mapGetter提供的对象写法。把user/doneCount的值映射到，"doneCount"上。

```
    ...mapGetters({
      doneCount: "user/doneCount",
    }),

```

那么，如果我们要提交一个mutation呢，怎么办呢？

mapMutiton写法

```
   //vuex部分
   mutations: {
    [PLUS_NUM](state, payload) {
      state.count += payload.data;
    },
  },
  
 ...mapMutations({
    PLUS_NUM: "user/PLUS_NUM",
 }),
  
 <div @click="PLUS_NUM({ data: 11 })">mutation自增</div>

```


store.commit写法。。


```
   mutations: {
    [PLUS_NUM](state, payload) {
      state.count += payload.data;
    },
   },
    //store.commit写法
    test(data) {
      this.$store.commit("user/PLUS_NUM", data);
    },
   <div @click="test({ data: 11 })">mutation自增</div>   
```



action写法


```
    //mapActions写法
    ...mapActions({
      add: "user/actionA",
    }),
    //store.dispatch写法
    test(data) {
      this.$store.dispatch("user/actionA", data);
    },

```


假如，在vuex模块化当中，在b模块，获取到a模块的getter派生出来的值。要如何获取呢？


```
这是模块a
export default {
  namespaced: true,
  state: {
    price: 100,
  },
  getters: {
    doublePrice(state) {
      return state.price * 2;
    },
  },
  mutations: {},
  actions: {},
};


模块b，

 getters: {
    doneCount(state, getters, rootState, rootGetters) {
      console.log("另一个模块化getter的值",  
      rootGetters["cart/doublePrice"]);
      return state.count * 2;
    },
  },

```

带命名空间的模块，如果想要使用全局的state，getter，rootState 和 rootGetters 会作为第三和第四参数传入 getter，也会通过 context 对象的属性传入 action。


带命名空间绑定函数。


```

  computed: {
    // 使用对象展开运算符将此对象混入到外部对象中
    // ...mapState({
    //   count: (state) => state.user.count,
    //   plus: (state) => {
    //     return state.user.count;
    //   },
    // }),
    ...mapState("user", {
      count: (state) => state.count,
      plus: (state) => state.count,
    }),
    plusNum: () => {
      return thit.num + 10;
    },
    // ...mapGetters({
    //   doneCount: "user/doneCount",
    // }),
    ...mapGetters("user", {
      doneCount: "doneCount",
    }),
  },
  created() {
    thit = this;
  },
  methods: {
    ...mapMutations("user", {
      PLUS_NUM: "PLUS_NUM",
    }),
    //mapActions写法
    ...mapActions("user", {
      add: "actionA",
    }),
    //store.dispatch写法
    test(data) {
      this.$store.dispatch("user/actionA", data);
    },
  },

```


我有点反感，vuex 的写法。。mapstate('路径'，导出的参数)，这样只能导出一个模块的参数。觉得更低效了。。




#### 总结


vuex核心概念，state，与，getter，mutation，action。

mutation与action的区别是，一个同步一个异步。任何对store进行修改的操作都要经过，mutation。

action，可以提交mutation。也可以多重action。嵌套着玩。



getter，派生出来的东西 rootgetter，获取其他模块的getter。

namespaced，开启空间命名。。

