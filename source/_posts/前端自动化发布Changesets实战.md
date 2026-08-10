---
title: "前端自动化发布：Changesets 与语义化版本"
date: 2024-10-30
categories: "工程化"
description: "自动化发布流程是工程化成熟度的标志。本文介绍用 Changesets 管理版本号和 CHANGELOG，自动生成 Release Notes，配合 CI 实现一键发布"
tags: ["工程化"]
copyright: true
---

## 前言

手动管理版本号和 CHANGELOG 的问题：

```
❌ 忘记更新版本号就发布了
❌ CHANGELOG 要么不写，要么乱写
❌ 不知道当前版本到底改了啥
❌ 发布流程靠人记，忘了某一步就炸
```

**Changesets** 解决这些问题——规范化的 changelog + 自动版本管理。

---

## 一、安装与配置

```bash
npm install -D @changesets/cli
npx changeset init
```

生成 `.changeset/config.json`：

```json
{
  "commit": true,
  "updateInternalDependencies": "patch",
  "access": "public"
}
```

---

## 二、工作流

```bash
# 1. 开发完一个功能，记录变更
npx changeset
# → 交互式选择：major / minor / patch
# → 写入变更描述

# 2. 发布时，生成 CHANGELOG 并更新版本
npx changeset version
# → 自动更新 package.json 版本
# → 自动生成/更新 CHANGELOG.md

# 3. 发布到 npm
npx changeset publish
```

---

## 三、生成的 CHANGELOG

```markdown
# CHANGELOG

## 1.2.0

### Minor Changes

- feat: 添加用户权限管理 (#45)
- feat: 支持多语言切换 (#42)

### Patch Changes

- fix: 修复登录页白屏问题 (#44)
- fix: 修复日期选择器时区问题 (#43)
```

---

## 四、CI 集成（GitHub Actions）

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci

      - name: 创建 Release PR
        uses: changesets/action@v1
        with:
          publish: npm run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

```json
{
  "scripts": {
    "release": "changeset publish"
  }
}
```

流程：

```
PR 合并到 main → Changesets 自动创建 Release PR
审查 Release PR → 合并 → 自动发布到 npm + GitHub Release
```

---

## 五、语义化版本速记

```markdown
主版本号（major）：破坏性变更（不兼容）
次版本号（minor）：新功能（向下兼容）
修订号（patch）：Bug 修复（向下兼容）

1.2.3 → 1.0.0（major: 重构了核心 API）
1.2.3 → 1.3.0（minor: 添加了新功能）
1.2.3 → 1.2.4（patch: 修了一个 Bug）
```

**推荐阅读：** [Changesets 文档](https://github.com/changesets/changesets)
