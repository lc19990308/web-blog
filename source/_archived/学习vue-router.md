---
title: "学习vue router"
date: 2022年12月26日-18点33分
categories: "vue router"
description: "学习vue当中的router，动态传参，动态路由，命名视图，命名路由，组件传参，路由守卫，视图嵌套，懒加载路由，路由动效，路由滚动，路由元信息......"
tags: "Vue"
copyright: ture
---

一直都没老老实实的看过 vue router 的文档。

今天详细的过一遍 vue router 文档。

#### router 当中的动态路由匹配

假设我们有一个页面，需要传递参数。我们看一下动态路由如何进行匹配。

```
  {
    path: "/UserView/:id",
    name: "UserView",
    component: () => import("../views/UserView.vue"),
  },


    <div class="app-container">
    <div>user页面获取到的id:{{ $route.params.id }}</div>
  </div>
```

使用 vue router 动态路由匹配的话，接收参数必须使用，**route.params**来接收参数。

vue 使用 $router.push(),跳转同一个页面会导致报错。

在 router 文件夹下面的 index.js 文件，添加一段代码

```
const originalPush = VueRouter.prototype.push;
VueRouter.prototype.push = function push(location) {
  return originalPush.call(this, location).catch((err) => err);
};
```

跳转同一个页面就不会报错了。

捕捉 router 没有，匹配到 404 Not found 路由。

使用 router path 的通配符，可以匹配任何路径。

当然在这里之前，我们首先得有一个，所谓的 404 页面。。

```
  {
    path: "/404Page",
    name: "404",
    component: () => import("../views/404Page.vue"),
  },

```

path 使用通配符，匹配没有被匹配到的路径，使用 redirect，把它给重定向到，/404Page 页面。

```
  {
    // 会匹配所有路径
    path: "*",
    redirect: "/404Page",
  },
```

#### router 嵌套路由。

router-view，会渲染匹配到组件。一个渲染组件同样也可以包涵自己的 router-view 嵌套。。

路由嵌套，需要多个 router-view。顶层的 router-view 渲染出的是顶层，高级路由所匹配到的组件。高级路由所匹配到的组件，内部加载 router-view，渲染，router 嵌套所匹配到的组件。。

这个概念很绕。

假设以，A 组件，需要嵌套 B,C 组件。顶层的 router-view 渲染出的仅仅是，A 组件。A 组件的内部的 router-view，用来渲染，B,C 组件。

```
  {
    path: "/UserView",
    name: "UserView",
    component: () => import("../views/user/UserView.vue"),
    children: [
      {
        path: "NavbarView",
        component: () => import("../views/user/NavbarView.vue"),
      },
      {
        path: "FooterView",
        component: () => import("../views/user/FooterView.vue"),
      },
    ],
  },

```

还是，A 组件嵌套 B,C 组件。B.C 组件。假设，我们跳转/A/B,再跳转到/A/C，那么，B,C 组件的生命周期是完整的。

可是，A 组件已然被复用了，不会在重复的执行生命周期了。。

那么，A 组件的路由，参数发生变动，A 组件的，created 生命周期，只会加载一次。如何拿到变动的，参数呢？

答案，是使用 watch 监听。router 的变动。

```
  watch: {
    $route(to) {
      this.id = to.params.id;
      // 对路由变化作出响应...
    },
  },

```

如果我们跳转/A 的路由，A 组件内部的 router-view，没有匹配到组件，就不会渲染。。

如果跳转/A，A 组件内部的，router-view，我们想要渲染的话。咱们可以提高一个空的子路由。

```
 children: [
      {
        path: "",
        component: () => import("../views/user/NavbarView.vue"),
      },
      {
        path: "NavbarView",
        component: () => import("../views/user/NavbarView.vue"),
      },
      {
        path: "FooterView",
        component: () => import("../views/user/FooterView.vue"),
      },
    ],

```

或者，也可以，进行重定向。。

```
  {
    path: "/UserView/:id",
    name: "UserView",
    redirect: "/UserView/:id/NavbarView",
    component: () => import("../views/user/UserView.vue"),
    children: [
      {
        path: "NavbarView",
        component: () => import("../views/user/NavbarView.vue"),
      },
      {
        path: "FooterView",
        component: () => import("../views/user/FooterView.vue"),
      },
    ],
  },

```

#### 关于 vue router 的命名路由。

这里做个假设，假设，我要跳一个嵌套路由。是一个二级嵌套。。

那么，肯定是这样。

```
$router.push({path:'/a/b'})
或者 <router-link :to={path:'/a/b'} />
```

命名路由，就是给路由起一个名字。

例子如下，，

