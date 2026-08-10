---
title: "Vue Bits 使用指南：按需引入动效组件"
date: 2026-08-07
categories: "Vue"
description: "从 vue-bits 的组件注册表安装 AnimatedContent，了解它写入项目的方式、GSAP 依赖、Nuxt/SSR 与减少动态效果设置，并避开全局 ScrollTrigger 的使用边界。"
tags: ["Vue", "组件", "动画", "UI"]
copyright: true
---

[vue-bits](https://github.com/DavidHDev/vue-bits) 很容易让人误以为又是一个“装上就能全局使用”的 Vue UI 库。它不是。它更像一个可挑选的动效组件仓库：在需要某个效果时，把那一个组件和它的依赖拉进自己的项目，之后源码归项目自己维护。

这个区别很实际。你不会为了一个滚动入场动画引入一整套设计系统；代价是组件更新不会随着 `npm update` 自动到来，安装后要把它当作自己代码的一部分审查、测试和升级。

仓库 README 目前列出 90+ 个文本动画、交互组件和背景效果，并说明它是 [React Bits](https://reactbits.dev/) 的官方 Vue 移植版。本文不追求把页面做得“特效很多”，只用 `AnimatedContent` 做一个可控的入场动画，讲清楚完整使用路径。

## 先选一个会改善阅读的效果

`AnimatedContent` 是一个包裹组件。它在元素进入视口时，用 GSAP 把子内容从指定方向移动到原位，并可同时从低透明度过渡到可见。

它适合放在首页首屏之后的标题、案例列表、长文中的小节开头。不要给每个段落都包一层：读者滑动时会等动画，信息反而慢下来。

下面这类结构就足够了：

```text
静态页面结构
      ↓
AnimatedContent 只包住一个内容块
      ↓
元素进入视口后播放一次
      ↓
动画结束，内容保持普通的静态布局
```

## 安装一个组件，而不是整库

vue-bits 的文档页为每个组件提供 `shadcn` 和 `jsrepo` 两种安装方式。以 `AnimatedContent` 为例，公开注册表中的条目地址是：

```bash
npx shadcn@latest add \
  https://vue-bits.dev/r/AnimatedContent.json
```

也可以使用 `jsrepo`：

```bash
npx jsrepo add \
  https://vue-bits.dev/r/AnimatedContent.json
```

这两条命令的共同结果不是在 `node_modules` 里多一个 `vue-bits` 运行时包，而是从注册表取回组件文件，并按当前项目的配置写入组件目录。安装后先看终端输出和实际落点，再写 import；不同项目的别名和组件目录不必强行统一。

`AnimatedContent` 的注册表清单声明了 `gsap@^3.13.0` 依赖。若你采用安装器，检查 `package.json` 是否已写入 `gsap`；若是从 GitHub 手动复制 `.vue` 文件，则自行安装：

```bash
npm install gsap
```

组件页、预览和安装选项可在 [AnimatedContent 文档](https://vue-bits.dev/animations/animated-content) 查看。

## 在一个业务页面里使用

假设安装器把文件放到了 `src/components/AnimatedContent/AnimatedContent.vue`。下面在一个营销页的“案例”区块使用它。路径以你的实际输出为准。

```vue
<script setup lang="ts">
import AnimatedContent from '@/components/AnimatedContent/AnimatedContent.vue'
</script>

<template>
  <section class="case-section" aria-labelledby="case-title">
    <AnimatedContent
      :distance="28"
      :duration="0.45"
      :threshold="0.15"
      :animate-opacity="true"
    >
      <p class="section-label">案例研究</p>
      <h2 id="case-title">先把问题讲清楚</h2>
      <p>动画只负责引导视线，标题和正文在不播放动画时也要完整成立。</p>
    </AnimatedContent>
  </section>
</template>
```

这几个参数已经覆盖大多数页面：

| 参数 | 作用 | 我常用的范围 |
| --- | --- | --- |
| `distance` | 入场前的位移距离 | 16–40，距离过大会像内容从屏幕外冲进来 |
| `duration` | 动画时长，单位为秒 | 0.3–0.6，正文通常比装饰元素更短 |
| `threshold` | 元素在视口中达到的触发比例 | 0.1–0.25 |
| `direction` | `vertical` 或 `horizontal` | 正文优先用默认的垂直方向 |
| `reverse` | 反转进入方向 | 用在有明确视觉方向的少数区块 |
| `delay` | 延迟播放，单位为秒 | 只在一个区块内需要层级时使用 |

组件还会在动画结束时触发 `complete` 事件。它适合做本地状态更新，例如开始某个非关键的装饰效果；不要把请求数据、路由跳转或提交表单绑在动画完成后。

```vue
<AnimatedContent :distance="24" :duration="0.4" @complete="showDecoration = true">
  <article>这里的内容无需等待接口，也无需等待动画。</article>
</AnimatedContent>
```

## 在 Nuxt、移动端和无动画偏好下收住效果

`AnimatedContent` 在挂载后注册 GSAP 的 `ScrollTrigger`，因此不要在服务端渲染阶段直接依赖浏览器对象。Vue 生命周期本身会让组件的挂载逻辑在客户端执行；若你的页面还包了其他依赖 `window` 的组件或第三方脚本，在 Nuxt 中把那一小块放进 `<ClientOnly>`，而不是把整个页面都改成客户端渲染。

页面还应尊重用户的“减少动态效果”偏好。最简单的策略是：检测到 `prefers-reduced-motion: reduce` 后，保留内容，取消入场动画或把位移与时长降到几乎不可感知。对于纯装饰性的鼠标组件，例如 `Magnet`，触屏设备应直接禁用，不能把鼠标悬停当作所有用户都具备的输入方式。

```vue
<AnimatedContent
  :distance="prefersReducedMotion ? 0 : 28"
  :duration="prefersReducedMotion ? 0 : 0.45"
  :animate-opacity="!prefersReducedMotion"
>
  <slot />
</AnimatedContent>
```

这里的 `prefersReducedMotion` 可以由项目已有的媒体查询封装提供。关键不是变量名，而是保证同一份正文在动画关闭时仍立即可读。

## 一个需要提前知道的 GSAP 边界

截至本文检查的版本，`AnimatedContent` 在 prop 变化和组件卸载时会调用 `ScrollTrigger.getAll()`，然后逐个 `kill()`。这是全局注册表：如果同一个页面还有其他 GSAP 的滚动触发器，动态修改这个组件的参数或卸载它时，可能一并清掉别的触发器。

因此有两种稳妥用法：

- 页面只把它当作一次性入场组件，避免在运行中频繁改动它的动效 props。
- 同页已有复杂 GSAP 动画时，先在隔离页面验证卸载与路由切换；必要时把组件改为只保存并销毁自己创建的 tween 和 trigger。

这是“源码落到项目里”的好处。你不是被一个黑盒组件困住，可以根据页面的动画所有权改它；但这也意味着把组件贴进页面前要读一遍依赖、生命周期和清理逻辑。

## 上线前的四个检查

1. 把系统“减少动态效果”打开一次，确认内容不闪烁、不迟到。
2. 用键盘完成页面的主要操作。动画容器不能改变焦点顺序，也不该遮住按钮。
3. 在手机宽度和普通桌面宽度都看一遍。只对鼠标有意义的效果不能成为理解内容的前提。
4. 在同页有其他 GSAP 动画时切换路由或条件渲染一次，确认其他触发器没有消失。

vue-bits 的价值在于让你从一个已完成的交互细节开始，而不是从零抄一段动效代码。选择一个能服务内容的组件，限定它的出现范围，再把动效关掉后重新检查页面。这样留下来的效果，通常比满屏背景粒子和逐字标题更耐看。

最后还有许可证。vue-bits 使用的是 [MIT + Commons Clause](https://github.com/DavidHDev/vue-bits/blob/main/LICENSE.md)：可以把组件用于应用、网站或产品，包括商业用途；但不能把组件本身单独、打包、模板化或移植后出售、再授权或再分发。做客户项目一般没有问题，做“售卖组件库”的产品则不在许可范围内。
