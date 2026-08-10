---
title: "Node.js 入门指南：前端开发者的后端第一课"
date: 2026-01-20
categories: "Node.js"
description: "面向前端开发者的 Node.js 入门教程：模块系统、文件操作、HTTP 服务、Express 框架、调试技巧"
tags: ["Node.js"]
copyright: true
---

## 前言

Node.js 让 JavaScript 跑在了服务器上。作为一名前端开发者，学习 Node.js 意味着你**可以用同一种语言**写前后端，降低全栈开发的门槛。

---

## 一、Node.js 是什么

```markdown
Node.js = V8 引擎（Chrome 的 JS 引擎）+ 操作系统 API

浏览器中的 JS：
- 能操作 DOM、BOM
- 不能读写文件、不能操作网络

Node.js 中的 JS：
- 不能操作 DOM（没有浏览器）
- 能读写文件、创建 HTTP 服务、操作数据库
```

### 1.1 安装

```bash
# 推荐使用 nvm 管理 Node 版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
node -v  # v20.x.x
npm -v   # 10.x.x
```

---

## 二、模块系统

### 2.1 CommonJS（默认）

```javascript
// math.js
const add = (a, b) => a + b
const subtract = (a, b) => a - b

// 导出
module.exports = { add, subtract }
```

```javascript
// index.js
const math = require('./math.js')
console.log(math.add(1, 2)) // 3
```

### 2.2 ES Module（现代推荐）

```json
// package.json
{
  "type": "module"
}
```

```javascript
// math.js
export const add = (a, b) => a + b
export const subtract = (a, b) => a - b
```

```javascript
// index.js
import { add } from './math.js'
console.log(add(1, 2)) // 3
```

---

## 三、核心内置模块

### 3.1 fs——文件系统

```javascript
import fs from 'fs/promises'

// 读取文件
const data = await fs.readFile('./data.json', 'utf-8')
const json = JSON.parse(data)

// 写入文件
await fs.writeFile('./output.json', JSON.stringify({ ok: true }))

// 检查文件是否存在
try {
  await fs.access('./config.json')
  console.log('文件存在')
} catch {
  console.log('文件不存在')
}
```

### 3.2 path——路径处理

```javascript
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

path.join('/a', '/b', 'c')      // '/a/b/c'
path.resolve('src', 'utils')    // 返回绝对路径
path.basename('/a/b/c.js')      // 'c.js'
path.extname('file.js')         // '.js'
```

### 3.3 http——HTTP 服务

```javascript
import http from 'http'

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ message: 'Hello World' }))
})

server.listen(3000, () => {
  console.log('服务运行在 http://localhost:3000')
})
```

---

## 四、Express——Web 框架

Express 是 Node.js 最流行的 Web 框架：

```bash
npm install express
```

```javascript
import express from 'express'

const app = express()
app.use(express.json())

// 路由
app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: '张三' }])
})

app.get('/api/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: '张三' })
})

app.post('/api/users', (req, res) => {
  const user = req.body
  // 保存到数据库...
  res.status(201).json(user)
})

// 中间件
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: '服务器错误' })
})

app.listen(3000)
```

### 中间件

```javascript
// 日志中间件
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

// 验证中间件
function auth(req, res, next) {
  const token = req.headers.authorization
  if (!token) return res.status(401).json({ error: '未登录' })
  // 验证 token...
  req.user = { id: 1, name: '张三' }
  next()
}

// 保护路由
app.get('/api/profile', auth, (req, res) => {
  res.json({ user: req.user })
})
```

---

## 五、环境变量与配置

```bash
# .env 文件
PORT=3000
DATABASE_URL=mysql://localhost:3306/myapp
JWT_SECRET=my-secret-key
```

```javascript
// 读取环境变量
import 'dotenv/config'

const config = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
}
```

---

## 六、npm 包管理

```bash
# 初始化项目
npm init -y

# 安装依赖
npm install express
npm install -D nodemon  # 开发依赖

# 运行脚本
npm run dev
npm run build

# scripts 配置
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "lint": "eslint src/"
  }
}
```

---

## 七、调试

```javascript
// 1. console.log（最简单）
console.log('变量值:', variable)

// 2. Node.js 内置调试
// node --inspect-brk src/index.js
// 然后在 Chrome 浏览器打开 chrome://inspect

// 3. VS Code 调试——设置断点
// 创建 .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "启动程序",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.js"
    }
  ]
}
```

---

## 八、常见面试题

```javascript
// 1. CommonJS 和 ES Module 的区别？
// CommonJS: require / module.exports（同步）
// ESM: import / export（异步，静态分析）

// 2. process.nextTick 和 setImmediate 的区别？
// nextTick：当前操作结束后立即执行（微任务）
// setImmediate：下一轮事件循环（宏任务）

// 3. Buffer 是什么？
// Node.js 中处理二进制数据的对象
const buf = Buffer.from('Hello', 'utf-8')
console.log(buf.toString('base64')) // SGVsbG8=
```

---

## 总结

```javascript
// Node.js 入门三部曲：
//
// 1. 模块系统 — require / import
// 2. 核心模块 — fs / path / http
// 3. Express — 路由 / 中间件

// 学习建议：
// - 从搭建一个简单的 API 服务器开始
// - 尝试连接数据库（MongoDB / MySQL）
// - 理解事件循环（Event Loop）
// - 理解流（Stream）和 Buffer
```

**推荐阅读：**
- [Node.js 官方文档](https://nodejs.org/docs/latest/api/)
- [Express 官方文档](https://expressjs.com/)
- [Node.js 调试指南](https://nodejs.org/en/docs/guides/debugging-getting-started/)