```

  {
    path: "/UserView/:id",
    name: "UserView",
    redirect: "/UserView/:id/NavbarView",
    component: () => import("../views/user/UserView.vue"),
    children: [
      {
        name: "UserView-NavbarView",
        path: "NavbarView",
        component: () => import("../views/user/NavbarView.vue"),
      },
      {
        path: "FooterView",
        component: () => import("../views/user/FooterView.vue"),
      },
    ],
  },

      <router-link :to="{ name: 'UserView-NavbarView', params: { id: '11' } }"
        >UserView/NavbarView</router-link
      >|
```

router-link，使用 name 进行跳转，要简便多了。。

当然，缺陷就是，router，是一个匹配的关系。所以！！！
name 是唯一的。就像 id 一样。。不要乱跳！

params 传参的缺点就是，需要用动态路由。参数在路由上面定义。route.params 接收。。

query 接收参数，就是一段查询字符串。。

#### 关于命名视图.

在 app.vue 里面的<router-view />是一个未命名的视图。router 只要匹配到了，就会把组件渲染到这里。。

可是，我们要完成一些复杂的布局。

例子，在 app.vue 里面。

```
  <div id="app">
    <el-container>
      <el-aside width="200px">
        <transition name="slide">
          <router-view name="aside"></router-view>
        </transition>
      </el-aside>
      <el-main>
        <transition name="slide">
          <router-view name="main"></router-view>
        </transition>
      </el-main>
    </el-container>
    <transition name="slide">
      <router-view />
    </transition>
  </div>

```

我们对 router-view 的 name 进行了命名。

因为我们要在同级嵌套 视图。

router 挂载组件的时候。就不能使用，component 了，需要使用 components。

```
  {
    path: "/LayoutIndex",
    name: "LayoutIndex",
    components: {
      default: () => import("../layout/LayoutIndex.vue"),
      main: () => import("../layout/MainView.vue"),
      aside: () => import("../layout/AsideView.vue"),
    },
  },

```

当我们使用 router 跳转到 LayoutIndex 页面时，命名路由会得到匹配。。

那么嵌套路由如果是嵌套路由命名视图呢？

```
  {
    path: "/UserView",
    name: "UserView",
    component: () => import("../views/UserView.vue"),
    children: [
      {
        path: "DefaultView",
        name: "DefaultView",
        components: {
          default: () => import("../views/user/DefaultView.vue"),
          header: () => import("../views/user/HeaderView.vue"),
        },
      },
    ],
  },

```

嵌套命名视图。就是把命名视图藏入，要嵌套的页面里面。

```
<template>
  <div>
    <!--<router-view />
    <router-view name="header"></router-view> -->
    <el-container>
      <el-aside width="200px">
        <el-menu :default-openeds="['1', '3']">
          <el-submenu index="1">
            <template slot="title"
              ><i class="el-icon-message"></i>导航一</template
            >
            <el-menu-item-group>
              <template slot="title">分组一</template>
              <el-menu-item index="1-1">选项1</el-menu-item>
              <el-menu-item index="1-2">选项2</el-menu-item>
            </el-menu-item-group>
            <el-menu-item-group title="分组2">
              <el-menu-item index="1-3">选项3</el-menu-item>
            </el-menu-item-group>
            <el-submenu index="1-4">
              <template slot="title">选项4</template>
              <el-menu-item index="1-4-1">选项4-1</el-menu-item>
            </el-submenu>
          </el-submenu>
          <el-submenu index="2">
            <template slot="title"><i class="el-icon-menu"></i>导航二</template>
            <el-menu-item-group>
              <template slot="title">分组一</template>
              <el-menu-item index="2-1">选项1</el-menu-item>
              <el-menu-item index="2-2">选项2</el-menu-item>
            </el-menu-item-group>
            <el-menu-item-group title="分组2">
              <el-menu-item index="2-3">选项3</el-menu-item>
            </el-menu-item-group>
            <el-submenu index="2-4">
              <template slot="title">选项4</template>
              <el-menu-item index="2-4-1">选项4-1</el-menu-item>
            </el-submenu>
          </el-submenu>
          <el-submenu index="3">
            <template slot="title"
              ><i class="el-icon-setting"></i>导航三</template
            >
            <el-menu-item-group>
              <template slot="title">分组一</template>
              <el-menu-item index="3-1">选项1</el-menu-item>
              <el-menu-item index="3-2">选项2</el-menu-item>
            </el-menu-item-group>
            <el-menu-item-group title="分组2">
              <el-menu-item index="3-3">选项3</el-menu-item>
            </el-menu-item-group>
            <el-submenu index="3-4">
              <template slot="title">选项4</template>
              <el-menu-item index="3-4-1">选项4-1</el-menu-item>
            </el-submenu>
          </el-submenu>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header>
          <router-view name="header"></router-view>
        </el-header>
        <el-main>
          <router-view></router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script>
export default {
  data() {
    return {};
  },
};
</script>
<style lang="less" scoped></style>


```

