---
title: "Sass/SCSS 完全指南：从嵌套到工程化"
date: 2023-02-01 04:36:00
updated: 2026-06-23
categories: "CSS"
description: "系统掌握 Sass/SCSS 的核心功能——嵌套、变量、混入、继承、函数，以及如何在实际项目中工程化使用"
tags: "CSS"
copyright: true
---

## 前言

Sass（Syntactically Awesome Style Sheets）是目前使用最广泛的 CSS 预处理器。它的核心价值在于：**变量、嵌套、混入、继承**——让 CSS 从"声明式"走向"可编程"。

SCSS 是 Sass 的现代语法（CSS 超集，完全兼容 CSS），推荐使用。

---

## 一、嵌套

### 1.1 基本嵌套

```scss
// SCSS
.nav {
  background: #333;

  ul {
    display: flex;
    list-style: none;
  }

  li {
    margin: 0 10px;
  }

  a {
    color: white;
    text-decoration: none;
  }
}
```

```css
/* 编译后的 CSS */
.nav { background: #333; }
.nav ul { display: flex; list-style: none; }
.nav li { margin: 0 10px; }
.nav a { color: white; text-decoration: none; }
```

### 1.2 &——父选择器引用

```scss
.btn {
  padding: 8px 16px;

  // & 表示父选择器（.btn）
  &:hover { background: darkblue; }
  &--primary { background: blue; }
  &__icon { margin-right: 4px; }

  // 结合伪类
  &:disabled { opacity: 0.5; cursor: not-allowed; }

  // 父选择器也可以用在后面
  .theme-dark & { background: #333; }
}
```

```css
.btn:hover { background: darkblue; }
.btn--primary { background: blue; }
.btn__icon { margin-right: 4px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.theme-dark .btn { background: #333; }
```

---

## 二、变量

```scss
// 定义变量
$primary-color: #1890ff;
$font-size-base: 14px;
$spacing-unit: 8px;
$border-radius: 4px;
$font-family: -apple-system, BlinkMacSystemFont, sans-serif;

// 使用变量
.card {
  color: $primary-color;
  font-size: $font-size-base;
  padding: $spacing-unit * 2;
  border-radius: $border-radius;
  font-family: $font-family;
}

// 变量作用域
$color: red;

.box {
  $color: blue;   // 局部变量（只在这个块内生效）
  color: $color;  // blue
}

.footer {
  color: $color;  // red（仍是全局值）
}
```

**CSS 变量 vs Sass 变量：**

| 特性 | Sass 变量 | CSS 变量 |
|------|----------|----------|
| **编译时机** | 编译时 | **运行时** |
| **动态修改** | ❌ 编译后固定 | ✅ 可 JS/媒体查询修改 |
| **作用域** | 嵌套作用域 | DOM 继承 |
| **主题切换** | ❌ 需重新编译 | ✅ 一行 JS 切换 |

```scss
// Sass 变量适合：设计令牌、不需要动态修改的值
// CSS 变量适合：需要运行时切换（主题色）
:root {
  --primary: #{$primary-color}; // Sass 变量注入 CSS 变量
}
```

---

## 三、混入（Mixin）

### 3.1 无参数混入

```scss
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.header { @include flex-center; }
.footer { @include flex-center; }
```

### 3.2 带参数混入

```scss
@mixin size($w, $h: $w) {  // 默认值为 $w（正方形）
  width: $w;
  height: $h;
}

.avatar { @include size(40px); }       // 正方形
.banner { @include size(100%, 200px); } // 矩形

@mixin text-ellipsis($lines: 1) {
  @if $lines == 1 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.title { @include text-ellipsis; }      // 单行省略
.desc  { @include text-ellipsis(3); }   // 3 行省略
```

### 3.3 混入 vs 继承

| 特性 | @mixin | @extend |
|------|--------|---------|
| **输出** | 复制样式到每个选择器 | **合并选择器**（分组） |
| **参数** | ✅ 支持 | ❌ 不支持 |
| **体积** | 可能产生重复代码 | 更精简 |

