---
title: "TypeScript 工程化：tsconfig 配置、声明文件与项目实战"
date: 2026-06-25
categories: "TypeScript"
description: "TypeScript 项目从配置到部署的完整工程化实践，涵盖 tsconfig 各字段详解、声明文件（.d.ts）编写、Monorepo 集成与构建部署"
tags: ["TypeScript", "工程化"]
copyright: true
---

## 前言

掌握 TypeScript 语法只是第一步。在真实项目中，还需要解决：

- tsconfig.json 每个字段到底怎么配？
- 第三方库没有类型怎么办？
- 如何给 JS 项目添加类型？
- Monorepo 中多包 TypeScript 怎么管理？
- 构建产物是否包含类型？

本文从工程化角度，覆盖 TypeScript 项目的完整生命周期。

---

## 一、tsconfig.json 深入

### 1.1 严格模式

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

`strict: true` 一次性开启了以下所有严格检查：

| 配置项 | 作用 |
|--------|------|
| `strictNullChecks` | null/undefined 不能赋值给其他类型 |
| `strictFunctionTypes` | 函数参数逆变检查 |
| `strictBindCallApply` | bind/call/apply 的类型安全 |
| `strictPropertyInitialization` | 类属性必须初始化 |
| `noImplicitAny` | 不允许隐式 any |
| `noImplicitThis` | 不允许 this 隐式 any |
| `alwaysStrict` | 自动添加 "use strict" |

### 1.2 模块解析策略

```json
{
  "compilerOptions": {
    "module": "ESNext",         // 输出 ESM 格式
    "moduleResolution": "bundler", // Node16 / bundler / classic
    "moduleDetection": "force", // 所有文件都是模块
  }
}
```

**moduleResolution 选型**：

| 选项 | 适用场景 |
|------|---------|
| `node` | Node.js CommonJS 项目 |
| `node16` / `nodenext` | Node.js 支持 ESM + CJS |
| `bundler` | Vite / Webpack / Rollup 等打包工具（推荐） |
| `classic` | 遗留项目 |

**推荐 `bundler`** —— 支持 imports 无扩展名、`exports` 字段、`types` 字段。

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

### 1.3 path 别名配置

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

```javascript
// 配合 Vite
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
}
```

### 1.4 target / lib

```json
{
  "compilerOptions": {
    "target": "ES2020",          // 输出 JS 语法版本
    "lib": ["ES2020", "DOM", "DOM.Iterable"],  // 环境类型声明
    "skipLibCheck": true,        // 跳过 node_modules 类型检查
    "useDefineForClassFields": true // 使用 ES 类字段标准
  }
}
```

**常见 target 选择**：

| target | 支持 | 建议 |
|--------|------|------|
| `ES5` | 全部浏览器 | 除非要兼容 IE |
| `ES2015` | 现代浏览器 | 不再推荐 |
| `ES2020` | Chrome 80+ | ✅ 推荐 |
| `ESNext` | 最新 | 搭配 bundler 时可用 |

### 1.5 完整推荐配置

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.vue", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 二、声明文件（.d.ts）

### 2.1 全局类型声明

```typescript
// env.d.ts — 补充环境变量类型
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 声明全局变量
declare const __APP_VERSION__: string
declare const __BUILD_TIME__: string
```

### 2.2 模块类型声明

```typescript
// 为无类型的第三方库补充声明
declare module 'legacy-lib' {
  export function doSomething(config: Record<string, any>): void
  export const VERSION: string
}

// 为 JSON 模块声明
declare module '*.json' {
  const value: any
  export default value
}
```

### 2.3 命名空间（Namespace）

```typescript
// 声明全局命名空间
declare namespace MyApp {
  interface User {
    id: number
    name: string
  }

  namespace Config {
    const API_URL: string
    const TIMEOUT: number
  }
}

// 使用
const user: MyApp.User = { id: 1, name: 'LC' }
console.log(MyApp.Config.API_URL)
```

### 2.4 为 JS 库编写 .d.ts

```typescript
// my-lib.d.ts
export interface Options {
  theme?: 'light' | 'dark'
  size?: 'small' | 'medium' | 'large'
}

export function createWidget(element: HTMLElement, options?: Options): {
  update(options: Partial<Options>): void
  destroy(): void
}

// 默认导出
declare const myLib: {
  version: string
  init(): void
}
export default myLib
```

---

## 三、Monorepo TypeScript 管理

### 3.1 项目引用（Project References）

```json
// root/tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/utils" },
    { "path": "./packages/components" },
    { "path": "./apps/web" }
  ]
}
```

```json
// packages/core/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,           // 支持引用
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src"]
}
```

