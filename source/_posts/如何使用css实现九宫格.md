---
title: "CSS 布局实战：Grid 网格与 calc 计算"
date: 2021-06-21 15:36:00
updated: 2025-06-23
categories: "CSS"
description: "从九宫格案例入手，掌握 CSS Grid 网格布局与 calc() 函数的实战用法，含响应式网格、nth-child 选择器技巧"
tags: "CSS"
copyright: true
---

## 前言

在 CSS 中实现网格布局，过去需要各种 hack。如今 CSS Grid 已经全面普及，配合 `calc()` 函数和 `:nth-child` 选择器，可以写出优雅、可维护的网格布局。

---

## 一、经典九宫格：calc + nth-child

在没有 Grid 之前，使用 Flexbox + `calc()` 实现网格：

```css
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.item {
  width: calc((100% - 20px) / 3); /* 3 列，间距 10px，总间距 20px */
  aspect-ratio: 1;                 /* 正方形 */
  background: #f0f0f0;
}
```

### 1.1 理解 calc()

```css
/* 公式解析：3 列布局 */
width: calc((100% - 20px) / 3);
/*        总宽度 - 间距总和       */
/*        20px = 10px × 2 (3 列有 2 个间隙) */
```

### 1.2 nth-child 清除多余间距

当使用 `gap` 无法完美工作的情况，可以用 `:nth-child` 处理边界：

```css
.item { margin-right: 10px; }

/* 每行第 3 个清除右边距 */
.item:nth-child(3n) { margin-right: 0; }

/* 最后 3 个清除下边距 */
.item:nth-last-child(-n+3) { margin-bottom: 0; }
```

**常用 nth-child 模式：**

| 选择器 | 含义 |
|--------|------|
| `:nth-child(3n)` | 第 3/6/9... 个 |
| `:nth-child(3n+1)` | 第 1/4/7... 个（每行第一个） |
| `:nth-child(odd)` | 奇数个 |
| `:nth-child(even)` | 偶数个 |
| `:nth-last-child(-n+3)` | 最后 3 个 |

---

## 二、CSS Grid 网格布局（现代方案）

### 2.1 3×3 九宫格

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);  /* 3 等分 */
  gap: 10px;                                /* 行列间距 */
}

.item {
  aspect-ratio: 1;  /* 正方形 */
}
```

**为什么 Grid 更好？**

| 方案 | 代码量 | 可读性 | 响应式 |
|------|--------|--------|--------|
| Flexbox + calc | 较多 | 一般 | 手动 |
| **Grid** | **少** | **高** | **自动** |

### 2.2 响应式网格

Grid 自动根据容器宽度调整列数，无需媒体查询：

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.item {
  aspect-ratio: 1;
}
```

**`auto-fill` + `minmax` 原理：**
- 每列最少 200px
- 能放几列放几列
- 剩余空间平分给各列

### 2.3 固定列数 + 响应式

```css
.grid {
  display: grid;
  gap: 16px;
}

/* 移动端：2 列 */
.grid { grid-template-columns: repeat(2, 1fr); }

/* 平板：3 列 */
@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}

/* 桌面：4 列 */
@media (min-width: 1024px) {
  .grid { grid-template-columns: repeat(4, 1fr); }
}
```

---

## 三、Grid 进阶实战

### 3.1 不等高网格（Masonry 变体）

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.item:first-child {
  grid-row: span 2;  /* 第一个项目占 2 行 */
}
```

### 3.2 命名区域布局

```css
.layout {
  display: grid;
  grid-template-areas:
    "header  header  header"
    "sidebar content content"
    "footer  footer  footer";
  grid-template-columns: 200px 1fr 1fr;
  grid-template-rows: 60px 1fr 40px;
  gap: 16px;
  min-height: 100vh;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.content { grid-area: content; }
.footer  { grid-area: footer; }
```

### 3.3 使用 calc 控制网格项

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* 第一项占 2 列，配合 calc 做精确计算 */
.item-featured {
  grid-column: span 2;
  /* 或者精确计算宽度 */
  width: calc(calc(100% / 3 * 2) + 8px);
}
```

---

## 四、Flexbox 网格 vs Grid 网格

| 特性 | Flexbox 网格 | Grid 网格 |
|------|------------|-----------|
| **维度** | 一维（行或列） | **二维（行列同时）** |
| **对齐控制** | 强 | 更强（行列单独控制）|
| **列数固定** | 需要 calc | **原生支持** |
| **响应式** | 手动 calc | **auto-fill + minmax** |
| **网格区域** | ❌ | ✅ 命名区域 |
| **间距 gap** | ✅ 支持 | ✅ 支持 |
| **浏览器支持** | 全面 | 全面 |

**一句话选型：**

```
1-2 行数据 → Flexbox（更简单）
多行多列 → Grid（更强大）
```

---

## 五、实际项目案例

### 5.1 商品列表网格

```css
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 20px;
}

.product-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.product-card img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
}

.product-card__info {
  padding: 16px;
}
```

### 5.2 个人主页卡片布局

```css
.profile-grid {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto auto;
  gap: 24px;
  grid-template-areas:
    "avatar info"
    "avatar stats";
}

.avatar { grid-area: avatar; }
.info   { grid-area: info; }
.stats  { grid-area: stats; }

/* 移动端堆叠 */
@media (max-width: 767px) {
  .profile-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "avatar"
      "info"
      "stats";
  }
}
```

---

## 总结

| 技术 | 适用场景 |
|------|---------|
| **calc()** | 需要精确计算的任何布局 |
| **nth-child** | 选择特定位置的元素 |
| **Flexbox** | 一维网格、水平居中、等分 |
| **Grid** | 二维网格、响应式网格、复杂布局 |

**推荐阅读：**
- [MDN: CSS Grid Layout](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Grid_Layout)
- [Grid Garden](https://cssgridgarden.com/)（游戏式学习）
- [CSS Grid vs Flexbox](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Grid_Layout/Relationship_of_Grid_Layout)