```scss
// @mixin（复制样式）
@mixin btn-base {
  padding: 8px 16px;
  border-radius: 4px;
}
.btn-primary { @include btn-base; }
.btn-danger  { @include btn-base; }
// 输出：两个选择器各有一份

// @extend（合并选择器）
%btn-base { padding: 8px 16px; border-radius: 4px; }
.btn-primary { @extend %btn-base; }
.btn-danger  { @extend %btn-base; }
// 输出：.btn-primary, .btn-danger { padding... }
```

**建议：** 有参数用 `@mixin`，无参数且多处用用 `@extend`。

---

## 四、继承（@extend）

```scss
// 占位符选择器（%开头，不会编译到 CSS 中）
%card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.post-card {
  @extend %card;
  padding: 16px;
}

.user-card {
  @extend %card;
  padding: 24px;
}
```

```css
.post-card, .user-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.post-card { padding: 16px; }
.user-card { padding: 24px; }
```

---

## 五、运算与函数

### 5.1 运算

```scss
.container {
  width: 100% - 40px;        // 减法
  padding: 8px * 2;          // 乘法
  font-size: 14px / 1.5;     // 注意：除法需加括号
  line-height: (14px * 1.5);
}

// 颜色运算
$base: #1890ff;
.dark  { color: darken($base, 10%); }
.light { color: lighten($base, 20%); }
```

### 5.2 内置函数

```scss
// 颜色
darken($color, 10%)     // 变暗
lighten($color, 20%)    // 变亮
rgba($color, 0.5)       // 半透明
mix($color1, $color2)   // 混合颜色

// 数值
round(3.5)    // 4
ceil(3.1)     // 4
floor(3.9)    // 3
min(100px, 200px)  // 100px
max(100px, 200px)  // 200px

// 字符串
unquote('string')     // 去掉引号
quote(string)         // 加引号
to-upper-case('abc')  // 'ABC'
```

### 5.3 自定义函数

```scss
@function px-to-rem($px, $base: 16px) {
  @return ($px / $base) * 1rem;
}

.title { font-size: px-to-rem(24px); }  // 1.5rem
.body  { font-size: px-to-rem(14px); }  // 0.875rem
```

---

## 六、模块化（@use）

Sass 从 `@import` 迁移到 `@use`，避免全局命名冲突：

```scss
// _variables.scss（带下划线表示"部分文件"，不会被单独编译）
$primary: #1890ff;
$danger: #ff4d4f;

// _mixins.scss
@use 'variables' as *;

@mixin btn($color) {
  background: $color;
  border: none;
  border-radius: 4px;
}

// main.scss
@use 'variables';
@use 'mixins';

.btn-primary {
  @include mixins.btn(variables.$primary);
}
```

**`@use` vs `@import`：**
- `@use` 创建命名空间（如 `variables.$primary`）
- `@use` 只加载一次，不会重复
- `@import` 已废弃，不推荐使用

---

## 七、工程化配置

### Vite

```javascript
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        // 自动注入全局变量和混入
        additionalData: `
          @use "@/styles/variables" as *;
          @use "@/styles/mixins" as *;
        `,
      },
    },
  },
})
```

### 目录结构

```
src/
  styles/
    _variables.scss    // 变量
    _mixins.scss       // 混入
    _reset.scss        // 重置样式
    global.scss        // 全局样式（入口）
  pages/
    home.scss          // 页面样式
```

---

## 总结

```scss
// Sass 核心功能速记：
// $var     → 变量
// &        → 父选择器引用
// @mixin   → 混入（有参数）
// @extend  → 继承（无参数）
// @use     → 模块化
// @function→ 自定义函数
// 运算     → + - * / 颜色运算
```

**推荐阅读：**
- [Sass 官方文档](https://sass-lang.com/documentation)
- [Sass Guidelines](https://sass-guidelin.es/)
