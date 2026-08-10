---
title: "用 Node.js 写一个不会误覆盖文件的 CLI"
date: 2024-09-25
categories: "工程化"
description: "从命令参数到安全写入：用 Commander 和 Node.js 文件 API 做一个生成页面的 CLI，并把冲突处理和失败反馈设计进去。"
tags: ["工程化"]
copyright: true
---

一个生成页面的 CLI 不是把模板写进文件就结束了。它还要决定：参数从哪里来、文件已存在时怎么办、用户如何知道下一步该做什么。

这篇文章实现一个 `create-page` 命令。目标很小：在 `src/pages` 下创建页面文件；约束也很明确：默认不覆盖已有文件，参数不完整时才进入交互式补全。

## 先把命令生命周期画出来

下面的流程把输入、校验、文件系统操作和反馈拆开。这样写代码时不会把交互、路径计算和写文件塞进一个 `action` 回调。

<iframe class="article-diagram" src="/web-blog/diagrams/cli-page-generation-workflow.html" title="创建页面 CLI 的执行流程图" loading="lazy"></iframe>

<p class="diagram-caption">图：命令行工具应先校验，再计算目标路径；文件冲突默认停止。<a href="/web-blog/diagrams/cli-page-generation-workflow.html" target="_blank" rel="noopener">打开可交互工作流图</a></p>

## 约定命令接口

先决定什么是必填输入，什么可以交互补全。命令行参数适合写进脚本和 CI；交互提示只补充缺失的信息。

```bash
create-page user-profile --type detail
create-page user-profile --type detail --force
```

`--force` 必须是显式开关。没有它时，已有文件应当报错并保留原文件。

## 配置 bin 入口

`package.json` 的 `bin` 字段把一个可执行文件映射为命令名。发布前把入口文件加入 `files`，避免 npm 包漏掉真正的 CLI。

```json
{
  "name": "@example/create-page",
  "type": "module",
  "bin": {
    "create-page": "./bin/create-page.mjs"
  },
  "files": ["bin"],
  "engines": {
    "node": ">=20"
  }
}
```

安装依赖：

```bash
pnpm add commander @inquirer/prompts
```

## 解析输入并安全写入文件

这个实现用 `node:fs/promises` 写文件。名称只接受短横线格式，路径固定从当前项目的 `src/pages` 计算，避免参数意外指向项目外部。

```js
#!/usr/bin/env node
import { Command } from 'commander'
import { input, select } from '@inquirer/prompts'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'

const program = new Command()

const exists = async (file) => {
  try {
    await access(file, constants.F_OK)
    return true
  } catch {
    return false
  }
}

const toPascalCase = (value) => value
  .split('-')
  .map((part) => part[0].toUpperCase() + part.slice(1))
  .join('')

program
  .name('create-page')
  .argument('[name]', '页面名，例如 user-profile')
  .option('--type <type>', '页面类型：list、detail 或 form')
  .option('--force', '允许覆盖已有文件')
  .action(async (name, options) => {
    const pageName = name || await input({ message: '页面名：' })
    const pageType = options.type || await select({
      message: '页面类型：',
      choices: ['list', 'detail', 'form'].map((value) => ({ name: value, value }))
    })

    if (!/^[a-z][a-z0-9-]*$/.test(pageName)) {
      throw new Error('页面名使用小写字母、数字和短横线，例如 user-profile。')
    }

    const pagesRoot = path.resolve(process.cwd(), 'src/pages')
    const target = path.resolve(pagesRoot, pageName, 'index.tsx')
    if (!target.startsWith(`${pagesRoot}${path.sep}`)) {
      throw new Error('目标路径必须位于 src/pages 目录中。')
    }

    if (await exists(target) && !options.force) {
      throw new Error(`${path.relative(process.cwd(), target)} 已存在。确认覆盖后加 --force。`)
    }

    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, `export default function ${toPascalCase(pageName)}() {\n  return <main>${pageType} page</main>\n}\n`)
    console.log(`已生成 ${path.relative(process.cwd(), target)}`)
  })

program.parseAsync().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
```

这个例子故意没有使用“神奇”的路径处理。用户输入、目标目录、覆盖策略和错误信息都在一个地方可见，后续加模板、路由注册或 API 文件时也容易测试。

## 发布前先检查包内容

本地运行命令前，先用 `npm pack --dry-run` 确认 `bin/create-page.mjs` 会被打进包。发布后再用临时目录通过 `npx` 或全局安装验证，而不是只在当前仓库里执行。

```bash
npm pack --dry-run
npm publish --access public
```

一个好 CLI 的反馈应该能告诉用户三件事：写了什么、没有写什么、接下来怎么继续。把这些边界做对，比再加一种颜色输出更有价值。

参考：[Commander.js](https://github.com/tj/commander.js) 与 [Node.js 文件系统 API](https://nodejs.org/api/fs.html)。