#### 重定向与别名

比如，我们要访问 home 页面，但是 home 页面没有被 router 所匹配到，那么使用，router 的 redirect，把它给重定向到 404 页面。

例子

```
  {
    // 会匹配所有路径
    path: "*",
    redirect: "/404Page",
  },

```

router 中的别名，alias，比如我们访问首页，path 是 “/”，这个时候，我们如果使用，router，跳转到/index，页面。就会匹配到 404 页面。

这个时候，我们设置别名，path：“/”的，alias：“/index”，这样的话，router.push 跳转到 /，/index，都会匹配到首页。

```
  {
    path: "/",
    name: "home",
    alias: "/index",
    component: HomeView,
  },

```

#### router 路由组件传参

每次 url 传递的参数，都在 route.params，里面拿到。组件与 router 之间会存在高度耦合性。

我们可以使用，组件当中的 props 来降低解耦。

布尔模式下。

```

  {
    path: "/about/:id",
    name: "about",
    props: true,
    component: () => import("../views/AboutView.vue"),
  },

```

props 为 true，router 上的 params，会自动绑定到组件的 props，上。

```
<template>
  <div class="HomeNavbar">组件:{{ id }}</div>
</template>

<script>
export default {
  props: ["id"],
  created() {
    console.log(this.$route.params);
  },
};
</script>

<style lang="less" scoped>
.HomeNavbar {
}
</style>


```

对象模式，如果 props 是一个对象，它会被按原样设置为组件属性。当 props 是静态的时候有用。

静态指的是，route.params,和，route.query 的参数都无法传递到，props 上面去。

参数被定义在 router 上写死了。

```

  {
    path: "/about",
    name: "about",
    props: { id: 1212121, name: "章三" },
    // props: (route) => ({ ...route.query }),
    component: () => import("../views/AboutView.vue"),
  },

```

函数模式，我们可以创建一个函数返回 props，这样可以把静态的值，路由的值结合到一起。。

比如，我们要把 route.query 的值，返回到 props，上。。

```

  {
    path: "/about",
    name: "about",
    props: (route) => ({ ...route.query }),
    component: () => import("../views/AboutView.vue"),
  },

  <template>
  <div class="about">
    <h1>This is an about page</h1>
    <h2>id=> {{ id }}</h2>
    <h2>name=> {{ name }}</h2>
  </div>
</template>
<script>
export default {
  props: ["id", "name"],
};
</script>


```

#### router 当中的路由守卫

使用全局路由守卫来，来判断 token 是否存在。不存在就去登录页。

beforeEach,有三个参数，to，from，next。
to，从哪来来，from，要到哪里去。

next，是否同意。。

next 写的一定要符合逻辑。确保 next 函数在任何给定的导航守卫中都被严格调用一次。它可以出现多于一次，但是只能在所有的逻辑路径都不重叠的情况下，否则钩子永远都不会被解析或报错。

```
import router from "@/router/index";
const whiteList = ["/login"];
router.beforeEach((to, from, next) => {
  const Token = localStorage.getItem("Token");
  if (Token) {
    if (to.path === "/login") {
      next("/");
    } else {
      next();
    }
  } else {
    if (whiteList.includes(to.path)) {
      next();
    } else {
      next(`/login?redirect=${to.fullPath}`);
    }
  }
});


```

全局后置钩子，

```
router.afterEach((to, from) => {
  // ...
})

```

全局后置钩子，没有，next 方法。只有 to，from

路由独享的守卫

比如，我有一个特殊的页面，权限只针对这个页面。那么在页面的钩子函数里面，处理不够优雅。在全局守卫里面，处理有小题大做。。

例子如下，

```
  {
    path: "/about",
    name: "about",
    props: (route) => ({ ...route.query }),
    beforeEnter: (to, from, next) => {
      if (localStorage.getItem("Token")) {
        next();
      } else {
        next(`/login?redirect=${to.fullPath}`);
      }
    },
    component: () => import("../views/AboutView.vue"),
  },

```

beforeEntaer,路由上的守卫就特别好使。

组件内也有路由守卫给我们使用。
分别是，beforeRouteEnter
beforeRouteUpdate (2.2 新增)
beforeRouteLeave

我们把在 router 上的，beforEnter，守卫拿掉。

例子如下，

