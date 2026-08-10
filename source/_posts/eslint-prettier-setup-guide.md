---
title: "ESLint + Prettier 工程化配置：从入门到团队规范"
date: 2026-06-25
categories: "工程化"
description: "系统讲解 ESLint 和 Prettier 的配置与集成，从基础规则、Vue/TypeScript 适配到 Husky 自动检查，搭建完整的代码质量守护体系"
tags: ["工程化", "JavaScript"]
copyright: true
---

## 前言

代码检查工具在现代前端工程中已经是标配。它们解决的核心问题：

- **ESLint**：检查代码质量——是否有未使用的变量、不安全的类型操作、潜在的 bug
- **Prettier**：统一代码风格——缩进、引号、分号、换行

两者分工明确：ESLint 管**对不对**，Prettier 管**好不好看**。

---

## 一、ESLint 基础

### 1.1 安装

```bash
npm install -D eslint
npx eslint --init
```

初始化向导会询问：使用哪种模块格式、框架、TypeScript 支持等，自动生成配置文件。

### 1.2 配置文件格式

ESLint 支持多种配置格式，推荐 `eslint.config.js`（Flat Config，ESLint v9+）：

```javascript
// eslint.config.js
import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'eqeqeq': ['error', 'always'],
    },
  },
]
```

旧版格式（ESLint v8 及以下，兼容性更广）：

```javascript
// .eslintrc.js
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
  ],
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'warn',
    'eqeqeq': ['error', 'always'],
  },
}
```

### 1.3 核心规则分类

| 严重级别 | 值 | 含义 |
|---------|-----|------|
| off | 0 | 关闭规则 |
| warn | 1 | 警告，不阻止编译 |
| error | 2 | 错误，阻止编译 |

```javascript
rules: {
  // 格式: "规则名": "级别" 或 "规则名": ["级别", "参数"]
  'semi': ['error', 'always'],          // 必须加分号
  'quotes': ['error', 'single'],        // 必须用单引号
  'no-unused-vars': ['warn', { args: 'none' }], // 未使用变量警告，忽略函数参数
  'no-debugger': 'error',                // 禁止 debugger
  'max-len': ['warn', { code: 120 }],   // 最大行长度 120
}
```

---

## 二、Vue 项目配置

### 2.1 安装 Vue 插件

```bash
npm install -D eslint-plugin-vue
```

### 2.2 配置

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',  // Vue 3 推荐规则
  ],
  rules: {
    // Vue 特定规则
    'vue/multi-word-component-names': 'off',    // 允许单文件组件单名
    'vue/max-attributes-per-line': ['warn', {
      singleline: 3,                            // 一行最多 3 个属性
      multiline: 1,                             // 多行每行 1 个
    }],
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    'vue/no-mutating-props': 'error',            // 禁止直接修改 props
    'vue/require-v-for-key': 'error',            // v-for 必须带 key
  },
}
```

### 2.3 TypeScript 支持

```bash
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:vue/vue3-recommended',
  ],
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // TypeScript 推荐保留
    '@typescript-eslint/no-explicit-any': 'warn',   // 避免 any
    '@typescript-eslint/explicit-function-return-type': 'off', // 不强制标注返回类型
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
}
```

---

## 三、Prettier 配置

### 3.1 安装

```bash
npm install -D prettier
```

### 3.2 配置文件

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "vueIndentScriptAndStyle": true
}
```

### 3.3 配置项详解

| 选项 | 推荐值 | 说明 |
|------|--------|------|
| `semi` | `true` | 行尾加分号 |
| `singleQuote` | `true` | 使用单引号 |
| `tabWidth` | `2` | 缩进宽度 |
| `trailingComma` | `"all"` | 多行时尾随逗号 |
| `printWidth` | `100` | 单行最大长度 |
| `arrowParens` | `"always"` | 箭头函数始终加括号 `(x) => x` |
| `endOfLine` | `"lf"` | 换行符（跨团队统一） |

### 3.4 忽略文件

```
// .prettierignore
node_modules
dist
coverage
*.min.js
*.map
```

---

## 四、ESLint + Prettier 集成

