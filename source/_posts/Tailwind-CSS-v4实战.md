---
title: "Tailwind CSS v4：从 CSS-first 开始迁移"
date: 2025-05-12
categories: "CSS"
description: "Tailwind CSS v4 把主题定义移到 CSS，并提供更直接的 Vite 集成。迁移前先识别旧配置与插件依赖，避免为了 CSS-first 丢掉现有能力。"
tags: "CSS"
copyright: true
---

Tailwind CSS v4 的核心变化是 CSS-first：通过 `@import` 引入框架，用 `@theme` 定义设计令牌。它并不要求所有项目立刻删除 `tailwind.config.js`，旧的 JavaScript 配置可以继续通过 `@config` 显式加载。

迁移的重点不在于换一条安装命令，而在于确认构建工具、主题令牌、第三方插件和动态类名是否仍能被正确处理。先在一个页面或包里完成闭环，再扩大范围。

## Vite 项目的最小接入

Vite 项目使用官方插件即可，不需要执行旧版的 `tailwindcss init`：

```bash
npm install tailwindcss @tailwindcss/vite
```

在 Vite 配置中注册插件：

```ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()]
})
```

然后在入口 CSS 中导入 Tailwind：

```css
@import "tailwindcss";
```

构建成功后，用一个真实页面验证工具类是否生成，而不是只看开发服务器没有报错。

## 用 `@theme` 定义设计令牌

`@theme` 中的命名会映射为工具类。颜色令牌可以生成 `bg-*`、`text-*` 等颜色工具类；字体令牌可以生成 `font-*`。

```css
@import "tailwindcss";

@theme {
  --color-brand: oklch(0.62 0.19 250);
  --color-danger: oklch(0.63 0.22 25);
  --font-display: "IBM Plex Sans", "PingFang SC", sans-serif;
}
```

```html
<button class="bg-brand px-4 py-2 font-display text-white">
  保存
</button>
```

这样做的好处是令牌和 CSS 放在一起，浏览器原生工具也能直接看到变量。令牌命名仍然需要团队约定，不能因为写在 CSS 里就失去层级。

## 自定义变体与工具类

自定义暗色选择器可以使用 `@custom-variant`。例如项目通过根节点的 `.dark` 切换主题：

```css
@custom-variant dark (&:where(.dark, .dark *));

@utility scrollbar-hidden {
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}
```

这里的目标是补充少数稳定的项目约定，不是把所有普通 CSS 都改写成自定义工具类。出现三处以上且有明确语义的模式，再考虑抽取。

## 旧配置不必一次删除

v4 不会自动发现 JavaScript 配置。如果当前项目依赖已有的主题扩展或插件，可以在 CSS 中明确引入：

```css
@config "../../tailwind.config.js";
@import "tailwindcss";
```

迁移前逐项检查旧配置里是否有插件、预设、`safelist`、自定义扫描路径或依赖运行时拼接的类名。它们不是简单把颜色复制到 `@theme` 就能替代的内容。

## 一个稳妥的迁移顺序

1. 升级依赖并让 Vite 插件、CSS 入口在 CI 中构建通过。
2. 先迁移颜色、字体、间距等明确的主题令牌。
3. 保留旧配置中暂时无法替代的部分，用 `@config` 过渡。
4. 检查生产 CSS、深层路由页和动态 class 是否都生成了所需样式。

不要把“Rust 引擎”写成某个固定的速度倍数。构建时间取决于项目大小、变更范围、缓存和插件。对自己的项目记录迁移前后的构建数据，才有比较价值。

参考：[Tailwind CSS Vite 安装](https://tailwindcss.com/docs/installation/using-vite) 与 [v4 升级指南](https://tailwindcss.com/docs/upgrade-guide)。
