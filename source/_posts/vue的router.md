---
title: "Vue Router 完全指南：从基础到实战"
date: 2021-06-21 15:36:00
updated: 2025-06-22
categories: "Vue"
description: "系统覆盖 Vue Router 全部核心知识点：动态路由、嵌套路由、命名视图、组件传参（3 种模式）、路由守卫、元信息、路由动效"
tags: "Vue"
copyright: true
---

## 前言

Vue Router 是 Vue 生态的核心组成部分。本文系统梳理路由的全部知识点，从基础配置到高级模式，涵盖 Vue Router 3（Vue 2）和 Vue Router 4（Vue 3）的通用概念。

---

## 一、路由基础

### 1.1 基本配置

```javascript
// router/index.js
import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'), // 路由懒加载
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About.vue'),
  },
]

const router = new VueRouter({
  mode: 'history', // 去除 URL 中的 #，需要后端配合
  routes,
})

export default router
```

**注意：** Vue Router 4（Vue 3）使用 `createRouter` / `createWebHistory` 替代 `new VueRouter`。

### 1.2 路由懒加载

```javascript
// 使用动态 import 实现代码分割
{
  path: '/about',
  component: () => import(/* webpackChunkName: "about" */ '../views/About.vue'),
}
```

---

## 二、动态路由匹配

### 2.1 基础用法

```javascript
{
  path: '/user/:id',
  name: 'UserDetail',
  component: () => import('../views/UserDetail.vue'),
}
```

**页面获取参数：**
```javascript
// 模板中
this.$route.params.id   // → /user/123 获取 123

// 跳转
<router-link :to="'/user/' + userId">用户详情</router-link>
// 或
this.$router.push({ path: '/user/123' })
this.$router.push({ name: 'UserDetail', params: { id: 123 } })
```

### 2.2 参数变化监听

当路由参数变化但**组件被复用**时（如 `/user/1` → `/user/2`），`created` 不会再次执行：

```javascript
// ❌ 不会再次触发
created() { this.id = this.$route.params.id }

// ✅ 使用 watch 监听
watch: {
  '$route'(to, from) {
    this.id = to.params.id
    // 重新获取数据...
  },
}

// ✅ 或使用组件内守卫（Vue Router 4 推荐）
beforeRouteUpdate(to, from, next) {
  this.id = to.params.id
  next()
}
```

### 2.3 捕获 404

```javascript
{
  // Vue Router 3: path: '*'
  // Vue Router 4: path: '/:pathMatch(.*)*'
  path: '*',
  redirect: '/404',
}
```

---

## 三、嵌套路由

### 3.1 基本嵌套

```javascript
{
  path: '/user',
  component: () => import('../views/User.vue'), // 父组件
  children: [
    { path: 'profile', component: () => import('../views/UserProfile.vue') },
    { path: 'posts', component: () => import('../views/UserPosts.vue') },
    // 默认子路由：访问 /user 时渲染
    { path: '', component: () => import('../views/UserDefault.vue') },
  ],
}
```

**父组件中必须包含 `<router-view />`：**
```vue
<!-- User.vue -->
<template>
  <div>
    <h1>用户中心</h1>
    <router-view />  <!-- 子路由渲染到这里 -->
  </div>
</template>
```

### 3.2 重定向子路由

```javascript
{
  path: '/user/:id',
  redirect: '/user/:id/profile', // 访问 /user/123 自动跳转到 /user/123/profile
  component: () => import('../views/User.vue'),
  children: [
    { path: 'profile', component: () => import('../views/UserProfile.vue') },
  ],
}
```

---

## 四、命名路由与命名视图

### 4.1 命名路由

给路由起一个名字，跳转时不再依赖路径：

```javascript
{
  path: '/user/:id/profile',
  name: 'UserProfile',  // 唯一名称
  component: () => import('../views/UserProfile.vue'),
}
```

```vue
<!-- 使用 name 跳转，路径变化也不影响 -->
<router-link :to="{ name: 'UserProfile', params: { id: 1 } }">个人资料</router-link>
```

### 4.2 命名视图

在同一级渲染多个组件：

```javascript
{
  path: '/layout',
  components: {
    default: () => import('../views/Layout.vue'),
    aside: () => import('../views/Aside.vue'),
    main: () => import('../views/Main.vue'),
  },
}
```

```vue
<!-- App.vue 中使用命名 <router-view> -->
<router-view name="aside" />
<router-view name="main" />
<router-view />  <!-- 默认 -->
```

**嵌套命名视图：**
```javascript
{
  path: '/user',
  component: () => import('../views/User.vue'),
  children: [{
    path: 'detail',
    components: {
      default: () => import('../views/Detail.vue'),
      header: () => import('../views/Header.vue'),
    },
  }],
}
```

---

## 五、路由组件传参（3 种模式）

在组件中使用 `$route.params` 会让组件与路由**高度耦合**。使用 `props` 可以解耦：

### 5.1 布尔模式

```javascript
{
  path: '/user/:id',
  props: true,  // 将 $route.params 设置为组件 props
  component: () => import('../views/User.vue'),
}
```

```vue
<!-- User.vue — 直接用 props 接收 -->
<script>
export default {
  props: ['id'],  // 直接使用 props，不再依赖 this.$route
}
</script>
```

### 5.2 对象模式

适合传递静态数据：

```javascript
{
  path: '/about',
  props: { version: '1.0.0' },  // 静态 props
  component: () => import('../views/About.vue'),
}
```

### 5.3 函数模式（最灵活）

