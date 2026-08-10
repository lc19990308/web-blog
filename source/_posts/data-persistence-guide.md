---
title: "前端数据持久化方案：IndexedDB、localForage 与 SQLite/WASM"
date: 2026-06-25
categories: "JavaScript"
description: "系统对比浏览器端数据持久化方案，从 localStorage 到 IndexedDB，再到 SQLite/WASM，涵盖 API 使用、性能对比和选型建议"
tags: ["JavaScript", "架构"]
copyright: true
---

## 前言

前端应用的复杂度越来越高，需要本地存储的数据也越来越多：

- 离线缓存用户的操作草稿
- 客户端全文搜索索引
- 缓存复杂的表单状态
- 图片等大文件的本地存储
- PWA 离线应用的完整数据

浏览器提供了多种存储方案，但各有适用场景：

| 方案 | 容量 | 同步/异步 | 查询能力 | 兼容性 |
|------|------|-----------|---------|--------|
| **localStorage** | ~5MB | 同步 | 无 | 全部 |
| **sessionStorage** | ~5MB | 同步 | 无 | 全部 |
| **Cookie** | ~4KB | 同步 | 无 | 全部 |
| **IndexedDB** | 几乎无限 | 异步 | 索引、游标、范围查询 | 全部 |
| **Cache API** | 视磁盘 | 异步 | 按请求匹配 | 部分 |
| **OPFS** | 视磁盘 | 异步 | 文件系统操作 | Chromium |
| **SQLite/WASM** | 视磁盘 | 异步 | 完整 SQL | 大部分 |

本文重点讲解 **IndexedDB** 及其封装库 **localForage**，以及新兴的 **SQLite/WASM** 方案。

---

## 一、localStorage 的极限

### 1.1 现状分析

localStorage 虽然简单，但限制明显：

```javascript
// 优点：简单
localStorage.setItem('theme', 'dark')
const theme = localStorage.getItem('theme')

// 缺点1：容量限制（5MB，部分浏览器更少）
// 缺点2：同步阻塞主线程
// 缺点3：只能存字符串
localStorage.setItem('user', JSON.stringify({ name: 'LC', roles: ['admin'] }))

// 缺点4：不能查询
// 想找到所有 role 为 admin 的用户？只能遍历全量数据
function findByRole(role) {
  const results = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key.startsWith('user_')) {
      const user = JSON.parse(localStorage.getItem(key))
      if (user.roles.includes(role)) results.push(user)
    }
  }
  return results
}
```

### 1.2 适用场景

- ✅ 简单配置项（主题、语言偏好）
- ✅ 非敏感的小数据
- ❌ 大数据（超过 5MB 的缓存）
- ❌ 结构化数据（需要查询）

---

## 二、IndexedDB 基础

### 2.1 核心概念

IndexedDB 是一个**浏览器内置的 NoSQL 数据库**：

- **Database** — 数据库，每个域名可建多个
- **Object Store** — 类似表（table），存对象
- **Index** — 索引，加速查询
- **Transaction** — 事务，保证数据一致性
- **Cursor** — 游标，遍历数据

### 2.2 打开数据库

```javascript
function openDB(dbName, version = 1) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version)

    // 首次创建或版本升级时触发
    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // 创建对象存储（表）
      if (!db.objectStoreNames.contains('users')) {
        const store = db.createObjectStore('users', {
          keyPath: 'id',        // 主键字段
          autoIncrement: false,  // 是否自增
        })

        // 创建索引
        store.createIndex('email', 'email', { unique: true })
        store.createIndex('role', 'role', { unique: false })
        store.createIndex('name_age', ['name', 'age'], { unique: false })
      }

      if (!db.objectStoreNames.contains('posts')) {
        const store = db.createObjectStore('posts', {
          keyPath: 'id',
          autoIncrement: true,
        })
        store.createIndex('authorId', 'authorId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = (event) => resolve(event.target.result)
    request.onerror = (event) => reject(event.target.error)
  })
}
```

### 2.3 CRUD 操作

