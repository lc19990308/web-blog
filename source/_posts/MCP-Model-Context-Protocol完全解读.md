---
title: "MCP 到底是什么？一文搞懂 Model Context Protocol"
date: 2026-08-18
categories: "AI"
description: "MCP（Model Context Protocol）是 AI 与工具之间的「USB 接口」。本文从原理到实战，彻底讲清楚 MCP 是什么、能做什么、怎么用"
tags: ["AI"]
copyright: true
---

## 前言

如果你用过 AI 编程助手（如 Claude Code、Cursor），你可能已经发现：**AI 的能力不仅限于聊天，它还能读取文件、执行命令、调用 API、查询数据库**。

这种能力背后的关键技术就是 **MCP**——Model Context Protocol（模型上下文协议）。

简单说：**MCP 是 AI 模型与外部工具之间的「USB 接口」**。

就像 USB 让电脑可以连接各种设备一样，MCP 让 AI 模型可以连接各种工具和数据源。

---

## 一、MCP 是什么？

### 1.1 官方定义

> MCP（Model Context Protocol）是 Anthropic 提出的**开放协议**，定义了 AI 模型与外部工具/数据源之间的标准化通信方式。

### 1.2 一个类比

```
传统方式：每个 AI 工具各自实现自己的工具调用

  AI 助手 A ──── 自定义 ────► 文件系统
  AI 助手 B ──── 自定义 ────► 文件系统（不兼容）
  AI 助手 C ──── 自定义 ────► 文件系统（又一套）

MCP 方式：统一协议，一次实现到处用

  AI 助手 A ────┐
  AI 助手 B ────┼─── MCP 协议 ────► MCP 服务器 ────► 文件系统
  AI 助手 C ────┘                    (统一接口)
```

**MCP 的核心理念：** 工具开发者只需实现一次 MCP 服务器，所有支持 MCP 的 AI 客户端都能使用这个工具。

---

## 二、MCP 架构

MCP 采用**客户端-服务器**架构：

```
┌──────────────────────────────────────────────┐
│                AI 客户端                      │
│  (Claude Code / Cursor / 其他 AI 工具)        │
│                    │                          │
│              MCP Protocol                     │
│                    │                          │
├────────────────────┼──────────────────────────┤
│                    ▼                          │
│          ┌─────────────────┐                  │
│          │   MCP 服务器     │                  │
│          │  (统一协议适配器) │                  │
│          └────────┬────────┘                  │
│                   │                           │
│     ┌─────────────┼─────────────┐             │
│     ▼             ▼             ▼             │
│  文件系统        API         数据库            │
│     │             │             │             │
│  读/写文件     HTTP请求     SQL查询            │
└──────────────────────────────────────────────┘
```

### 2.1 核心概念

| 概念 | 说明 | 类比 |
|------|------|------|
| **MCP 客户端** | 发起请求的 AI 工具（Claude Code、Cursor） | 电脑上的 USB 接口 |
| **MCP 服务器** | 提供特定能力的服务（文件系统、数据库、API） | USB 设备 |
| **资源（Resources）** | 可读取的数据（文件、文档、配置） | 文件 |
| **工具（Tools）** | 可执行的操作（发送邮件、查询天气、运行脚本） | 功能按钮 |
| **提示（Prompts）** | 预定义的交互模板 | 快捷指令 |

### 2.2 通信流程

```
1. AI 客户端连接 MCP 服务器
         │
2. 服务器告知客户端：我能做什么？
   「我有 read_file、write_file、search_code 三个工具」
         │
3. AI 根据用户需求决定调用哪个工具
   「用户想修改文件 → 调用 read_file + write_file」
         │
4. 客户端向服务器发送工具调用请求
         │
5. 服务器执行操作，返回结果
   「文件内容如下：...」
         │
6. AI 基于返回结果继续推理
   「好的，我已经读取了文件，接下来帮你修改...」
```

---

## 三、MCP 能做什么？

### 3.1 文件系统操作

