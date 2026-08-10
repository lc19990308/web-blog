---
title: "Flexbox 布局完全指南：从入门到实战"
date: 2021-06-21 15:36:00
updated: 2025-06-23
categories: "CSS"
description: "系统掌握 Flexbox 布局的全部属性（容器 6 个 + 项目 4 个），含常用布局模式速查表与实战案例"
tags: "CSS"
copyright: true
---

## 前言

Flexbox 是 CSS 中最强大的布局方案之一，专为一维布局（行或列）设计。相比传统的 float 布局，Flexbox 让居中、等分、自适应变得轻而易举。

---

## 一、核心概念

Flexbox 由**容器（flex container）**和**项目（flex item）**组成：

```css
.container {
  display: flex;  /* 开启 Flexbox */
}
```

**两条轴：**

```
         主 轴（main axis）
    ───────────────────────────►
┌───┬───┬───┬───┬───┬───┬───┬───┐
│   │   │   │   │   │   │   │   │  ↑
│   │   │   │   │   │   │   │   │  │
│   │   │   │   │   │   │   │   │ 交
│   │   │   │   │   │   │   │   │ 叉
│   │   │   │   │   │   │   │   │ 轴
│   │   │   │   │   │   │   │   │  │
│   │   │   │   │   │   │   │   │  │
└───┴───┴───┴───┴───┴───┴───┴───┘  ↓
```

---

## 二、容器属性（6 个）

### 2.1 flex-direction——主轴方向

```css
.container {
  flex-direction: row;            /* 默认：水平方向，从左到右 */
  flex-direction: row-reverse;    /* 水平方向，从右到左 */
  flex-direction: column;         /* 垂直方向，从上到下 */
  flex-direction: column-reverse; /* 垂直方向，从下到上 */
}
```

### 2.2 justify-content——主轴对齐

```css
.container {
  justify-content: flex-start;    /* 默认：左对齐 */
  justify-content: flex-end;      /* 右对齐 */
  justify-content: center;        /* 居中 */
  justify-content: space-between; /* 两端对齐，项目之间间距相等 */
  justify-content: space-around;  /* 每个项目两侧间距相等 */
  justify-content: space-evenly;  /* 项目之间间距完全相等 */
}
```

### 2.3 align-items——交叉轴对齐

```css
.container {
  align-items: stretch;    /* 默认：拉伸填满 */
  align-items: flex-start; /* 顶部对齐 */
  align-items: flex-end;   /* 底部对齐 */
  align-items: center;     /* 垂直居中 */
  align-items: baseline;   /* 文字基线对齐 */
}
```

### 2.4 flex-wrap——换行

```css
.container {
  flex-wrap: nowrap;       /* 默认：不换行（项目可能被压缩） */
  flex-wrap: wrap;         /* 换行 */
  flex-wrap: wrap-reverse; /* 反向换行 */
}
```

### 2.5 align-content——多行对齐

当有多行时（`flex-wrap: wrap`），控制行在交叉轴上的对齐：

```css
.container {
  align-content: stretch;       /* 默认 */
  align-content: flex-start;    /* 顶部对齐 */
  align-content: flex-end;      /* 底部对齐 */
  align-content: center;        /* 居中 */
  align-content: space-between;
  align-content: space-around;
}
```

### 2.6 gap——项目间距

```css
.container {
  gap: 16px;          /* 行列间距统一 16px */
  row-gap: 16px;      /* 行间距 */
  column-gap: 16px;   /* 列间距 */
}
```

---

## 三、项目属性（4 个）

### 3.1 flex-grow——放大比例

```css
.item {
  flex-grow: 0;           /* 默认：不放大 */
  flex-grow: 1;           /* 按比例分配剩余空间 */
}

/* 示例：实现"两边固定，中间自适应" */
.left  { flex-grow: 0; width: 200px; }   /* 固定宽度 */
.middle { flex-grow: 1; }                 /* 占满剩余空间 */
.right { flex-grow: 0; width: 200px; }   /* 固定宽度 */
```

### 3.2 flex-shrink——缩小比例

空间不足时是否缩小：

```css
.item {
  flex-shrink: 1;  /* 默认：空间不足时缩小 */
  flex-shrink: 0;  /* 空间不足时不缩小 */
}

/* 示例：logo 图标不缩小，文字可缩小 */
.logo  { flex-shrink: 0; }
.title { flex-shrink: 1; }
```