```javascript
// 增
async function addUser(db, user) {
  const tx = db.transaction('users', 'readwrite') // 读写事务
  const store = tx.objectStore('users')
  store.add(user) // 如果主键已存在会报错，用 put 会覆盖

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

// 查（主键）
async function getUser(db, id) {
  const tx = db.transaction('users', 'readonly')
  const store = tx.objectStore('users')
  const request = store.get(id)

  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result)
  })
}

// 查（索引）
async function getUsersByRole(db, role) {
  const tx = db.transaction('users', 'readonly')
  const store = tx.objectStore('users')
  const index = store.index('role')
  const request = index.getAll(role) // 按索引值查询所有匹配

  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result)
  })
}

// 范围查询
async function getUsersByAgeRange(db, minAge, maxAge) {
  const tx = db.transaction('users', 'readonly')
  const store = tx.objectStore('users')
  const index = store.index('name_age')
  const range = IDBKeyRange.bound(
    ['', minAge],    // 下界
    ['\uffff', maxAge], // 上界
  )
  const request = index.openCursor(range)
  const results = []

  return new Promise((resolve) => {
    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        results.push(cursor.value)
        cursor.continue()
      } else {
        resolve(results)
      }
    }
  })
}

// 改
async function updateUser(db, user) {
  const tx = db.transaction('users', 'readwrite')
  const store = tx.objectStore('users')
  store.put(user) // put 覆盖，add 会报错

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

// 删
async function deleteUser(db, id) {
  const tx = db.transaction('users', 'readwrite')
  const store = tx.objectStore('users')
  store.delete(id)

  return new Promise((resolve) => {
    tx.oncomplete = () => resolve()
  })
}
```

### 2.4 批量操作

```javascript
async function batchSavePosts(db, posts) {
  const tx = db.transaction('posts', 'readwrite')
  const store = tx.objectStore('posts')

  posts.forEach((post) => store.put(post))

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}
```

---

## 三、localForage — IndexedDB 的优雅封装

原生 IndexedDB API 的**回调嵌套和复杂度**劝退了很多人。localForage 提供了 localStorage 风格的 API，但底层使用 IndexedDB：

### 3.1 安装

```bash
npm i localforage
```

### 3.2 基础使用

```javascript
import localforage from 'localforage'

// 配置实例
const userStore = localforage.createInstance({
  name: 'myApp',
  storeName: 'users',     // 相当于表名
  driver: [               // 驱动优先级：IndexedDB > WebSQL > localStorage
    localforage.INDEXEDDB,
    localforage.WEBSQL,
    localforage.LOCALSTORAGE,
  ],
  version: 1.0,
  description: '用户数据缓存',
})

// CURD — 完全像 localStorage 一样
await userStore.setItem('user_1', { id: 1, name: 'LC', roles: ['admin'] })
const user = await userStore.getItem('user_1')
await userStore.removeItem('user_1')
await userStore.clear()

// 遍历所有键
const keys = await userStore.keys()
const values = await Promise.all(
  keys.map((key) => userStore.getItem(key))
)

// 获取存储大小
const size = await localforage.getSerializer().then(serializer => serializer.serialize())
console.log(`存储大小: ${(size.length / 1024).toFixed(1)} KB`)
```

### 3.3 配置多个 Store

```javascript
const stores = {
  users: localforage.createInstance({ name: 'myApp', storeName: 'users' }),
  posts: localforage.createInstance({ name: 'myApp', storeName: 'posts' }),
  drafts: localforage.createInstance({ name: 'myApp', storeName: 'drafts' }),
}

// 使用
await stores.users.setItem('user_1', userData)
const drafts = await stores.drafts.getItem('draft_blog_001')
```

### 3.4 封装业务缓存

