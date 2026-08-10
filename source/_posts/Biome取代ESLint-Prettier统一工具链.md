---
title: "Biome 迁移指南：先试点，再替换 ESLint 与 Prettier"
date: 2025-04-08
categories: "工程化"
description: "Biome 能统一格式化、静态检查和 import 整理，但不是所有 ESLint 插件的直接替代。本文从试点、迁移命令、编辑器与 CI 说明可验证的接入方式。"
tags: ["工程化"]
copyright: true
---

Biome 把格式化、检查和部分代码辅助能力放进同一个工具。它使用 Rust 实现，启动和执行往往很快，但“更快”不能替代规则覆盖率和迁移成本的检查。

如果项目依赖框架专用 ESLint 插件、定制规则或复杂的 overrides，先把 Biome 当成试点工具。确认它能覆盖团队真正关心的问题，再决定是否删除 ESLint 或 Prettier。

## 建立最小配置

安装并让 Biome 生成起点配置：

```bash
npm install -D @biomejs/biome
npx biome init
```

一个小项目可以从下面的规则开始。规则集应根据仓库实际需要逐步加，不要在第一天就把所有警告升为错误。

```json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "organizeImports": {
    "enabled": true
  }
}
```

编辑器中的 JSON Schema、文件范围和忽略目录可以交给 `biome init` 生成的配置来维护，避免复制一段过期的版本号。

## 命令分清检查与修复

本地可以修复，CI 应只检查：

```bash
# 本地查看问题
npx biome check .

# 本地接受格式化、可安全修复和 import 整理
npx biome check --write .

# CI 中只校验，不改写工作区
npx biome ci .
```

提交前先在一个包或一个目录运行，而不是第一次执行就格式化全仓。这样审查者能把格式变化和实际逻辑改动分开看。

## 从 ESLint 和 Prettier 迁移

官方迁移命令是 Biome 子命令，不是单独的 `@biomejs/migrate-eslint` 包：

```bash
npx @biomejs/biome migrate eslint --write
npx @biomejs/biome migrate prettier --write
```

迁移后的 `biome.json` 是初稿。要逐项核对原先的 ESLint 插件、扩展规则、文件覆盖范围和忽略规则。无法被迁移的规则不应悄悄消失，可以继续保留 ESLint，或为它们寻找替代方案。

## 让编辑器只做一件事

同一个文件不要让 Prettier、ESLint 修复和 Biome 同时在保存时改写。下面的设置以 Biome 作为 JavaScript/TypeScript 的默认格式化器，是否自动整理 import 由团队约定。

```json
{
  "[javascript][typescript][javascriptreact][typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true
  },
  "editor.codeActionsOnSave": {
    "source.organizeImports.biome": "explicit"
  }
}
```

## 迁移是否完成，看这些信号

- CI 在干净环境里能稳定运行 `biome ci .`。
- 关键目录的原有 lint 规则有明确去向：迁移、保留或有意删除。
- 保存文件时不再发生两套格式化器反复改写同一段代码。
- 团队比较的是自己的耗时和发现的问题，而不是一张没有环境说明的速度倍率表。

参考：[Biome 迁移 ESLint 与 Prettier 指南](https://biomejs.dev/guides/migrate-eslint-prettier/) 与 [Biome CLI](https://biomejs.dev/reference/cli/)。