### 3.3 flex-basis——初始大小

```css
.item {
  flex-basis: auto;     /* 默认：项目原本大小 */
  flex-basis: 200px;    /* 主轴上初始 200px */
  flex-basis: 50%;      /* 占据容器 50% */
}
```

**flex 缩写：**

```css
.item {
  flex: 1;              /* flex: 1 1 0% （最常用：等分） */
  flex: 0 0 auto;       /* flex: none （不放大不缩小） */
  flex: 1 0 200px;      /* flex-grow: 1, flex-shrink: 0, flex-basis: 200px */
}
```

### 3.4 align-self——覆盖对齐

覆盖容器 `align-items` 设置，只对当前项目生效：

```css
.container { align-items: center; }   /* 所有项目垂直居中 */

.item-special {
  align-self: flex-end;   /* 这个项目底部对齐，覆盖设置 */
}
```

### 3.5 order——排序

```css
.item { order: 0; }  /* 默认：0，数值越小越靠前 */

/* 示例：移动端将导航放到顶部 */
.nav { order: -1; }    /* 最前面 */
.main { order: 0; }    /* 中间 */
.footer { order: 1; }  /* 最后面 */
```

---

## 四、属性速查表

### 容器属性

| 属性 | 作用 | 常用值 |
|------|------|--------|
| `display` | 开启 flex | `flex` / `inline-flex` |
| `flex-direction` | 主轴方向 | `row` / `column` |
| `flex-wrap` | 换行 | `nowrap` / `wrap` |
| `justify-content` | 主轴对齐 | `center` / `space-between` |
| `align-items` | 交叉轴对齐 | `center` / `stretch` |
| `align-content` | 多行对齐 | `center` / `space-between` |
| `gap` | 间距 | `16px` |

### 项目属性

| 属性 | 作用 | 常用值 |
|------|------|--------|
| `flex` | 缩写 | `1` / `none` |
| `flex-grow` | 放大比例 | `0` / `1` |
| `flex-shrink` | 缩小比例 | `0` / `1` |
| `flex-basis` | 初始大小 | `auto` / `200px` |
| `align-self` | 单独对齐 | `center` / `flex-end` |
| `order` | 排序 | `0` / `-1` / `1` |

---

## 五、常用布局模式

### 5.1 水平居中

```css
.center-x {
  display: flex;
  justify-content: center;
}
```

### 5.2 垂直居中

```css
.center-y {
  display: flex;
  align-items: center;
}
```

### 5.3 完全居中

```css
.center-all {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### 5.4 等分布局

```css
.equal {
  display: flex;
  gap: 16px;
}
.equal-item { flex: 1; }  /* 每个项目宽度相等 */
```

### 5.5 圣杯布局

```css
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.header, .footer { flex: 0 0 auto; }
.main { flex: 1; }  /* 撑满剩余空间 */
```

### 5.6 两栏自适应

```css
.sidebar-layout {
  display: flex;
  gap: 24px;
}
.sidebar { width: 240px; flex-shrink: 0; }
.content { flex: 1; }
```

### 5.7 底部固定

```css
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.content { flex: 1; }   /* 内容撑满，把 footer 推到最下 */
.footer { flex: 0 0 auto; }
```

---

## 六、Flexbox vs Grid 选型

| 场景 | 推荐 | 理由 |
|------|------|------|
| 导航栏、菜单 | **Flexbox** | 一维布局，对齐方便 |
| 水平居中、垂直居中 | **Flexbox** | 一行代码搞定 |
| 等分布局 | **Flexbox** | `flex: 1` 简洁 |
| 整体页面布局 | **Grid** | 二维布局更强大 |
| 复杂网格 | **Grid** | `grid-template-areas` 语义化 |
| 卡片网格 | **Grid** | `auto-fill` + `minmax` 自适应 |

---

## 总结

```css
/* Flexbox 的三个核心口诀 */

/* 1. 开启 flex 布局 */
.container { display: flex; }

/* 2. 容器决定主轴方向和排列 */
flex-direction  → 主轴方向
justify-content → 主轴对齐
align-items     → 交叉轴对齐

/* 3. 项目决定自身伸缩 */
flex  → 等分、自适应
order → 排序
```

**推荐阅读：**
- [MDN: Flexbox](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Flexible_Box_Layout)
- [Flexbox Froggy](https://flexboxfroggy.com/)（游戏式学习）