可以动态组合 params、query 和静态数据：

```javascript
{
  path: '/search',
  props: (route) => ({
    query: route.query.q,
    page: Number(route.query.page) || 1,
  }),
  component: () => import('../views/Search.vue'),
}
```

```vue
<!-- Search.vue -->
<script>
export default {
  props: ['query', 'page'],  // 干净！不依赖 $route
}
</script>
```

**3 种模式对比：**

| 模式 | 优点 | 缺点 |
|------|------|------|
| **布尔模式** | 简单，params 自动映射 | 只支持 params，不支持 query |
| **对象模式** | 静态数据灵活 | 不支持动态路由参数 |
| **函数模式** | 最灵活，支持 params + query | 语法稍微复杂 |

---

## 六、重定向与别名

### 6.1 重定向

```javascript
{ path: '/home', redirect: '/' }
{ path: '/home', redirect: { name: 'Home' } }
{ path: '/home', redirect: (to) => { return '/404' } }
```

### 6.2 别名

```javascript
{
  path: '/',
  alias: '/index',  // 访问 /index 也匹配首页
  component: () => import('../views/Home.vue'),
}
```

---

## 七、路由守卫

### 7.1 全局守卫

```javascript
// 前置守卫 — 最常用：权限验证
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')

  if (token) {
    if (to.path === '/login') {
      next('/')        // 已登录，跳离登录页
    } else {
      next()            // 放行
    }
  } else {
    if (to.meta.requiresAuth) {
      next(`/login?redirect=${to.fullPath}`)  // 未登录，跳登录页
    } else {
      next()            // 不需要登录，放行
    }
  }
})

// 后置钩子
router.afterEach((to, from) => {
  // 可用于页面统计、滚动行为等
})
```

### 7.2 路由独享守卫

```javascript
{
  path: '/admin',
  beforeEnter: (to, from, next) => {
    if (isAdmin()) next()
    else next('/403')
  },
  component: () => import('../views/Admin.vue'),
}
```

### 7.3 组件内守卫

```javascript
export default {
  // 进入路由前（此时没有 this）
  beforeRouteEnter(to, from, next) {
    next((vm) => { /* 可以访问 this */ })
  },
  // 路由参数变化时（组件被复用）
  beforeRouteUpdate(to, from) {
    this.loadData(to.params.id)
  },
  // 离开路由前
  beforeRouteLeave(to, from, next) {
    if (this.hasUnsavedChanges) {
      const ok = confirm('有未保存的修改，确定离开吗？')
      if (!ok) return next(false) // 取消导航
    }
    next()
  },
}
```

---

## 八、路由元信息

在路由上通过 `meta` 字段附加自定义数据：

```javascript
{
  path: '/dashboard',
  meta: {
    requiresAuth: true,        // 需要登录
    title: '控制台',            // 页面标题
    permission: 'admin',       // 权限标识
    transition: 'fade',        // 动效名
  },
  component: () => import('../views/Dashboard.vue'),
}
```

**在全局守卫中使用：**
```javascript
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title || '默认标题'

  // 权限检查
  if (to.meta.requiresAuth && !isLoggedIn()) {
    next('/login')
  } else {
    next()
  }
})
```

---

## 九、路由动效

```vue
<template>
  <transition :name="transitionName">
    <router-view />
  </transition>
</template>

<script>
export default {
  watch: {
    $route(to, from) {
      // 根据路由深度决定动效方向
      this.transitionName = to.meta.index > from.meta.index ? 'slide-left' : 'slide-right'
    },
  },
}
</script>

<style>
.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active {
  transition: all 0.3s;
}
.slide-left-enter { transform: translateX(100%); }
.slide-left-leave-to { transform: translateX(-100%); }
.slide-right-enter { transform: translateX(-100%); }
.slide-right-leave-to { transform: translateX(100%); }
</style>
```

---

## 十、常见问题

### 10.1 跳转同一页面报错

```javascript
// Vue Router 3 中，重复跳转同一路由会报 Uncaught (in promise)
// ✅ 修复方案：重写 push 方法
const originalPush = VueRouter.prototype.push
VueRouter.prototype.push = function push(location) {
  return originalPush.call(this, location).catch((err) => err)
}
```

### 10.2 Params 刷新丢失

`$route.params` 的数据在页面刷新后是否保留，取决于参数是否在路由路径中定义：

```javascript
// ✅ 刷新不丢失：参数在 URL 中
{ path: '/user/:id' }
this.$router.push({ name: 'User', params: { id: 1 } })

// ❌ 刷新丢失：参数不在 URL 中
this.$router.push({ name: 'User', params: { id: 1 } })
// path 没定义 :id，刷新后 params 消失
```

**结论：** params 传参必须配合动态路由（在 path 中定义参数），否则刷新会丢失。

---

## 总结

| 知识点 | 核心要点 |
|--------|---------|
| **动态路由** | `:id` 匹配、watch \$route 监听变化 |
| **嵌套路由** | children + 父组件 `<router-view>` |
| **命名视图** | components（复数） + name 属性 |
| **组件传参** | 布尔/对象/函数 3 种模式解耦 |
| **重定向/别名** | redirect / alias |
| **路由守卫** | 全局 / 路由独享 / 组件内 |
| **元信息** | meta 字段 + 守卫配合 |
| **动效** | transition + watch \$route |

**推荐阅读：**
- [Vue Router 官方文档](https://router.vuejs.org/)
- [Vue Router 4（Vue 3）迁移指南](https://next.router.vuejs.org/guide/migration/)
