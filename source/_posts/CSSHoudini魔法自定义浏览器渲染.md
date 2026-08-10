---
title: "CSS Houdini 魔法：自定义浏览器的渲染行为"
date: 2026-07-10
categories: "css"
description: "CSS Houdini 让开发者可以直接操作浏览器的 CSS 引擎——自定义属性、扩展布局、绘制自定义图形，突破 CSS 的限制"
tags: ["css", "浏览器"]
copyright: true
---

## 前言

CSS Houdini 是一组浏览器底层 API 的统称，它让开发者可以**直接接入浏览器的 CSS 渲染管线**。换句话说，你可以告诉浏览器"这个 CSS 属性该怎么画"。

> Houdini 让 CSS 从一个声明式语言，变成了可编程的渲染引擎。

---

## 一、Houdini 解决了什么问题？

### 传统 CSS 的限制

```css
/* 你只能使用浏览器预定义的属性 */
background: linear-gradient(...)  /* ✅ 浏览器定义好的 */
background: my-amazing-pattern()  /* ❌ 浏览器不认识 */
```

### Houdini 的解法

```css
/* 注册自定义属性 */
@property --my-color {
  syntax: '<color>';
  initial-value: red;
  inherits: false;
}

/* 在 Worklet 中定义绘制逻辑 */
.registerPaint('my-pattern', class {
  paint(ctx, size, props) {
    // 这里用 Canvas API 绘制！
    const color = props.get('--my-color').toString()
    ctx.fillStyle = color
    ctx.fillRect(0, 0, size.width, size.height)
  }
})
```

然后你就能在 CSS 中这样用：

```css
.box {
  background: paint(my-pattern);
  --my-color: blue;
}
```

---

## 二、Houdini API 家族

| API | 功能 | 浏览器支持 |
|-----|------|-----------|
| **Paint API** | 自定义绘制（替代 CSS 背景/边框） | ✅ Chrome/Edge  |
| **Properties & Values** | 注册自定义 CSS 属性（带类型） | ✅ Chrome/Edge |
| **Typed OM** | 类型化的 CSS 对象模型 | ✅ Chrome/Edge |
| **Layout API** | 自定义布局（替代 Flexbox/Grid） | ⚠️ 试验阶段 |
| **Animation Worklet** | 自定义动画 | ⚠️ 试验阶段 |

目前生产环境最实用的是 **Paint API** 和 **Properties & Values**。

---

## 三、Paint API 实战

### 3.1 波纹背景

```js
// ripple-worklet.js
registerPaint('ripple', class {
  static get inputProperties() { return ['--ripple-color', '--ripple-size'] }

  paint(ctx, size, props) {
    const color = props.get('--ripple-color').toString()
    const size_ = parseInt(props.get('--ripple-size'))

    ctx.strokeStyle = color
    ctx.lineWidth = 2

    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.arc(size.width / 2, size.height / 2, size_ * (i + 1), 0, Math.PI * 2)
      ctx.globalAlpha = 1 - i * 0.2
      ctx.stroke()
    }
  }
})
```

### 3.2 在项目中加载

```ts
// 加载 Worklet
if ('paintWorklet' in CSS) {
  CSS.paintWorklet.addModule('./ripple-worklet.js')
}
```

```css
.ripple-element {
  --ripple-color: #1890ff;
  --ripple-size: 20px;
  background: paint(ripple);
  width: 200px;
  height: 200px;
}
```

### 3.3 高级用法：骨架屏

```js
registerPaint('skeleton', class {
  static get inputProperties() {
    return ['--skeleton-color', '--skeleton-highlight']
  }

  paint(ctx, size, props) {
    const baseColor = props.get('--skeleton-color').toString() || '#eee'
    const highlight = props.get('--skeleton-highlight').toString() || '#f5f5f5'

    // 绘制动效背景
    const gradient = ctx.createLinearGradient(0, 0, size.width, 0)
    gradient.addColorStop(0, baseColor)
    gradient.addColorStop(0.5, highlight)
    gradient.addColorStop(1, baseColor)

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size.width, size.height)
  }
})
```

结合 Animation Worklet 可以实现纯 CSS 骨架屏动画，无需额外 DOM！

---

## 四、Properties & Values API

### 4.1 类型化自定义属性

```css
@property --spacing {
  syntax: '<length>';
  initial-value: 16px;
  inherits: true;
}

@property --theme-color {
  syntax: '<color>';
  initial-value: black;
  inherits: false;
}

/* 使用类型化属性，可以参与 CSS 过渡和动画！ */
.card {
  --spacing: 8px;
  padding: var(--spacing);
  transition: --spacing 0.3s;
}
.card:hover {
  --spacing: 24px; /* 平滑过渡！ */
}
```

普通自定义属性不能做 transition，但类型化属性可以！

---

## 五、Typed OM（类型化 CSS 对象模型）

告别 `elem.style.left = '10px'` 的字符串拼接：

```ts
// ❌ 传统方式
element.style.width = '100px'
element.style.transform = 'translateX(50px)'

// ✅ Typed OM
import { CSS } from 'css-typed-om'

element.attributeStyleMap.set('width', CSS.px(100))
element.attributeStyleMap.set('transform', CSS.translate(CSS.px(50), 0))

// 单位安全 —— 不会出现 NaN、undefined 等脏数据
const width = element.computedStyleMap().get('width')  // CSSUnitValue { value: 100, unit: 'px' }
```

**优势：** 类型安全、性能更好（避免字符串解析）、更丰富的操作方法。

---

## 六、Houdini 的浏览器兼容性

截至 2026 年：

-   **Paint API**：Chrome/Edge 全面支持，Firefox 实验支持
-   **Properties & Values**：Chrome/Edge 全面支持
-   **Layout API**：仅 Chrome 实验支持
-   **Safari**：部分支持

**生产建议：** 将 Houdini 作为 **渐进增强** 使用——不支持时用传统 CSS 兜底。

---

## 七、总结

CSS Houdini 代表了 Web 平台演进的趋势——**让底层能力向开发者开放**。虽然目前 Paint API 是最实用的，但随着浏览器支持逐渐完善，Houdini 将彻底改变我们编写 CSS 的方式。

**一句话总结：** 如果 CSS 做不到，Houdini 让你自己来做。
