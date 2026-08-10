---
title: "微前端架构实战：从 Module Federation 到 qiankun"
date: 2026-05-22
categories: "架构"
description: "理解微前端的核心概念与技术方案，实战对比 Module Federation、qiankun、single-spa，以及微前端的适用场景与落地经验"
tags: ["架构"]
copyright: true
---

## 前言

微前端（Micro Frontends）是将**前端应用拆分为多个独立子应用**，每个子应用可以独立开发、独立部署、独立运行，最终组合成一个完整产品的架构模式。

```
┌────────────────────────────────────────┐
│          主容器（Container）            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │ 导航  │ │ 首页  │ │ 商品  │ │ 用户  │  │
│  │ 子应用│ │ 子应用│ │ 子应用│ │ 子应用│  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│       各子应用独立开发/部署/运行         │
└────────────────────────────────────────┘
```

---

## 一、为什么需要微前端？

### 1.1 单体应用的痛点

```markdown
| 问题 | 说明 |
|------|------|
| 代码膨胀 | 一个项目数万行代码，构建越来越慢 |
| 团队耦合 | 多个团队修改同一个仓库，冲突不断 |
| 技术锁定 | 只能用一个框架、一个版本 |
| 部署困难 | 改一行代码要全量部署，风险高 |
```

### 1.2 微前端的优势

```markdown
✅ 独立开发——每个子应用独立仓库、独立技术栈
✅ 独立部署——子应用可以单独上线
✅ 渐进式迁移——老系统不改，新功能用新技术
✅ 团队自治——团队各管一个子应用
✅ 按需加载——只加载当前需要的子应用
```

---

## 二、主流方案对比

| 方案 | 原理 | 学习成本 | 隔离性 | 适用场景 |
|------|------|---------|--------|---------|
| **Module Federation** | Webpack 5 插件，运行时加载远程模块 | **低** | 中 | Webpack 项目 |
| **qiankun** | 基于 single-spa，沙箱隔离 | 中 | **高** | 多技术栈 |
| **single-spa** | 路由驱动，生命周期管理 | 高 | 低 | 自定义需求 |
| **iframe** | 浏览器原生隔离 | **最低** | **最高** | 简单集成 |

### iframe 的问题

```markdown
虽然 iframe 隔离性最好，但它有一些致命缺陷：
- URL 不同步（刷新丢失状态）
- 全局通信复杂（postMessage）
- 性能开销大（每个 iframe 独立进程）
- 弹窗/遮罩层无法跨 iframe
- 不适合需要紧密交互的场景
```

---

## 三、Module Federation 实战

Module Federation 是 Webpack 5 的核心功能，让应用可以在**运行时加载远程模块**。

### 3.1 主应用配置

```javascript
// 主应用 webpack.config.js
const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'container',
      remotes: {
        // 远程子应用的地址
        app1: 'app1@http://localhost:3001/remoteEntry.js',
        app2: 'app2@http://localhost:3002/remoteEntry.js',
      },
      shared: {
        // 共享依赖——避免重复加载
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true },
      },
    }),
  ],
}
```

### 3.2 子应用配置

```javascript
// 子应用 webpack.config.js
const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'app1',
      filename: 'remoteEntry.js',
      exposes: {
        // 暴露给主应用的组件
        './Header': './src/components/Header',
        './ProductList': './src/pages/ProductList',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true },
      },
    }),
  ],
}
```

### 3.3 加载远程组件

```javascript
// 主应用中动态加载远程组件
import React, { Suspense, lazy } from 'react'

// 懒加载远程组件
const RemoteHeader = lazy(() => import('app1/Header'))
const RemoteProductList = lazy(() => import('app1/ProductList'))

function App() {
  return (
    <div>
      <Suspense fallback={<div>加载中...</div>}>
        <RemoteHeader />
        <RemoteProductList />
      </Suspense>
    </div>
  )
}
```

**Vue 3 + Vite 使用 Module Federation：**

```javascript
// 使用 @originjs/vite-plugin-federation 插件
import federation from '@originjs/vite-plugin-federation'

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'container',
      remotes: {
        app1: 'http://localhost:3001/assets/remoteEntry.js',
      },
      shared: ['vue', 'vue-router', 'pinia'],
    }),
  ],
})
```

```vue
<!-- 加载远程 Vue 组件 -->
<script setup>
import { defineAsyncComponent } from 'vue'

const RemoteComponent = defineAsyncComponent(() =>
  import('app1/SomeComponent')
)
</script>

<template>
  <Suspense>
    <RemoteComponent />
  </Suspense>
</template>
```

---

## 四、qiankun 实战

qiankun 基于 single-spa，提供了更完善的**沙箱隔离**和**样式隔离**。

### 4.1 主应用