```json
// MCP 服务器暴露的工具
{
  "tools": [
    {
      "name": "read_file",
      "description": "读取文件内容",
      "parameters": {
        "path": "文件路径"
      }
    },
    {
      "name": "write_file",
      "description": "写入文件",
      "parameters": {
        "path": "文件路径",
        "content": "文件内容"
      }
    },
    {
      "name": "search_files",
      "description": "搜索文件",
      "parameters": {
        "pattern": "搜索模式",
        "path": "搜索目录"
      }
    }
  ]
}
```

### 3.2 数据库查询

```json
{
  "tools": [
    {
      "name": "query_database",
      "description": "执行 SQL 查询",
      "parameters": {
        "sql": "SQL 语句",
        "params": "参数"
      }
    },
    {
      "name": "get_schema",
      "description": "获取数据库表结构",
      "parameters": {
        "table": "表名"
      }
    }
  ]
}
```

### 3.3 API 调用

```json
{
  "tools": [
    {
      "name": "fetch_url",
      "description": "发送 HTTP 请求",
      "parameters": {
        "url": "请求地址",
        "method": "GET/POST",
        "headers": "请求头",
        "body": "请求体"
      }
    }
  ]
}
```

---

## 四、为什么需要 MCP？

### 4.1 MCP 出现之前

每个 AI 工具各自实现自己的工具集成：

```markdown
Claude Code：
  └─ 自己的文件系统实现
  └─ 自己的命令执行实现
  └─ 自己的代码搜索实现

Cursor：
  └─ 自己的文件系统实现（不兼容 Claude Code 的）
  └─ 自己的命令执行实现（又写一遍）

GitHub Copilot：
  └─ 自己的……（再写一遍）
```

问题：**每个 AI 工具都要重复实现同样的能力，而且互不兼容。**

### 4.2 MCP 出现之后

```markdown
@anthropic/mcp-server-filesystem（一次性实现）
  ├─ Claude Code 能用
  ├─ Cursor 能用
  └─ 任何支持 MCP 的 AI 客户端都能用

@anthropic/mcp-server-github（一次性实现）
  ├─ Claude Code 能用
  ├─ Cursor 能用
  └─ ...

MCP 的核心价值：一次开发，到处使用。
```

### 4.3 MCP vs 传统 API

| 特性 | 传统 API | MCP |
|------|---------|-----|
| **设计目的** | 人与人对接 | **AI 与工具对接** |
| **接口定义** | REST / GraphQL | **标准化工具描述** |
| **发现机制** | 文档（人读） | **自动发现**（AI 读）|
| **参数描述** | 文档 | **JSON Schema** |
| **调用格式** | HTTP 请求 | **统一协议** |
| **AI 友好度** | ❌ 需要人写代码调用 | ✅ AI 自动理解 |

---

## 五、MCP 服务器示例

### 5.1 创建一个简单的 MCP 服务器

```javascript
// mcp-server-weather.js
import { Server } from '@anthropic-ai/sdk/mcp'

const server = new Server({
  name: 'weather-server',
  version: '1.0.0',
})

// 注册工具
server.tool(
  'get_weather',
  '获取指定城市的天气信息',
  {
    city: { type: 'string', description: '城市名称，如 北京' },
  },
  async ({ city }) => {
    // 调用天气 API
    const response = await fetch(`https://api.weather.com/${city}`)
    const data = await response.json()

    return {
      content: [{
        type: 'text',
        text: `${city} 当前天气：${data.temperature}°C，${data.condition}`,
      }],
    }
  }
)

// 启动服务器
server.listen(3100)
```

### 5.2 MCP 服务器开发指南

```javascript
// 一个更完整的 MCP 服务器示例
import { Server } from '@anthropic-ai/sdk/mcp'

const server = new Server({
  name: 'project-helper',
  version: '1.0.0',
})

// 工具：读取项目配置
server.tool(
  'get_project_config',
  '读取项目的配置文件',
  {
    path: { type: 'string', description: '配置文件的相对路径' },
  },
  async ({ path }) => {
    const content = await fs.readFile(`./${path}`, 'utf-8')
    return { content: [{ type: 'text', text: content }] }
  }
)

