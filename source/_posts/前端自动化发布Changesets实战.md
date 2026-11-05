---
title: "前端自动化发布：Changesets 与语义化版本"
date: 2024-10-30
categories: "工程化"
description: "Changesets 把每次用户可见的变更记录在 PR 中，并在主分支生成可审查的版本发布 PR。本文覆盖版本策略、GitHub Actions 和发布验收。"
tags: ["工程化"]
copyright: true
---

## 版本号不该靠发布当天回忆

发包时才想“这次该升 minor 还是 patch”，通常已经太晚。变更的作者最清楚 API 是否兼容、功能是否面向用户，因此版本意图应跟着代码一起进入 PR。Changesets 做的正是这件事：每个需要发布的变更都有一份小型 Markdown 记录，主分支再把这些记录汇总成版本和 CHANGELOG。

它尤其适合多包仓库，也能用于单包项目。它不能替你决定什么是破坏性变更，团队仍需把版本策略写清楚。

## 初始化并约定变更粒度

```bash
npm install -D @changesets/cli
npx changeset init
```

初始化后会生成 `.changeset/config.json`。以下配置适用于默认分支为 `main`、发布 npm 公开包的仓库：

```json
{
  "baseBranch": "main",
  "access": "public",
  "updateInternalDependencies": "patch"
}
```

私有包不要照抄 `access: "public"`。多包仓库还要讨论哪些包应该联动升级、哪些包被忽略；这些是产品兼容性决策，不是 CI 参数。

功能完成并通过测试后运行：

```bash
npx changeset
```

它会生成一份类似下面的文件。描述应说明用户能观察到的变化，而不是只写“修复问题”。

```md
---
'@acme/ui': minor
---

新增可键盘操作的日期范围选择器。
```

这份文件和代码一起进入 PR。没有影响包使用者的变更，例如纯内部重构或文档拼写修正，可以不创建 changeset；前提是团队对“不发布”的范围有共识。

## 语义化版本是兼容性承诺

`1.2.3` 中的三段数字代表对使用者的承诺：

- **major**：有意移除或改变既有公开 API，调用方需要修改代码。
- **minor**：新增向后兼容的能力。
- **patch**：向后兼容的缺陷修复。

版本号不能根据改动行数决定。删除一个很少有人用的导出也可能是 major；新增一个默认开启、改变旧行为的配置也要按破坏性变更评估。处于 `0.x` 阶段的包尤其应把团队规则单独写下来，因为不同团队对它的兼容性约束并不相同。

## 用 Release PR 把发布变成一次审查

`changesets/action` 在 `main` 收到新 changeset 时创建或更新一个版本 PR；维护者审核版本号和 CHANGELOG 后合并。下次工作流发现没有待消费的 changeset，就执行 publish。这样不需要给每个功能 PR 直接发包。

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          registry-url: https://registry.npmjs.org

      - run: npm ci
      - run: npm test
      - run: npm run build

      - uses: changesets/action@v1
        with:
          version: npm run version-packages
          publish: npm run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

对应的脚本保持直白即可：

```json
{
  "scripts": {
    "version-packages": "changeset version",
    "release": "changeset publish"
  }
}
```

`NPM_TOKEN` 应使用权限最小、可轮换的自动化令牌，存入仓库 Secrets。也可以按 npm 当前的可信发布机制配置 OIDC；无论采用哪种方式，都不要把令牌写进仓库、日志或开发者本地配置示例。

## 发布前后各看一次

Release PR 不是形式检查。合并前确认它只升级了预期的包、内部依赖版本符合联动规则、CHANGELOG 可让使用者理解升级影响。合并后再确认：

- npm 上的包版本、tarball 内容和公开访问权限正确。
- GitHub Release 或对应的发布记录指向正确 commit。
- 安装刚发布的包，运行一次最小使用示例。
- 失败时能重新运行发布，而不会重复发布同一个版本。

Changesets 让“谁决定版本、何时发布、改了什么”留下可审查的记录。真正让流程可靠的，是在 Release PR 上认真审查兼容性，而不是把发布按钮交给 CI 后就不再看它。

**推荐阅读：** [Changesets GitHub Action 文档](https://github.com/changesets/action)
