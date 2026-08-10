---
title: "Vite 6 插件开发实战：从 Loader 到 HMR 自定义"
date: 2026-06-25
categories: "工程化"
description: "深入 Vite 6 插件系统，从插件生命周期、虚拟模块、HMR 处理到实战开发一个完整插件，掌握 Vite 插件的核心开发技巧"
tags: ["工程化", "JavaScript"]
copyright: true
---

## 前言

Vite 已经成为前端构建工具的标配。它的插件系统继承自 Rollup，并增加了 Vite 特有的钩子（HMR、SSR、服务端中间件）。

本文从零开始，通过 **5 个实战插件** 逐步掌握 Vite 插件的开发：

1. 基础：必知概念与生命周期
2. 实战1：自动生成路由配置
3. 实战2：虚拟模块加载
4. 实战3：自定义 HMR
5. 实战4：注入全局变量
6. 实战5：构建产物优化

---

## 一、Vite 插件基础

### 1.1 插件结构

一个 Vite 插件就是一个**返回对象**的函数：

```javascript
// vite-plugin-example.js
export default function myPlugin(options = {}) {
  return {
    name: 'vite-plugin-example',    // 必填，用于调试和错误提示

    // 通用钩子（Rollup 兼容）
    resolveId(source, importer) {},
    load(id) {},
    transform(code, id) {},

    // Vite 特有钩子
    config(config, { command }) {},
    configureServer(server) {},
    handleHotUpdate(ctx) {},
  }
}
```

### 1.2 钩子执行顺序

```
服务启动流程：
config → configResolved → configureServer → buildStart → resolveId → load → transform

模块热更新流程：
handleHotUpdate → 触发浏览器更新

构建流程：
buildStart → resolveId → load → transform → moduleParsed → generateBundle → writeBundle → closeBundle
```

### 1.3 开发环境配置

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import myPlugin from './vite-plugin-example'

export default defineConfig({
  plugins: [
    vue(),
    myPlugin({ prefix: 'lc' }),
  ],
})
```

---

## 二、实战1：自动生成路由配置

这个插件自动扫描 `src/views/` 目录生成 Vue Router 配置：

```javascript
// vite-plugin-auto-routes.js
import fs from 'node:fs'
import path from 'node:path'

export default function autoRoutes(options = {}) {
  const viewsDir = options.viewsDir || 'src/views'
  const outputFile = options.output || 'src/router/auto-routes.js'

  return {
    name: 'vite-plugin-auto-routes',

    // 在构建启动时扫描目录
    buildStart() {
      this.generateRoutes()
    },

    configureServer(server) {
      // 开发模式下监听文件变化
      const viewsPath = path.resolve(process.cwd(), viewsDir)
      fs.watch(viewsPath, { recursive: true }, () => {
        this.generateRoutes()
        // 通知浏览器重新加载
        server.ws.send({ type: 'full-reload' })
      })
    },

    generateRoutes() {
      const viewsPath = path.resolve(process.cwd(), viewsDir)
      if (!fs.existsSync(viewsPath)) return

      const routes = scanViews(viewsPath, '')
      const content = generateRouteCode(routes)

      fs.writeFileSync(
        path.resolve(process.cwd(), outputFile),
        content,
        'utf-8'
      )
    },
  }
}

function scanViews(dir, basePath) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const routes = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // 递归子目录
      const childRoutes = scanViews(
        path.join(dir, entry.name),
        `${basePath}/${entry.name}`
      )
      routes.push(...childRoutes)
    } else if (entry.name.endsWith('.vue')) {
      const name = path.basename(entry.name, '.vue')
      const routePath = name === 'index' ? basePath || '/' : `${basePath}/${name}`

      routes.push({
        path: routePath.toLowerCase().replace(/\[(\w+)\]/g, ':$1'),
        name,
        component: path.join(dir, entry.name),
      })
    }
  }

  return routes
}

function generateRouteCode(routes) {
  const imports = routes
    .map((r, i) => `const Route${i} = () => import('${r.component}')`)
    .join('\n')

  const routeConfigs = routes
    .map((r, i) => `  { path: '${r.path}', name: '${r.name}', component: Route${i} }`)
    .join(',\n')

  return `// 此文件由 vite-plugin-auto-routes 自动生成，请勿手动修改
${imports}

export default [
${routeConfigs},
]
`
}
```

**使用效果**：在 `src/views/` 下创建文件即自动生成路由配置，无需手动维护路由表。

---

## 三、实战2：虚拟模块加载

虚拟模块让插件像真实文件一样被 import，但内容由插件动态生成：

```javascript
// vite-plugin-virtual-i18n.js
// 功能：从 .json 语言包生成虚拟模块，运行时按需加载