```
  beforeRouteEnter(to, from, next) {
    // 在渲染该组件的对应路由被 confirm 前调用
    // 不！能！获取组件实例 `this`
    // 因为当守卫执行前，组件实例还没被创建
    if (localStorage.getItem("Token")) {
      next();
    } else {
      next(`/login?redirect=${to.fullPath}`);
    }
  },


```

当页面被复用的时候。beforeRouteUpdate 守卫会被触发。

```
  beforeRouteUpdate(to, from) {
    // 在当前路由改变，但是该组件被复用时调用
    // 举例来说，对于一个带有动态参数的路径 /foo/:id，在 /foo/1 和 /foo/2 之间跳转的时候，
    // 由于会渲染同样的 Foo 组件，因此组件实例会被复用。而这个钩子就会在这个情况下被调用。
    // 可以访问组件实例 `this`
    console.log(to.path, from.path);
  },

```

beforeRouteLeave 路由守卫，更像一个全局后置守卫，但是他有 next 方法。

```
  beforeRouteLeave(to, from, next) {
    // 导航离开该组件的对应路由时调用
    // 可以访问组件实例 `this`
  }

```

#### 路由的元信息

我们可以在路由上定义 mate 字段，存储一些路由信息，比如是否要身份验证...

router.js，路由元信息添加到，router 里面

```

import Vue from "vue";
import VueRouter from "vue-router";

Vue.use(VueRouter);
const routes = [
  {
    path: "/404Page",
    name: "404",
    meta: {
      authentication: false,
    },
    component: () => import("../views/404Page.vue"),
  },
  {
    path: "/",
    name: "home",
    alias: "/index",
    meta: {
      authentication: true,
    },
    component: () => import("../views/HomeView.vue"),
  },
  {
    path: "/about",
    name: "about",
    meta: {
      authentication: true,
    },
    props: (route) => ({ ...route.query }),
    component: () => import("../views/AboutView.vue"),
  },
  {
    path: "/LayoutIndex",
    name: "LayoutIndex",
    meta: {
      authentication: true,
    },
    components: {
      default: () => import("../layout/LayoutIndex.vue"),
      main: () => import("../layout/MainView.vue"),
      aside: () => import("../layout/AsideView.vue"),
    },
  },
  {
    path: "/login",
    name: "login",
    meta: {
      authentication: false,
    },
    component: () => import("../views/LoginPage.vue"),
  },
  {
    path: "/UserView",
    name: "UserView",
    meta: {
      authentication: true,
    },
    components: {
      default: () => import("../views/UserView.vue"),
    },
    children: [
      {
        path: "DefaultView",
        name: "DefaultView",
        meta: {
          authentication: true,
        },
        components: {
          default: () => import("../views/user/DefaultView.vue"),
          header: () => import("../views/user/HeaderView.vue"),
        },
      },
    ],
  },
  {
    // 会匹配所有路径
    path: "*",
    redirect: "/404Page",
  },
];

const router = new VueRouter({
  routes,
});
const originalPush = VueRouter.prototype.push;
VueRouter.prototype.push = function push(location) {
  return originalPush.call(this, location).catch((err) => err);
};

export default router;


```

使用路由信息，设置路由守卫。

```
import router from "@/router/index";
// const whiteList = ["/login"];
router.beforeEach((to, from, next) => {
  const Token = localStorage.getItem("Token");
  if (Token) {
    if (to.path === "/login") {
      next("/");
    } else {
      next();
    }
  } else {
    if (to.meta.authentication) {
      next(`/login?redirect=${to.fullPath}`);
    } else {
      next();
    }
  }
});


```

#### 路由动效

```
<!-- 使用动态的 transition name -->
<transition :name="transitionName">
  <router-view></router-view>
</transition>


```

#### 在页面未加载之前获取数据。

```
  beforeRouteEnter (to, from, next) {
    getPost(to.params.id, (err, post) => {
      next(vm => vm.setData(err, post))
    })
  },

```

总结，集中的过了一下，route.parmas，刷新参数会消失的原因是，因为，动态路由传参数，必须要在 router 里面定义。

视图如何嵌套，命名视图如何和嵌套视图，整在一起，路由如何加动效。router 传参。如何更好的解耦，把它整合到 porps 里面。如何使用重定向和别名。

包括路由的 3 个全局守卫，路由独享的守卫，组件路由守卫。路由的 mate 信息，配合全局守卫。

在页面加载之前提前获取到数据。
和路由的滚动。等等知识。还是干货满满的。

百度脑图地址，[百度脑图](https://naotu.baidu.com/file/d10fd6077ad17cc07833f7fd0dbdbc19)
