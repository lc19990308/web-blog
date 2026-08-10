---
title: "Web Components 与 Lit：跨框架组件开发"
date: 2024-01-18
categories: "Web Components"
description: "Web Components 是浏览器原生组件标准，Lit 是 Google 推出的轻量级 Web Components 库。本文从 Shadow DOM 到 Lit 实战，构建跨框架可复用的组件"
tags: ["Web Components"]
copyright: true
---

## 前言

Web Components 是一组浏览器原生 API，允许你创建**框架无关**的组件——无论项目用的是 React、Vue 还是 Angular，Web Components 都能直接使用。

Lit 是 Google 推出的 Web Components 库，让原生组件开发变得像现代框架一样高效。

---

## 一、Web Components 三件套

```javascript
// 1. Custom Elements——自定义元素
class MyButton extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }
  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <button><slot /></button>
    `
  }
}
customElements.define('my-button', MyButton)
```

```html
<!-- 在任意框架中使用 -->
<my-button>点击</my-button>
```

| API | 作用 |
|-----|------|
| **Custom Elements** | 定义新的 HTML 标签 |
| **Shadow DOM** | 样式和 DOM 隔离 |
| **HTML Templates** | `<template>` 复用模板 |

---

## 二、Lit 实战

```bash
npm install lit
```

```javascript
import { LitElement, html, css } from 'lit'

export class MyCard extends LitElement {
  static properties = {
    title: { type: String },
    image: { type: String },
    variant: { type: String },
  }

  static styles = css`
    .card { border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .card--primary { border: 2px solid #1890ff; }
  `

  render() {
    return html`
      <div class="card card--${this.variant}">
        <img src="${this.image}" />
        <div class="card-body">
          <h3>${this.title}</h3>
          <slot></slot>
        </div>
      </div>
    `
  }
}

customElements.define('my-card', MyCard)
```

```html
<!-- 在 Vue 中使用 -->
<my-card title="标题" image="photo.jpg" variant="primary">
  <p>内容区域</p>
</my-card>

<!-- 在 React 中使用 -->
<my-card title={title} image={src} variant="primary">
  <p>内容</p>
</my-card>
```

---

## 三、适用场景

```markdown
✅ 组件库（跨框架共用组件）
✅ 微前端（子应用共享组件）
✅ 第三方嵌入组件（如评论框、客服）
✅ 老项目引入新组件（无需升级框架）
```

**推荐阅读：** [Lit 官方文档](https://lit.dev/)