```javascript
// 主应用入口
import { registerMicroApps, start } from 'qiankun'

// 注册子应用
registerMicroApps([
  {
    name: 'app-vue',       // 子应用名称
    entry: '//localhost:3001',  // 子应用地址
    container: '#sub-app',      // 挂载容器
    activeRule: '/app-vue',     // 激活规则
  },
  {
    name: 'app-react',
    entry: '//localhost:3002',
    container: '#sub-app',
    activeRule: '/app-react',
  },
])

// 启动
start({
  sandbox: {               // 沙箱隔离
    experimentalStyleIsolation: true,  // 样式隔离
  },
})
```

### 4.2 子应用（Vue 3）

```javascript
// 子应用需要导出生命周期钩子
// src/main.js
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

let app = null
let router = null
let history = null

// qiankun 要求的生命周期
export async function bootstrap() {
  console.log('子应用启动')
}

export async function mount(props) {
  const { container } = props

  router = createRouter({
    history: createWebHistory('/app-vue'),
    routes,
  })

  app = createApp(App)
  app.use(router)
  app.mount(container.querySelector('#app'))
}

export async function unmount() {
  app.unmount()
  app = null
  router = null
}
```

### 4.3 子应用独立运行兼容

```javascript
// 未在 qiankun 环境下时独立运行
if (!window.__POWERED_BY_QIANKUN__) {
  createApp(App).use(router).mount('#app')
}
```

---

## 五、微前端的通信

### 5.1 qiankun 的 props 通信

```javascript
// 主应用传递 props
start({
  props: {
    store: globalStore,
    onEvent: (type, data) => console.log(type, data),
  },
})

// 子应用接收 props
export async function mount(props) {
  console.log(props.store)    // 全局状态
  console.log(props.onEvent)  // 通信方法
  props.onGlobalStateChange((state, prev) => {
    console.log('全局状态变化:', state)
  })
}
```

### 5.2 全局 Event Bus

```javascript
// 创建全局事件总线
// apps/shared/event-bus.js
class GlobalEventBus {
  constructor() {
    this.listeners = {}
    window.__GLOBAL_EVENT_BUS__ = this
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(callback)
  }

  emit(event, ...args) {
    (this.listeners[event] || []).forEach((cb) => cb(...args))
  }

  off(event, callback) {
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback)
  }
}

// 使用（所有子应用共享同一个实例）
const bus = window.__GLOBAL_EVENT_BUS__ || new GlobalEventBus()

// 应用 A：触发事件
bus.emit('user:logout')

// 应用 B：监听事件
bus.on('user:logout', () => {
  clearUserSession()
  router.push('/login')
})
```

---

## 六、微前端的挑战

```markdown
| 挑战 | 解决方案 |
|------|---------|
| 样式冲突 | CSS Modules / scoped / CSS 变量 / qiankun 沙箱 |
| 依赖重复加载 | Webpack Module Federation shared / 公共依赖 CDN |
| 路由冲突 | 主应用控制路由前缀，子应用内部路由 |
| 状态同步 | props 传递 / Event Bus / 统一 Store |
| 构建部署 | 每个子应用独立 CI/CD |
| 性能优化 | 预加载、按需加载、公共依赖缓存 |
```

### 何时不推荐用微前端

```markdown
❌ 团队只有 3-5 人（单体应用更高效）
❌ 项目功能简单（微前端增加复杂度）
❌ 没有独立的部署需求
❌ 团队成员不熟悉微前端

微前端的本质是「组织架构」的映射，而不是技术炫技。
```

---

## 七、落地经验

```markdown
1. 渐进式引入
   - 不要一开始就全部微前端
   - 从最独立的模块开始（如后台管理）

2. 统一基建
   - 共享 UI 组件库
   - 共享工具库
   - 统一 CI/CD 流程

3. 约定大于配置
   - 统一路由前缀规则
   - 统一通信协议
   - 统一错误处理

4. 监控与调试
   - 统一日志上报
   - 子应用独立监控
   - 跨应用链路追踪
```

---

## 总结

```markdown
微前端选型建议：

├─ Webpack 项目，团队熟悉 MF
│   └─ Module Federation（最简单）
│
├─ 多技术栈混合（Vue + React + 老项目）
│   └─ qiankun（沙箱隔离最好）
│
├─ 简单集成，不需要紧密交互
│   └─ iframe（原生隔离，无侵入）
│
└─ 自定义需求多
    └─ single-spa（最灵活，但成本高）

核心原则：
- 微前端是组织问题，不是技术问题
- 2 Pizza Team（2个披萨能喂饱的团队）不需要微前端
- 先保证能独立部署，再考虑微前端
```

**推荐阅读：**
- [Webpack Module Federation 文档](https://webpack.js.org/concepts/module-federation/)
- [qiankun 官方文档](https://qiankun.umijs.org/)
- [微前端（Micro Frontends）](https://martinfowler.com/articles/micro-frontends.html)
