---
title: "Monorepo 不是默认答案：用 Turborepo 管理多应用"
date: 2024-03-15
categories: "工程化"
description: "先判断共享代码和发布节奏是否值得放进同一个仓库，再用 pnpm workspace 与 Turborepo 管理任务依赖和缓存。"
tags: ["工程化"]
copyright: true
---

Monorepo 解决的不是“仓库太多”，而是多个应用需要一起演进时，代码共享、版本联动和构建顺序变得难以维护。

把所有项目塞进一个仓库并不会自动变好。应用没有共享代码、发布节奏彼此独立、权限边界又很强时，多个仓库反而更简单。先判断协作关系，再决定目录结构和工具。

## 什么时候值得使用 Monorepo

下面几种情况通常值得集中管理：

- 管理后台、营销站和文档站共用组件、类型或 API Client。
- 组件库的改动必须和多个应用一起验证。
- 团队希望一条 CI 流水线知道“这次改动影响了哪些包”。
- 多个包需要统一的 ESLint、TypeScript、测试和发布规范。

只有“项目数量多”不构成理由。跨团队审批、访问控制和发布窗口差异很大时，先保留独立仓库更稳妥。

## 先建立清楚的工作区边界

以 pnpm workspace 为例，应用和可复用包分开存放。`apps` 可以依赖 `packages`，但不要让应用互相直接引用源码。

```text
workspace/
├── apps/
│   ├── admin/          # 管理后台
│   ├── web/            # 面向用户的站点
│   └── docs/           # 文档站
├── packages/
│   ├── ui/             # 共享组件
│   ├── api-client/     # 接口客户端与类型
│   └── config/         # ESLint、TSConfig 等约定
├── pnpm-workspace.yaml
├── package.json
└── turbo.json
```

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
```

共享包要有明确的公开入口和构建产物。否则一个应用会逐渐依赖另一个应用的内部文件，仓库虽合并了，边界反而更混乱。

## 用任务图表达构建顺序

Turborepo 2 使用 `tasks` 配置任务。`^build` 表示当前包的依赖包也要先完成同名任务；`outputs` 告诉缓存系统哪些文件是任务结果。

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

不要把缓存当成魔法。任务的输入、环境变量、依赖版本和 `outputs` 必须能描述真实结果；配置漏掉了关键输入，拿到的缓存就可能是旧的。先让构建可重复，再考虑远程缓存。

## 常用命令应服务于变更范围

```bash
# 全仓构建和测试
turbo run build
turbo run test

# 只处理一个应用及其依赖
turbo run build --filter=web...

# 给指定工作区添加依赖
pnpm --filter web add zod
pnpm --filter web add @workspace/ui@workspace:*
```

`--filter=web...` 适合本地排查一个应用依赖了哪些任务。CI 则应根据变更范围决定要跑的包，不必每次都把所有开发服务器或端到端测试全量启动。

## 迁移时先做小闭环

不要先移动几十个包。选一个应用和一个共享包，完成四件事：工作区安装、构建依赖、测试、CI 缓存。这个闭环稳定后再迁移下一组。

如果团队说不清“共享包由谁维护”“破坏性改动怎么发布”“失败任务谁修”，工具配置再漂亮也会变成新的负担。

参考：[Turborepo 配置参考](https://turborepo.com/docs/reference/configuration) 与 [pnpm Workspace](https://pnpm.io/workspaces)。