ESLint 的格式规则和 Prettier 的格式化功能会有冲突。解决方法是：**ESLint 只检查质量，Prettier 负责格式化**。

### 4.1 关闭冲突规则

```bash
npm install -D eslint-config-prettier
```

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'prettier',  // 必须放在最后，覆盖冲突的格式规则
  ],
}
```

`eslint-config-prettier` 会关闭 ESLint 中与 Prettier 冲突的规则（如 `semi`、`quotes`、`indent` 等）。

### 4.2 使用 Prettier 作为 ESLint 规则

```bash
npm install -D eslint-plugin-prettier
```

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error', // 不符合 Prettier 格式直接报错
  },
}
```

### 4.3 完整的推荐配置

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',

    // JavaScript
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': 'off', // 用 TS 版本
    'eqeqeq': ['error', 'always'],

    // TypeScript
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/ban-ts-comment': 'off',

    // Vue
    'vue/multi-word-component-names': 'off',
    'vue/no-mutating-props': 'error',
    'vue/require-v-for-key': 'error',
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
  },
  globals: {
    defineProps: 'readonly',
    defineEmits: 'readonly',
    defineExpose: 'readonly',
  },
}
```

---

## 五、脚本配置

```json
// package.json
{
  "scripts": {
    "lint": "eslint src --ext .js,.ts,.vue --fix",
    "format": "prettier --write src/",
    "check": "eslint src --ext .js,.ts,.vue && prettier --check src/"
  }
}
```

- `npm run lint` — 检查并自动修复 ESLint 问题
- `npm run format` — 格式化所有源文件
- `npm run check` — 检查（不修改），适合 CI

---

## 六、VS Code 集成

### 6.1 安装扩展

- ESLint（dbaeumer.vscode-eslint）
- Prettier（esbenp.prettier-vscode）

### 6.2 工作区配置

```json
// .vscode/settings.json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "eslint.validate": [
    "javascript",
    "typescript",
    "vue"
  ],
  "prettier.requireConfig": true,
  "files.eol": "\n"
}
```

保存文件时自动执行：ESLint 修复 → Prettier 格式化。

---

## 七、Husky + lint-staged 自动检查

### 7.1 安装

```bash
npm install -D husky lint-staged
npx husky init
```

### 7.2 配置 lint-staged

```json
// package.json
{
  "lint-staged": {
    "*.{js,ts,vue}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss,less}": [
      "stylelint --fix",
      "prettier --write"
    ],
    "*.md": ["prettier --write"]
  }
}
```

### 7.3 pre-commit 钩子

```bash
# .husky/pre-commit
npx lint-staged
```

每次 `git commit` 时，只会对**本次修改的文件**执行检查和格式化，速度快且不干扰其他文件。

### 7.4 commit-msg 钩子

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

```bash
# .husky/commit-msg
npx --no -- commitlint --edit $1
```

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
}
```

---

## 八、CI 集成

```yaml
# .github/workflows/lint.yml
name: Lint

on:
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm check   # ESLint + Prettier 检查
```

---

## 九、常见问题

### 9.1 ESLint 和 Prettier 冲突

```bash
# 报错：ESLint 要求分号，Prettier 不写分号
# 解决：统一在 .prettierrc 中设置 semi: true
# 并用 eslint-config-prettier 关闭 ESLint 的格式规则
```

### 9.2 某条规则想临时关闭

```javascript
// 在特定行上方
// eslint-disable-next-line no-console
console.log('debug')

// 在文件顶部关闭整个文件的某规则
/* eslint-disable no-unused-vars */
const unused = 'test'
/* eslint-enable no-unused-vars */
```

### 9.3 忽略某些文件

```bash
# .eslintignore
node_modules
dist
*.min.js
public/
```

---

## 十、团队规范模板

将 `eslint.config.js`、`.prettierrc`、`.husky/`、`commitlint.config.js` 放在项目根目录，新成员 `npm install` 后自动生效。

### 推荐的最小化启动配置

```bash
npm install -D eslint prettier eslint-config-prettier eslint-plugin-prettier \
  eslint-plugin-vue @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  husky lint-staged
```

> 工具只是辅助，核心是团队达成一致。选择一套配置后坚持使用，比频繁更换配置更重要。