export default function virtualI18n(options = {}) {
  const virtualModuleId = 'virtual:i18n'
  const resolvedVirtualModuleId = '\0' + virtualModuleId

  return {
    name: 'vite-plugin-virtual-i18n',

    resolveId(id) {
      // 当 import 'virtual:i18n' 时，将 id 标记为虚拟模块
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },

    load(id) {
      // 当需要加载虚拟模块时，动态生成内容
      if (id === resolvedVirtualModuleId) {
        const localesDir = options.localesDir || 'src/locales'
        const localeFiles = loadLocaleFiles(path.resolve(localesDir))

        return `
// 自动生成的国际化模块
const messages = ${JSON.stringify(localeFiles.messages)}

export function t(key, lang = 'zh-CN') {
  return messages[lang]?.[key] ?? key
}

export function useI18n() {
  const lang = document.documentElement.lang || 'zh-CN'
  return {
    t: (key) => t(key, lang),
    lang,
  }
}

export default messages
`
      }
    },
  }
}

function loadLocaleFiles(dir) {
  const messages = {}
  if (!fs.existsSync(dir)) return { messages }

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  files.forEach((file) => {
    const lang = path.basename(file, '.json')
    const content = fs.readFileSync(path.join(dir, file), 'utf-8')
    messages[lang] = JSON.parse(content)
  })

  return { messages }
}
```

**使用方式**：

```javascript
// 组件中直接 import 虚拟模块
import { t } from 'virtual:i18n'

// 使用
console.log(t('common.submit'))  // 输出：提交
```

---

## 四、实战3：自定义 HMR

Vite 的 HMR 默认对 Vue SFC、CSS 做了处理，但自定义文件类型需要自己实现：

```javascript
// vite-plugin-custom-hmr.js
// 功能：监听自定义 .page.yaml 文件的修改并触发 HMR

export default function customHmrPlugin() {
  return {
    name: 'vite-plugin-custom-hmr',

    handleHotUpdate(ctx) {
      // ctx.file: 变更的文件路径
      // ctx.server: Vite dev server 实例
      // ctx.modules: 受影响的模块列表

      if (ctx.file.endsWith('.page.yaml')) {
        // 读取新的 YAML 内容
        const content = fs.readFileSync(ctx.file, 'utf-8')

        // 找到依赖此文件的模块
        const module = ctx.server.moduleGraph.getModuleById(
          '\0' + 'virtual:page-config'
        )

        if (module) {
          // 自定义热更新，触发模块重新加载
          ctx.server.moduleGraph.invalidateModule(module)

          // 发送自定义更新事件给浏览器
          ctx.server.ws.send({
            type: 'custom',
            event: 'page-config-changed',
            data: { file: ctx.file, content },
          })

          // 返回空数组阻止默认 HMR
          return []
        }
      }
    },

    configureServer(server) {
      // 客户端监听自定义事件
      server.ws.on('connection', (socket) => {
        socket.send(JSON.stringify({
          type: 'custom',
          event: 'hmr-ready',
        }))
      })
    },
  }
}
```

**客户端监听自定义 HMR**：

```javascript
// 在应用入口注册
if (import.meta.hot) {
  import.meta.hot.on('page-config-changed', (data) => {
    console.log('页面配置已更新:', data.file)
    // 重新加载页面配置
    window.__PAGE_CONFIG__ = data.content
  })
}
```

---

## 五、实战4：注入全局变量

在生产构建中注入环境变量或版本号：

```javascript
// vite-plugin-inject-global.js
export default function injectGlobalPlugin(options = {}) {
  const defines = options.defines || {}

  return {
    name: 'vite-plugin-inject-global',

    config(config, { command }) {
      // 在 define 中注入全局变量
      return {
        define: {
          __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
          __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
          __GIT_HASH__: JSON.stringify(getGitHash()),
          ...Object.fromEntries(
            Object.entries(defines).map(([key, value]) => [
              `__${key}__`,
              JSON.stringify(value),
            ])
          ),
        },
      }
    },

    transformIndexHtml(html) {
      // 在 HTML 中注入构建信息
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: {
              name: 'build-info',
              content: `version=${process.env.npm_package_version}&time=${Date.now()}`,
            },
            injectTo: 'head',
          },
        ],
      }
    },
  }
}

function getGitHash() {
  try {
    return require('child_process')
      .execSync('git rev-parse --short HEAD')
      .toString()
      .trim()
  } catch {
    return 'unknown'
  }
}
```

**使用方式**：

```javascript
// 在代码中使用注入的全局变量
console.log(`版本: ${__APP_VERSION__}`)
console.log(`构建时间: ${__BUILD_TIME__}`)
console.log(`Git 提交: ${__GIT_HASH__}`)
```

---

## 六、实战5：构建产物优化

压缩特定文件，或提取构建分析报告：

```javascript
// vite-plugin-build-optimizer.js
import { gzipSync, brotliSync } from 'node:zlib'

