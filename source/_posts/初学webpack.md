---
title: "前端模块打包工具：从 Webpack 到 Vite"
date: 2022-12-06 09:50:00
updated: 2026-06-23
categories: "JavaScript"
description: "理解前端打包工具的核心概念（入口/输出/Loader/Plugin），对比 Webpack 与 Vite 的差异，掌握常见配置写法"
tags: "Webpack"
copyright: true
---

## 前言

浏览器不支持模块化（`import`/`export`），也不支持 TypeScript、Sass 等语法。打包工具的作用就是将开发者友好的代码**转换**为浏览器可运行的格式。

---

## 一、核心概念

### 1.1 Webpack 五大核心

```javascript
// webpack.config.js
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  // 1. 入口：打包从哪开始
  entry: './src/index.js',

  // 2. 输出：打包结果放哪
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash:8].js',
    clean: true,  // 每次打包清空 dist
  },

  // 3. Loader：处理非 JS 文件
  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.(png|jpg)$/, type: 'asset' },
    ],
  },

  // 4. Plugin：做 Loader 做不到的事
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' }),
  ],

  // 5. Mode：开发/生产模式
  mode: 'development', // development | production
}
```

| 核心概念 | 作用 | 类比 |
|---------|------|------|
| **Entry** | 入口文件 | 你的源代码 |
| **Output** | 打包结果 | 给浏览器的代码 |
| **Loader** | 转换非 JS 文件 | 翻译官 |
| **Plugin** | 增强功能 | 插件工具 |
| **Mode** | 环境区分 | 开发/生产 |

### 1.2 常用 Loader

```bash
npm install -D css-loader style-loader   # CSS 处理
npm install -D sass-loader sass          # Sass 处理
npm install -D babel-loader @babel/core  # JS 兼容转换
npm install -D ts-loader typescript      # TypeScript 处理
```

| Loader | 作用 |
|--------|------|
| `babel-loader` | ES6+ → ES5（兼容旧浏览器）|
| `css-loader` | 解析 CSS 中的 `@import`/`url()` |
| `style-loader` | CSS 注入到 `<style>` 标签 |
| `sass-loader` | Sass/SCSS → CSS |
| `ts-loader` | TypeScript → JavaScript |

### 1.3 常用 Plugin

```javascript
plugins: [
  // 生成 HTML（自动引入打包后的 JS）
  new HtmlWebpackPlugin({ template: './public/index.html' }),

  // 提取 CSS 到单独文件
  new MiniCssExtractPlugin({ filename: 'styles.[contenthash].css' }),

  // 打包进度条
  new ProgressPlugin(),
]
```

---

## 二、开发体验优化

### 2.1 开发服务器

```javascript
module.exports = {
  devServer: {
    port: 3000,
    hot: true,          // 热更新
    open: true,         // 自动打开浏览器
    proxy: {            // 代理 API 请求
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
}
```

### 2.2 Source Map

```javascript
module.exports = {
  devtool: 'eval-cheap-module-source-map',  // 开发环境
  // 生产环境：false 或 'source-map'
}
```

Source Map 让浏览器能显示**源代码**的位置而非打包后的位置，方便调试。

---

## 三、生产优化

### 3.1 代码分割

```javascript
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {                    // 第三方库单独打包
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
}
```

### 3.2 动态导入

```javascript
// 按需加载，对应路由才加载对应代码
const About = () => import('./views/About.vue')

// Webpack 会自动分割为单独文件
```

### 3.3 压缩

```javascript
// production mode 下自动开启：
// - JavaScript 压缩（TerserPlugin）
// - CSS 压缩（CssMinimizerPlugin）
// - Tree Shaking（移除未使用的代码）
```

---

## 四、Webpack vs Vite

### 4.1 核心差异

| 特性 | Webpack | Vite |
|------|---------|------|
| **开发启动** | **慢**（需分析整个依赖图） | **极快**（按需编译） |
| **热更新** | 慢（文件多时 >1s） | **极快**（ESM 直送） |
| **构建** | Rollup 打包（较慢） | **Rollup 打包**（更快）|
| **配置** | **复杂** | 简单 |
| **生态** | 丰富，插件多 | 丰富，兼容 Rollup 插件 |
| **最佳场景** | 复杂大型项目 | **新项目首选** |

### 4.2 Vite 配置示例

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: { '/api': 'http://localhost:8080' },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router'],
        },
      },
    },
  },
})
```

---

## 五、Webpack 配置速查

```javascript
// 完整的 Webpack 配置模板
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production'

  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
      clean: true,
    },
    devtool: isProd ? false : 'eval-cheap-module-source-map',
    module: {
      rules: [
        { test: /\.js$/, exclude: /node_modules/, use: 'babel-loader' },
        { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
        { test: /\.(png|jpg|gif)$/, type: 'asset', parser: { dataUrlCondition: { maxSize: 8 * 1024 } } },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({ template: './public/index.html' }),
      new MiniCssExtractPlugin({ filename: 'css/[name].[contenthash:8].css' }),
    ],
    devServer: { port: 3000, hot: true, historyApiFallback: true },
    resolve: { extensions: ['.js', '.vue', '.json'] },
  }
}
```

---

## 总结

```javascript
// 选型建议
├─ 新项目 → Vite（更快、更简单）
├─ 老项目维护 → Webpack（保持）
├─ 复杂构建 → Webpack（插件生态更丰富）
└─ 库/组件 → Rollup（更纯粹的打包）
```

**推荐阅读：**
- [Webpack 官方文档](https://webpack.js.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Webpack 配置参考](https://webpack.js.org/configuration/)
