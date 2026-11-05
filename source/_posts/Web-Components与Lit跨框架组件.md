---
title: "Web Components 与 Lit：跨框架组件开发"
date: 2024-01-18
categories: "Web Components"
description: "Web Components 能提供浏览器原生的组件边界，Lit 让模板和响应式更新更易维护。本文从属性、事件、插槽、样式与跨框架集成的真实成本讲起。"
tags: ["Web Components"]
copyright: true
---

## 跨框架不等于零集成成本

Web Components 由 Custom Elements、Shadow DOM 和 HTML Templates 等浏览器能力组成。它们很适合设计系统、第三方嵌入和微前端中的稳定 UI 边界，因为最终交付的是浏览器认识的自定义元素。

不过，组件能在不同框架页面中出现，不代表属性、事件、表单、服务端渲染和类型提示都会自动一致。选型前先确认组件要被谁使用、如何发布版本、事件和复杂数据如何约定，以及哪些框架版本需要支持。

Lit 在原生 Custom Elements 之上提供模板、响应式属性和样式管理。它不是另一个虚拟 DOM 框架，最终仍然注册为浏览器自定义元素。

## 先定义公开的组件契约

一个可复用组件至少要说明：属性名与类型、默认行为、事件名和 `detail` 结构、插槽、可定制的 CSS 变量，以及升级时的兼容性规则。字符串属性可以通过 HTML attribute 传递；对象、数组和函数应通过 DOM property 赋值，不能把 JSON 随手塞进 attribute。

下面是一个带默认插槽、命名插槽和 CSS 自定义属性的 Lit 卡片。模板插值会被 Lit 按上下文处理，不要为了渲染不可信 HTML 直接使用不安全的 HTML 指令。

```ts
import { LitElement, css, html } from 'lit'

export class AppCard extends LitElement {
  static properties = {
    title: { type: String },
    imageSrc: { type: String, attribute: 'image-src' },
    imageAlt: { type: String, attribute: 'image-alt' },
  }

  static styles = css`
    :host { display: block; }
    article {
      border: 1px solid var(--app-card-border, #d7d7d7);
      border-radius: 6px;
      overflow: clip;
    }
    img { display: block; inline-size: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
    .body { padding: 1rem; }
  `

  declare title: string
  declare imageSrc: string
  declare imageAlt: string

  render() {
    return html`
      <article aria-labelledby="title">
        ${this.imageSrc
          ? html`<img src=${this.imageSrc} alt=${this.imageAlt ?? ''}>`
          : null}
        <div class="body">
          <h2 id="title">${this.title}</h2>
          <slot></slot>
          <footer><slot name="actions"></slot></footer>
        </div>
      </article>
    `
  }
}

if (!customElements.get('app-card')) {
  customElements.define('app-card', AppCard)
}
```

```html
<app-card
  title="旅行相机"
  image-src="/camera.webp"
  image-alt="黑色旅行相机"
  style="--app-card-border: #0b6e4f"
>
  <p>轻量机身，适合日常记录。</p>
  <a slot="actions" href="/products/camera">查看详情</a>
</app-card>
```

Shadow DOM 隔离了内部选择器，不隔离 CSS 自定义属性、事件或可见文本。用自定义属性提供少量稳定主题入口，比让使用方依赖 shadow 内部 class 更可维护。

## 事件必须穿过组件边界

自定义事件应有稳定、文档化的名称与数据结构。要让父页面或框架监听到它，事件通常需要 `bubbles` 和 `composed`：

```ts
this.dispatchEvent(new CustomEvent('app-card-select', {
  detail: { id: this.id },
  bubbles: true,
  composed: true,
}))
```

原生事件在 Shadow DOM 中会发生事件重定向。对外只承诺事件类型和 `detail`，不要让使用者依赖内部节点。涉及输入、选中或表单提交的组件，还要明确是否使用原生表单控件、如何处理 `disabled`、键盘操作和可访问名称。

## 与框架集成时做一次真实验证

Vue 通常能识别自定义元素，但可能需要在构建配置中声明哪些标签是 custom element。React、Angular 和不同版本的框架对 property 与 attribute、以及自定义事件名的处理存在差异。复杂对象和回调尤其需要通过元素 property 或官方包装器传递。

不要只在一个静态示例里验证。至少在每个目标框架中检查：

- 字符串属性、布尔属性和对象 property 是否按预期更新。
- 自定义事件能否被框架层收到，事件 `detail` 是否完整。
- slot 内容、表单提交、键盘焦点和读屏名称是否正确。
- SSR 页面在自定义元素定义加载前是否有稳定的初始内容，hydration 后是否重复渲染。

组件库应同时发布类型声明、使用文档与版本变更记录。组件标签稳定后，改属性名或事件名通常就是面向使用方的破坏性变更。

## 适合和不适合的地方

Web Components 适合需要跨技术栈复用、独立发布或嵌入第三方页面的 UI，例如公司设计系统、客服挂件和微前端共享组件。它不一定适合高度依赖某个框架状态管理、路由上下文或服务端数据模型的页面级组件；此时原生组件边界可能只会增加桥接层。

把它当作公开的产品 API，而不是“任何框架都能直接复制粘贴”的捷径，才能获得跨框架复用的收益。

**推荐阅读：** [Lit 官方文档](https://lit.dev/docs/)