export default function buildOptimizer(options = {}) {
  return {
    name: 'vite-plugin-build-optimizer',

    // 在生成 bundle 后处理
    generateBundle(outputOptions, bundle) {
      if (!options.enableGzip && !options.enableBrotli && !options.report) return

      const report = []

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue

        const originalSize = chunk.code.length

        // Gzip 压缩
        if (options.enableGzip) {
          const gzipped = gzipSync(chunk.code)
          const gzipSize = gzipped.length
          const ratio = ((1 - gzipSize / originalSize) * 100).toFixed(1)

          // 输出 .gz 文件
          this.emitFile({
            type: 'asset',
            fileName: `${fileName}.gz`,
            source: gzipped,
          })

          report.push({ file: fileName, original: originalSize, gzip: gzipSize, ratio: `${ratio}%` })
        }

        // Brotli 压缩（比 gzip 更优）
        if (options.enableBrotli) {
          const brotlied = brotliSync(chunk.code)
          this.emitFile({
            type: 'asset',
            fileName: `${fileName}.br`,
            source: brotlied,
          })
        }

        // 查找大文件警告
        if (originalSize > 100 * 1024) {
          console.warn(`⚠️ 大文件: ${fileName} (${(originalSize / 1024).toFixed(1)} KB)`)
        }
      }

      // 生成分析报告
      if (options.report && report.length > 0) {
        const reportContent = [
          '## 构建产物大小分析',
          '| 文件 | 原始 | Gzip | 压缩比 |',
          '|------|------|------|--------|',
          ...report.map(r =>
            `| ${r.file} | ${(r.original / 1024).toFixed(1)} KB | ${(r.gzip / 1024).toFixed(1)} KB | ${r.ratio} |`
          ),
        ].join('\n')

        console.log(reportContent)
      }
    },

    // 打包完成后输出分析文件
    writeBundle() {
      if (options.report) {
        const stats = this.getBundleStatistics()
        fs.writeFileSync(
          'dist/bundle-stats.json',
          JSON.stringify(stats, null, 2)
        )
      }
    },
  }
}
```

---

## 七、插件测试与调试

```javascript
// 使用 Vitest 测试插件
import { describe, it, expect } from 'vitest'
import { build, createServer } from 'vite'
import autoRoutes from '../vite-plugin-auto-routes'

describe('autoRoutes plugin', () => {
  it('should generate route config', async () => {
    const result = await build({
      plugins: [autoRoutes({ viewsDir: 'test/fixtures/views', output: '/tmp/routes.js' })],
      logLevel: 'silent',
    })

    // 验证产物包含预期路由
    const output = fs.readFileSync('/tmp/routes.js', 'utf-8')
    expect(output).toContain('home')
    expect(output).toContain('about')
  })
})
```

```javascript
// 调试技巧：打印插件执行流程
export default function debugPlugin() {
  return {
    name: 'vite-plugin-debug',
    configResolved(config) {
      console.log('[debug] 配置已解析:', { mode: config.mode, command: config.command })
    },
    transform(code, id) {
      if (id.includes('src/')) {
        console.log('[debug] 转换文件:', id)
      }
    },
  }
}
```

---

## 总结

### 插件开发速查表

| 想实现什么 | 使用哪个钩子 |
|-----------|------------|
| 修改 Vite 配置 | `config` / `configResolved` |
| 处理自定义文件类型 | `transform` |
| 创建虚拟模块 | `resolveId` + `load` |
| 注入全局变量 | `config` 的 define |
| 自定义 HMR | `handleHotUpdate` + `server.ws.send` |
| 添加服务端路由 | `configureServer` 的 `server.middlewares.use` |
| 修改构建产物 | `generateBundle` / `writeBundle` |
| 修改 HTML | `transformIndexHtml` |

### 开发建议

1. **插件名必须唯一** — 方便调试和错误定位
2. **虚拟模块用 `\0` 前缀** — 标记为内部模块，不参与文件系统查询
3. **HMR 要谨慎** — 返回空数组 `[]` 阻止默认行为，或返回新模块列表
4. **SSR 兼容性** — 用 `this.meta.watchMode` 判断是否开发模式
5. **错误处理** — 使用 `this.warn()` 和 `this.error()` 而不是 `console.error`
6. **配置校验** — 使用 `zod` 或简单校验函数验证插件参数

> 插件是 Vite 生态的核心。三步法：先用已有插件满足需求 → 学习同类型插件的源码 → 写出自己的插件。