**优势**：
- 增量编译（只编译变更的包）
- 类型检查隔离
- 构建速度快

### 3.2 共享基础配置

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  }
}
```

各包继承后只需覆盖差异部分：

```json
// packages/components/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src"]
}
```

---

## 四、类型检查与构建

### 4.1 双模式构建

很多项目需要**类型检查**和**构建**分开执行：

```json
// package.json
{
  "scripts": {
    "type-check": "tsc --noEmit",          // 仅类型检查
    "build:types": "tsc --emitDeclarationOnly", // 仅生成 .d.ts
    "build:js": "vite build",              // 构建 JS
    "build": "npm run type-check && vite build"  // 完整构建
  }
}
```

### 4.2 生成类型文件

```bash
# 生成 .d.ts 文件
vue-tsc --declaration --emitDeclarationOnly

# 或
tsc --declaration --outDir dist/types
```

```json
// package.json（输出类型给外部使用）
{
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

### 4.3 诊断与 lint

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.vue",
    "type": "tsc --noEmit",
    "check": "npm run type && npm run lint"
  }
}
```

```yaml
# .github/workflows/check.yml
- run: npm ci
- run: npm run check
```

---

## 五、JS 项目迁移到 TypeScript

### 5.1 渐进迁移策略

```json
{
  "compilerOptions": {
    "allowJs": true,         // 允许 .js 文件共存
    "checkJs": false,        // 先不检查 JS 文件
    "noEmit": true,          // 由打包工具构建
  }
}
```

### 5.2 分阶段迁移

```
阶段1：tsconfig 配置 + allowJs
阶段2：文件重命名 .js → .ts（从底层依赖开始）
阶段3：开启 strict 模式，修复类型错误
阶段4：删除 allowJs，全量 TS
```

**推荐顺序**：

```
先迁移：纯工具函数、API 层、类型定义
后迁移：组件文件、页面文件
```

### 5.3 JSDoc 注解过渡

```typescript
// 不想重命名文件时，可以用 JSDoc 慢慢加类型
/** @type {import('./types').User} */
const user = { id: 1, name: 'LC' }

/** @param {string} name @returns {Promise<import('./types').User>} */
async function fetchUser(name) {
  return await api.get(`/users/${name}`)
}
```

---

## 六、常见问题

### 6.1 动态导入的类型

```typescript
// ❌ 动态 import() 的类型需要额外处理
const module = await import('./lang-zh.js')
module.greeting // any

// ✅ const 断言
const lang = {
  greeting: '你好',
  farewell: '再见',
} as const

export type LangType = typeof lang
```

### 6.2 泛型组件

```vue
<script setup lang="ts">
// Vue 泛型组件（3.3+）
defineProps<{
  items: T[]
  renderItem: (item: T) => any
}>()
</script>
```

### 6.3 tsconfig 冲突

```bash
# 两个 tsconfig 同时作用时，后加载的覆盖前者
# 用 "extends" 继承，不要复制粘贴配置

# VSCode 中的 tsconfig 选择
# 在状态栏点击 TypeScript 版本 → 切换 tsconfig
```

### 6.4 类型导入优化

```typescript
// TS 5.0+ 支持 type-only imports
import type { User } from './types'

// 或内联 type
import { type User, type Config } from './types'
```

---

## 七、项目模板

### 推荐的最小化 Vite + Vue + TS 项目结构

```
my-app/
├── src/
│   ├── types/
│   │   ├── api.d.ts           # API 响应类型
│   │   ├── global.d.ts        # 全局类型声明
│   │   └── env.d.ts           # 环境变量类型
│   ├── utils/
│   ├── components/
│   └── main.ts
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── package.json
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "jsx": "preserve",
    "paths": { "@/*": ["./src/*"] },
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## 总结

| 环节 | 关键配置/工具 | 用途 |
|------|-------------|------|
| **严格模式** | `strict: true` | 开启所有严格检查 |
| **模块解析** | `moduleResolution: "bundler"` | 配合 Vite/Webpack |
| **路径别名** | `paths` + vite resolve alias | 简化导入路径 |
| **声明文件** | `.d.ts` | 补充/发布类型 |
| **项目引用** | `composite: true` | Monorepo 增量编译 |
| **类型生成** | `tsc --emitDeclarationOnly` | 库发布 |
| **渐进迁移** | `allowJs: true` | JS → TS 过渡 |
| **类型检查 CI** | `tsc --noEmit` | 阻止类型错误合并 |

> TypeScript 工程化的核心是"渐进"——不需要一次性配完美，先跑起来，再逐步收紧规则。