```javascript
// cache.js — 通用缓存模块
import localforage from 'localforage'

const cache = localforage.createInstance({
  name: 'appCache',
  storeName: 'apiCache',
})

const DEFAULT_TTL = 5 * 60 * 1000 // 5分钟

export const apiCache = {
  async get(key) {
    const entry = await cache.getItem(key)
    if (!entry) return null

    // 检查是否过期
    if (Date.now() - entry.timestamp > (entry.ttl || DEFAULT_TTL)) {
      await cache.removeItem(key)
      return null
    }

    return entry.data
  },

  async set(key, data, ttl) {
    await cache.setItem(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  },

  async remove(key) {
    await cache.removeItem(key)
  },

  async clear() {
    await cache.clear()
  },

  async getCacheSize() {
    const serializer = await localforage.getSerializer()
    const serialized = await serializer.serialize()
    return {
      bytes: serialized.length,
      kilobytes: (serialized.length / 1024).toFixed(1),
    }
  },
}

// 使用
const data = await apiCache.get('api/articles')
if (data) {
  renderArticles(data)
} else {
  const fresh = await fetchArticles()
  await apiCache.set('api/articles', fresh, 10 * 60 * 1000) // 10分钟过期
  renderArticles(fresh)
}
```

---

## 四、高级：IndexedDB 复杂查询封装

### 4.1 通用 DAO 层

```javascript
// dao.js — 通用数据访问层
class BaseDAO {
  constructor(dbName, storeName) {
    this.dbName = dbName
    this.storeName = storeName
  }

  async getDB() {
    if (this.db) return this.db
    this.db = await openDB(this.dbName)
    return this.db
  }

  async findById(id) {
    const db = await this.getDB()
    const tx = db.transaction(this.storeName, 'readonly')
    const store = tx.objectStore(this.storeName)
    return new Promise((resolve) => {
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result)
    })
  }

  async findByIndex(indexName, value) {
    const db = await this.getDB()
    const tx = db.transaction(this.storeName, 'readonly')
    const store = tx.objectStore(this.storeName)
    const index = store.index(indexName)
    return new Promise((resolve) => {
      const req = index.getAll(value)
      req.onsuccess = () => resolve(req.result)
    })
  }

  async findAll() {
    const db = await this.getDB()
    const tx = db.transaction(this.storeName, 'readonly')
    const store = tx.objectStore(this.storeName)
    return new Promise((resolve) => {
      const req = store.getAll()
      req.onsuccess = () => resolve(req.result)
    })
  }

  async paginate(page, pageSize = 20, orderBy = 'id') {
    const db = await this.getDB()
    const tx = db.transaction(this.storeName, 'readonly')
    const store = tx.objectStore(this.storeName)
    const index = store.index(orderBy)

    return new Promise((resolve) => {
      const results = []
      let count = 0
      const skip = (page - 1) * pageSize

      // 反向遍历
      const req = index.openCursor(null, 'prev')
      req.onsuccess = (event) => {
        const cursor = event.target.result
        if (!cursor) {
          resolve({ data: results.reverse(), page, pageSize })
          return
        }

        count++
        if (count > skip && results.length < pageSize) {
          results.push(cursor.value)
        }
        cursor.continue()
      }
    })
  }

  async count() {
    const db = await this.getDB()
    const tx = db.transaction(this.storeName, 'readonly')
    const store = tx.objectStore(this.storeName)
    return new Promise((resolve) => {
      const req = store.count()
      req.onsuccess = () => resolve(req.result)
    })
  }

  async save(data) {
    const db = await this.getDB()
    const tx = db.transaction(this.storeName, 'readwrite')
    const store = tx.objectStore(this.storeName)
    store.put(data)
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(data)
      tx.onerror = (e) => reject(e.target.error)
    })
  }

  async delete(id) {
    const db = await this.getDB()
    const tx = db.transaction(this.storeName, 'readwrite')
    const store = tx.objectStore(this.storeName)
    store.delete(id)
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve()
    })
  }
}

// 使用
const userDAO = new BaseDAO('myAppDB', 'users')
await userDAO.save({ id: 1, name: 'LC', role: 'admin' })
const admins = await userDAO.findByIndex('role', 'admin')
const { data, page } = await userDAO.paginate(1, 10, 'createdAt')
```

---

## 五、SQLite/WASM 在浏览器中的应用

### 5.1 什么是 SQLite/WASM？