// 工具：运行测试
server.tool(
  'run_tests',
  '运行项目的测试用例',
  {
    filter: { type: 'string', description: '测试过滤条件（可选）' },
  },
  async ({ filter }) => {
    const cmd = filter ? `npm test -- --grep "${filter}"` : 'npm test'
    const result = await exec(cmd)
    return { content: [{ type: 'text', text: result.stdout }] }
  }
)

// 资源：提供项目文档
server.resource(
  'project-docs',
  'docs://README.md',
  async (uri) => {
    const content = await fs.readFile('./README.md', 'utf-8')
    return { contents: [{ uri: uri.href, text: content }] }
  }
)

server.listen(3100)
```

---

## 六、MCP 生态

### 6.1 官方 MCP 服务器

| 服务器 | 功能 | 安装 |
|--------|------|------|
| `@anthropic/mcp-server-filesystem` | 文件系统操作 | `npx @anthropic/mcp-server-filesystem` |
| `@anthropic/mcp-server-github` | GitHub API 操作 | `npx @anthropic/mcp-server-github` |
| `@anthropic/mcp-server-puppeteer` | 浏览器自动化 | `npx @anthropic/mcp-server-puppeteer` |
| `@anthropic/mcp-server-sqlite` | SQLite 数据库 | `npx @anthropic/mcp-server-sqlite` |

### 6.2 社区 MCP 服务器

```markdown
- mcp-server-postgres    → PostgreSQL 数据库
- mcp-server-redis       → Redis 缓存操作
- mcp-server-aws         → AWS 服务管理
- mcp-server-slack       → Slack 消息发送
- mcp-server-jira        → Jira 任务管理
- mcp-server-figma       → Figma 设计文件读取
- mcp-server-sentry      → Sentry 错误查询
```

### 6.3 配置 MCP 服务器

以 Claude Code 为例：

```json
// ~/.claude/mcp-servers.json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-filesystem", "/allowed/path"]
    },
    "github": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxx"
      }
    },
    "database": {
      "command": "node",
      "args": ["./mcp-servers/db-server.js"]
    }
  }
}
```

---

## 七、MCP 的意义与展望

### 7.1 对开发者的意义

```markdown
1. 工具开发一次，所有 AI 都能用
   - 不再为每个 AI 工具重复实现集成

2. AI 的能力边界被无限扩展
   - 不再局限于"聊天"，可以操作真实世界

3. 标准化带来生态繁荣
   - 就像 npm 让前端生态爆发一样
   - MCP 让 AI 工具生态爆发

4. 从"对话"到"行动"
   - 以前 AI 只能"说"，有了 MCP 后 AI 能"做"
```

### 7.2 MCP 可能的未来

```markdown
2024         2025           2026+
  │            │               │
  ▼            ▼               ▼
协议提出    社区爆发       标准化基础设施
(Anthropic) (各种 MCP 服务器) (就像如今的 HTTP/WebSocket)
```

---

## 总结

```markdown
MCP 一句话总结：

MCP = AI 界的「USB 协议」

以前：
  AI 工具各自实现自己的工具调用（重复造轮子）

现在：
  统一协议，工具一次实现，所有 AI 都能用

核心价值：
  1. 标准化——工具描述、参数、调用的统一规范
  2. 可发现——AI 自动理解工具能做什么
  3. 可扩展——任何人都可以开发 MCP 服务器
  4. 解耦——工具开发者只需关注实现，不用关心 AI 客户端

如果你做工具/API，考虑提供 MCP 接口。
如果你用 AI 编程，了解 MCP 能帮你发挥 AI 的最大潜力。
```

**推荐阅读：**
- [MCP 官方文档](https://modelcontextprotocol.io/)
- [MCP GitHub 仓库](https://github.com/modelcontextprotocol)
- [Anthropic MCP 介绍](https://anthropic.com/news/model-context-protocol)
