---
title: "CSS Container Queries 实战：容器查询改写响应式"
date: 2025-06-12
categories: "CSS"
description: "容器查询让可复用组件根据可用空间而非视口调整布局。本文说明容器建立、默认样式、嵌套命名与渐进增强，并区分它与媒体查询的职责。"
tags: "CSS"
copyright: true
---

## 组件关心的是自己有多宽

媒体查询回答“视口有多宽”。它仍然适合决定整页导航、全局排版和设备级体验。但一个商品卡片放在主内容区、侧栏和弹窗里时，视口可能相同，可用宽度却完全不同。容器查询让组件根据最近容器的尺寸调整，减少同一组件在不同布局里失效的情况。

它不是媒体查询的替代品。页面级决策使用 `@media`，组件内部布局使用 `@container`，两者各自解决不同层级的问题。

## 从可用的默认样式开始

容器查询应当是增强层，窄布局或不支持查询时的默认样式必须本身可用。下面的卡片默认纵向排列；当卡片所在区域达到足够宽度时才切换为横向布局。

```html
<section class="product-list">
  <article class="product-card">
    <img class="product-card__image" src="camera.webp" alt="黑色相机">
    <div class="product-card__body">
      <h2>旅行相机</h2>
      <p>轻量机身，适合日常记录。</p>
      <a href="/products/camera">查看详情</a>
    </div>
  </article>
</section>
```

```css
.product-list {
  container-type: inline-size;
  container-name: product-list;
}

.product-card {
  display: grid;
  gap: 1rem;
  align-items: start;
}

.product-card__image {
  inline-size: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

@container product-list (min-width: 38rem) {
  .product-card {
    grid-template-columns: minmax(10rem, 0.8fr) 1.2fr;
  }

  .product-card__image {
    block-size: 100%;
  }
}
```

查询只能影响容器的后代，不能直接根据自身尺寸改变容器本身。这个限制会让层级更清楚：`.product-list` 负责提供可用空间，`.product-card` 负责在这块空间里重排。

## 容器要放在正确的边界上

`container-type: inline-size` 让后代可观察容器的行内尺寸。最常见的选择是组件列表、面板或卡片的外层包装器。不要为了“到处可查询”给大量元素加容器；它会改变尺寸计算和布局隔离的行为，也会让嵌套查询更难理解。

当组件嵌套在其他容器内时，给容器命名能避免规则误匹配到最近但不相关的祖先：

```css
.sidebar {
  container: sidebar / inline-size;
}

@container sidebar (max-width: 24rem) {
  .filter-group {
    grid-template-columns: 1fr;
  }
}
```

名称不是每次都必需。只有容器嵌套、组件被多处复用，或读代码时很难确定查询对象时，才为它起一个表达业务边界的名字。

## 尺寸单位和断点要服务内容

容器查询可以使用普通长度，也支持 `cqi`、`cqb` 等容器相对单位。它们适合在有限范围内微调字号和间距，但不能代替内容设计：

```css
.product-card__body {
  padding: clamp(0.75rem, 4cqi, 1.5rem);
}
```

断点不要从设备型号或惯例数字开始。把组件放到最窄的真实容器中，观察标题、价格、操作按钮何时开始拥挤，再以那个内容失效点作为断点。卡片可能在 520px 切换，而筛选栏可能在 360px 切换，它们不需要共用一套数字。

## 用渐进增强处理支持差异

当前主流浏览器已经支持尺寸容器查询，但嵌入式 WebView、企业设备或特殊浏览器仍可能落后。默认样式应始终完整可用；只有查询规则放在特性检测中：

```css
/* 默认布局已定义在外部 */

@supports (container-type: inline-size) {
  .product-list {
    container-type: inline-size;
  }

  @container (min-width: 38rem) {
    .product-card {
      grid-template-columns: minmax(10rem, 0.8fr) 1.2fr;
    }
  }
}
```

是否需要这层检测，取决于产品支持范围。设计验收时至少在主内容区、侧栏、弹窗和窄屏中查看同一个组件，确认标题会换行、按钮不会溢出、图片尺寸稳定。容器查询让组件更独立，但不替你完成这些布局检查。

**推荐阅读：** [MDN：CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries)