SQLite 通过 WebAssembly 编译运行在浏览器中，让前端可以用 SQL 操作本地数据库：

```bash
# 安装 @sqlite.org/sqlite-wasm 或 sql.js
npm i sql.js
```

### 5.2 使用 sql.js

```javascript
import initSqlJs from 'sql.js'

async function initDB() {
  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  })

  // 从 localStorage 恢复上次的数据库
  const saved = localStorage.getItem('sqlite_db')
  const db = saved
    ? new SQL.Database(new Uint8Array(JSON.parse(saved)))
    : new SQL.Database()

  return db
}

function saveDB(db) {
  // 持久化到 localStorage（或 IndexedDB）
  const data = db.export()
  const buffer = Buffer.from(data)
  localStorage.setItem('sqlite_db', JSON.stringify([...buffer]))
}

// 使用
async function main() {
  const db = await initDB()

  // 建表
  db.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // 插入
  db.run('INSERT INTO articles (title, content) VALUES (?, ?)', [
    'SQLite in Browser',
    '用 SQL 操作浏览器数据库！',
  ])

  // 查询
  const result = db.exec('SELECT * FROM articles ORDER BY created_at DESC')
  console.log(result[0]?.values)

  // 保存
  saveDB(db)
}
```

### 5.3 SQLite/WASM vs IndexedDB

| 对比维度 | IndexedDB | SQLite/WASM |
|---------|-----------|-------------|
| **查询能力** | 索引 + 游标 | 完整 SQL（JOIN、GROUP BY、子查询） |
| **学习成本** | 需要学习 NoSQL 模式 | 会用 SQL 就行 |
| **性能** | 原生，性能好 | WASM 有额外开销 |
| **包体积** | 无额外引入 | sql.js ~1MB (WASM) |
| **迁移** | 导出 JSON | 导出 .sqlite 文件，与其他平台兼容 |

### 5.4 选型建议

```
需要复杂 SQL 查询
├── 是 → SQLite/WASM（数据量 10MB+ 且需要 JOIN）
├── 并且需要同步到服务端 → SQLite（导出 .sqlite 文件即可同步）
└── 否 → IndexedDB + localForage（轻量、速度快）

数据量大（>50MB）
├── 全文搜索 → SQLite FTS5
├── 图片/文件 → Cache API 或 OPFS
└── 结构化数据 → IndexedDB

离线优先应用
├── 简单数据同步 → IndexedDB
├── 复杂 CRUD + 同步 → SQLite/WASM
└── 纯离线应用 → PWA + Cache API + IndexedDB
```

---

## 六、实际项目中的缓存策略

### 6.1 分层缓存架构

```javascript
// cache-layer.js
// 内存 → localStorage → IndexedDB → 网络

class CacheLayer {
  constructor(options = {}) {
    this.memory = new Map()           // L1：内存缓存
    this.ttl = options.ttl || 5 * 60 * 1000
    this.maxMemory = options.maxMemory || 100

    // L2：持久化
    this.storage = localforage.createInstance({
      name: options.dbName || 'appCache',
      storeName: options.storeName || 'layer2',
    })
  }

  async get(key) {
    // 1. 内存缓存（最快）
    const memCached = this.memory.get(key)
    if (memCached) {
      if (Date.now() - memCached.timestamp < this.ttl) {
        return memCached.data
      }
      this.memory.delete(key)
    }

    // 2. IndexedDB 持久缓存
    const persistent = await this.storage.getItem(key)
    if (persistent) {
      if (Date.now() - persistent.timestamp < (persistent.ttl || this.ttl)) {
        // 写回内存
        this.setMemory(key, persistent.data)
        return persistent.data
      }
      await this.storage.removeItem(key)
    }

    return null
  }

  async set(key, data, ttl) {
    this.setMemory(key, data)

    await this.storage.setItem(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.ttl,
    })
  }

  setMemory(key, data) {
    // LRU：缓存超限时删除最旧的
    if (this.memory.size >= this.maxMemory) {
      const firstKey = this.memory.keys().next().value
      this.memory.delete(firstKey)
    }
    this.memory.set(key, { data, timestamp: Date.now() })
  }

  async remove(key) {
    this.memory.delete(key)
    await this.storage.removeItem(key)
  }

  async clear() {
    this.memory.clear()
    await this.storage.clear()
  }
}
```

