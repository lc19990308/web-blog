---
title: "CSS Grid 布局完全指南：从基础到高级响应式方案"
date: 2026-07-03
categories: "css"
description: "系统掌握 CSS Grid 布局的完整知识体系，从容器属性到项目属性，从基础网格到复杂响应式布局实战"
tags: ["css"]
copyright: true
---

## 前言

CSS Grid 是浏览器原生提供的最强大的二维布局系统。它比 Flexbox 更适合**同时处理行和列**的复杂布局。

如果你还在用 `float` + `clearfix` 或者计算百分比宽度，是时候拥抱 Grid 了。

---

## 一、Grid  vs  Flexbox

| 特性 | Grid | Flexbox |
|------|------|---------|
| 维度 | 二维（行+列） | 一维（行 OR 列） |
| 适用场景 | 页面级布局、卡片网格 | 组件内部排列、导航栏 |
| 对齐方式 | 容器级别 + 项目级别 | 同上 |
| 重叠支持 | ✅ 支持网格区域重叠 | ❌ 不支持 |

**一句话：** 布局用 Grid，组件用 Flexbox。

---

## 二、容器属性

### 2.1 基础定义

```css
.grid-container {
  display: grid;
  /* 或者 inline-grid */
}
```

### 2.2 grid-template-columns / rows

```css
/* 固定宽度 */
grid-template-columns: 200px 200px 200px;

/* fr —— 弹性单位 */
grid-template-columns: 1fr 2fr 1fr;

/* repeat() 函数 */
grid-template-columns: repeat(3, 1fr);

/* auto 与 min-content/max-content */
grid-template-columns: auto minmax(200px, 1fr) max-content;
```

### 2.3 minmax() —— 响应式的核心

```css
/* 列宽至少 250px，尽可能均分剩余空间 */
grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
```

这是**最常用的响应式 Grid 模式** —— 无需媒体查询！

### 2.4 gap 间距

```css
gap: 20px;           /* 行+列 */
row-gap: 10px;
column-gap: 20px;
```

### 2.5 grid-auto-rows —— 隐式网格

当项目数量超出显式定义的行数时，用 `grid-auto-rows` 控制自动生成的行的尺寸：

```css
grid-auto-rows: minmax(120px, auto);
```

---

## 三、项目属性

### 3.1 定位项目

```css
.grid-item {
  grid-column: 1 / 3;     /* 从第 1 列线到第 3 列线 */
  grid-row: 1 / span 2;   /* 从第 1 行开始，跨越 2 行 */
}
```

### 3.2 grid-area —— 命名区域

```css
.grid-container {
  grid-template-areas:
    "header  header  header"
    "sidebar content content"
    "footer  footer  footer";
}

.header  { grid-area: header;  }
.sidebar { grid-area: sidebar; }
.content { grid-area: content; }
.footer  { grid-area: footer;  }
```

**命名区域布局**让布局意图一目了然。

---

## 四、对齐方式

```css
/* 容器级别 —— 行轴对齐 */
justify-items: start | end | center | stretch;

/* 容器级别 —— 列轴对齐 */
align-items: start | end | center | stretch;

/* 容器级别 —— 剩余空间分布 */
justify-content: start | center | space-between | space-around | space-evenly;
align-content: start | center | space-between | space-around | space-evenly;

/* 项目级别 */
justify-self: start | end | center | stretch;
align-self: start | end | center | stretch;
```

---

## 五、高级实战模式

### 5.1 Holy Grail 圣杯布局

```css
.layout {
  display: grid;
  grid-template:
    "header  header  header" 60px
    "sidebar content aside"  1fr
    "footer  footer  footer" 40px
    / 200px 1fr 200px;
  min-height: 100vh;
}
```

### 5.2 自适应卡片网格

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}
```

当屏幕变窄时，列数自动减少，无需任何媒体查询。

### 5.3 瀑布流（Masonry）布局

CSS Grid 原生支持 `masonry`（Firefox 已实现）：

```css
.masonry {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: masonry;
}
```

对其他浏览器，可配合 `order` 或使用第三方库。

---

## 六、子网格（subgrid）

```css
.parent-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.child-grid {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid; /* 继承父网格的列定义 */
}
```

`subgrid` 让嵌套网格的列与父网格对齐，解决"嵌套组件的对齐难题"。

---

## 七、最佳实践

1. **`auto-fill` vs `auto-fit`**
   - `auto-fill`：即使项目为空，也保留空列
   - `auto-fit`：空列被折叠，项目拉伸填充

2. **有无媒体查询？**
   - 使用 `minmax() + auto-fill` 可实现 80% 的响应式需求
   - 复杂的断点变化仍需媒体查询

3. **Grid 与 Flexbox 配合**
   - 页面骨架用 Grid
   - 每个网格单元内部的元素排列用 Flexbox

---

## 八、总结

CSS Grid 是真正意义上的"给 CSS 带来了布局能力"。熟练掌握 `grid-template`、`minmax`、`auto-fill` 和 `grid-area`，就能应对绝大多数布局场景。