### 6.2 配合 Service Worker

```javascript
// sw.js — Service Worker 缓存策略
self.addEventListener('fetch', (event) => {
  // API 请求走 NetworkFirst
  if (event.request.url.includes('/api/')) {
    event.respondWith(networkFirst(event.request))
  }

  // 静态资源走 CacheFirst
  if (event.request.url.match(/\.(js|css|png|jpg)$/)) {
    event.respondWith(cacheFirst(event.request))
  }
})

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open('api-cache')
    cache.put(request, response.clone())
    return response
  } catch (e) {
    const cached = await caches.match(request)
    return cached || new Response(JSON.stringify({ error: '离线' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  const cache = await caches.open('static-cache')
  cache.put(request, response.clone())
  return response
}
```

---

## 七、存储容量与清理策略

### 7.1 查看存储使用量

```javascript
async function getStorageUsage() {
  if (navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate()
    console.log(`已使用: ${(estimate.usage / 1024 / 1024).toFixed(1)} MB`)
    console.log(`总配额: ${(estimate.quota / 1024 / 1024).toFixed(1)} MB`)
    console.log(`使用率: ${(estimate.usage / estimate.quota * 100).toFixed(1)}%`)
    return estimate
  }
}

// 请求持久化（用户确认后数据不会被浏览器主动清除）
async function requestPersist() {
  if (navigator.storage?.persist) {
    const isPersisted = await navigator.storage.persisted()
    if (!isPersisted) {
      const granted = await navigator.storage.persist()
      console.log(`持久化存储: ${granted ? '已授予' : '未授予'}`)
    }
    return isPersisted
  }
}
```

### 7.2 自动清理策略

```javascript
class StorageManager {
  constructor(maxSizeMB = 50) {
    this.maxSize = maxSizeMB * 1024 * 1024
  }

  async ensureSpace() {
    const usage = await getStorageUsage()
    if (!usage || usage.usage < this.maxSize) return

    // 超限时清理最旧的缓存
    const cache = localforage.createInstance({
      name: 'appCache',
      storeName: 'autoClean',
    })

    const keys = await cache.keys()
    const entries = await Promise.all(
      keys.map(async (key) => ({
        key,
        entry: await cache.getItem(key),
      }))
    )

    // 按时间戳排序，删除最旧的 30%
    entries.sort((a, b) => a.entry.timestamp - b.entry.timestamp)
    const deleteCount = Math.ceil(entries.length * 0.3)

    for (let i = 0; i < deleteCount; i++) {
      await cache.removeItem(entries[i].key)
    }

    console.log(`已清理 ${deleteCount} 条缓存`)
  }
}
```

---

## 总结

### 方案选型总表

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 主题、偏好等小配置 | localStorage | 简单，同步读 |
| 表单草稿、用户数据 | localForage | API 优雅，自动降级 |
| 大量结构化数据 | IndexedDB | 索引查询，容量大 |
| 离线 CRUD 应用 | IndexedDB + 同步逻辑 | 完整的数据操作能力 |
| 需要复杂 SQL | SQLite/WASM | JOIN、聚合、全文搜索 |
| 大文件（图片/视频） | Cache API / OPFS | 专为大文件设计 |
| PWA 离线 | Cache API + IndexedDB | Service Worker 配合 |

### 建议

1. **能用 localStorage 不要上 IndexedDB** — 简单场景不需要复杂方案
2. **优先使用 localForage** — 比原生 IndexedDB API 好 10 倍
3. **数据量大时分层缓存** — 内存 → 持久化 → 网络
4. **记得清理过期数据** — 不清理的缓存等于内存泄漏
5. **关注存储配额** — 使用 `navigator.storage.estimate` 做监控

> 数据持久化的核心原则：把正确的数据放在正确的位置，存最短的时间。
