---
title: "TypeScript 进阶：泛型、工具类型与实用模式"
date: 2026-06-25
categories: "TypeScript"
description: "深入 TypeScript 类型系统核心，涵盖泛型约束、内置工具类型（Partial/Pick/Omit/Record）、类型推导与实战模式"
tags: ["TypeScript"]
copyright: true
---

## 前言

入门 TypeScript 很简单——给变量加个类型就行。但真正用好 TypeScript，需要理解它的**类型系统**。

本文聚焦三个核心进阶主题：
1. **泛型** — 类型参数化，让类型像函数一样灵活
2. **工具类型** — Partial、Pick、Omit、Record 等内置工具的原理与组合
3. **实用模式** — 类型守卫、 branded types、nominal typing

---

## 一、泛型深入

### 1.1 基础回顾

```typescript
// 泛型函数
function identity<T>(arg: T): T {
  return arg
}

// 显式指定类型 vs 类型推导
identity<string>('hello')  // 显式
identity('hello')           // 推导为 string
```

### 1.2 泛型约束（extends）

```typescript
// ❌ 没有约束，T 可以是任何类型
function getLength<T>(arg: T): number {
  return arg.length  // ❌ 类型 T 上不存在 length
}

// ✅ 用 extends 约束必须有 length 属性
interface HasLength {
  length: number
}

function getLength<T extends HasLength>(arg: T): number {
  return arg.length  // ✅ 现在知道 T 有 length
}

getLength('hello')   // 5
getLength([1, 2, 3]) // 3
getLength({ length: 10 }) // 10
```

### 1.3 多泛型参数

```typescript
// 两个泛型参数
function pair<A, B>(a: A, b: B): [A, B] {
  return [a, b]
}

const result = pair('name', 42) // [string, number]

// 一个泛型依赖另一个
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const user = { name: 'LC', age: 25, email: 'lc@test.com' }
getProperty(user, 'name') // string
getProperty(user, 'age')  // number
getProperty(user, 'xxx')  // ❌ 类型报错
```

### 1.4 keyof 索引查询

```typescript
interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

// keyof T 得到所有键的联合类型
type UserKeys = keyof User // 'id' | 'name' | 'email' | 'role'

// 用 keyof 约束参数
function updateUser<T extends keyof User>(
  key: T,
  value: User[T]
): void {
  console.log(`更新 ${key} = ${value}`)
}

updateUser('name', 'New Name')  // ✅
updateUser('age', 30)           // ❌ age 不在 User 中
updateUser('name', 123)         // ❌ 类型不匹配
```

---

## 二、内置工具类型

### 2.1 Partial — 所有属性可选

```typescript
interface User {
  id: number
  name: string
  email: string
}

// 手写实现
type MyPartial<T> = {
  [P in keyof T]?: T[P]
}

// 使用 Partial 的场景：更新接口
function updateUser(id: number, updates: Partial<User>): void {
  // updates 可以只传部分字段
  console.log(`更新用户 ${id}:`, updates)
}

updateUser(1, { name: 'LC' })           // ✅
updateUser(1, { name: 'LC', email: 'new@test.com' }) // ✅
updateUser(1, {})                       // ✅（全部可选）
```

### 2.2 Required — 所有属性必填

```typescript
type MyRequired<T> = {
  [P in keyof T]-?: T[P]  // -? 去掉可选标记
}

interface Config {
  url?: string
  port?: number
  timeout?: number
}

const config: Required<Config> = {
  // 三个字段都必须填
  url: 'https://api.example.com',
  port: 8080,
  timeout: 5000,
}
```

### 2.3 Pick — 选取部分属性

```typescript
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P]
}

// 只取用户的部分信息返回
type UserPublic = Pick<User, 'name' | 'email'>
// 等价于 { name: string; email: string }

function getPublicProfile(user: User): UserPublic {
  return {
    name: user.name,
    email: user.email,
  }
}
```

### 2.4 Omit — 排除部分属性

```typescript
type MyOmit<T, K extends keyof T> = {
  [P in Exclude<keyof T, K>]: T[P]
}

// 创建用户时不需要 id
type CreateUser = Omit<User, 'id'>
// 等价于 { name: string; email: string; role: string }

function createUser(data: CreateUser): User {
  return { id: generateId(), ...data }
}
```

### 2.5 Record — 构造对象类型

```typescript
type MyRecord<K extends keyof any, V> = {
  [P in K]: V
}

// 常用场景：枚举映射
type Role = 'admin' | 'user' | 'guest'
type Permissions = Record<Role, string[]>

const permissions: Permissions = {
  admin: ['read', 'write', 'delete'],
  user: ['read', 'write'],
  guest: ['read'],
}

// 缓存映射
const userCache: Record<number, User> = {}
userCache[1] = { id: 1, name: 'LC', email: 'lc@test.com' }
```

### 2.6 Exclude / Extract — 联合类型过滤

```typescript
// Exclude<T, U> — 从 T 中排除 U
type T0 = Exclude<'a' | 'b' | 'c', 'a'>       // 'b' | 'c'
type T1 = Exclude<string | number | (() => void), Function> // string | number

// Extract<T, U> — 从 T 中提取 U
type T2 = Extract<'a' | 'b' | 'c', 'a' | 'f'> // 'a'
type T3 = Extract<string | number | (() => void), Function> // () => void

// 实现
type MyExclude<T, U> = T extends U ? never : T
```

### 2.7 NonNullable / Readonly

```typescript
type MyNonNullable<T> = T extends null | undefined ? never : T

type T4 = NonNullable<string | null | undefined> // string

type MyReadonly<T> = {
  readonly [P in keyof T]: T[P]
}

// 不可变状态
type ReadonlyState<T> = {
  readonly [P in keyof T]: T[P]
}
```

---

## 三、工具类型组合应用

```typescript
interface Article {
  id: number
  title: string
  content: string
  authorId: number
  createdAt: Date
  updatedAt: Date
  published: boolean
}

// 创建文章：排除自动生成的字段
type CreateArticle = Omit<Article, 'id' | 'createdAt' | 'updatedAt'>

// 更新文章：全部可选，排除 id
type UpdateArticle = Partial<Omit<Article, 'id'>>

// 列表展示：只选取展示需要的字段
type ArticleListItem = Pick<Article, 'id' | 'title' | 'authorId' | 'published' | 'createdAt'>

// 搜索条件：类型安全的筛选器
type ArticleFilter = Partial<Pick<Article, 'authorId' | 'published'>>

function filterArticles(filter: ArticleFilter): Article[] {
  return articles.filter(a => {
    if (filter.authorId && a.authorId !== filter.authorId) return false
    if (filter.published !== undefined && a.published !== filter.published) return false
    return true
  })
}
```

---

## 四、实用类型模式

### 4.1 类型守卫（Type Guard）

```typescript
// 自定义类型守卫
interface Cat { meow(): void }
interface Dog { bark(): void }

function isCat(pet: Cat | Dog): pet is Cat {
  return (pet as Cat).meow !== undefined
}

function handlePet(pet: Cat | Dog) {
  if (isCat(pet)) {
    pet.meow()  // ✅ 类型收窄为 Cat
  } else {
    pet.bark()  // ✅ 类型收窄为 Dog
  }
}

// 数组过滤时的类型守卫
const items: (string | null)[] = ['hello', null, 'world']
const strings = items.filter((item): item is string => item !== null)
// strings 类型: string[] ✅（不是 (string | null)[]）
```

### 4.2 Branded Types（名义类型模拟）

```typescript
// TypeScript 类型系统是结构类型（structural typing）
// 以下两个类型是兼容的：
type UserId = string
type OrderId = string

function getUser(id: UserId) {}
function getOrder(id: OrderId) {}

getUser('123')          // ✅ 正常
getUser(getOrderId())   // ❌ 逻辑错误但类型检查通过

// 使用 Branded Type 解决
type Brand<T, B> = T & { __brand: B }

type UserIdBrand = Brand<string, 'UserId'>
type OrderIdBrand = Brand<string, 'OrderId'>

function getUser(id: UserIdBrand) {}
function getOrder(id: OrderIdBrand) {}

const userId = 'user_123' as UserIdBrand
const orderId = 'order_456' as OrderIdBrand

getUser(userId)    // ✅
getUser(orderId)   // ❌ 类型不兼容！
```

### 4.3 函数重载

```typescript
// 同一个函数根据参数类型返回不同类型
function process(data: string): string[]
function process(data: number): number
function process(data: string | number): string[] | number {
  if (typeof data === 'string') {
    return data.split('')
  }
  return data * 2
}

const result1 = process('hello') // string[]
const result2 = process(42)       // number
```

### 4.4 satisfies 操作符（TS 4.9）

```typescript
// satisfies 在保持最精确类型的同时做类型检查
type Color = 'red' | 'green' | 'blue'

const palette = {
  primary: 'blue',
  secondary: 'red',
  accent: 'yellow',  // ❌ 'yellow' 不是 Color 类型
} satisfies Record<string, Color>

// 对比 satisfies 和显式类型标注：
const palette1: Record<string, Color> = { primary: 'blue' }
// palette1.primary 类型是 string（收窄到 string）

const palette2 = { primary: 'blue' } satisfies Record<string, Color>
// palette2.primary 类型是 'blue'（字面量类型 ✅）
```

---

## 五、实战：类型安全的 API 客户端

```typescript
// 类型安全的 API 请求封装
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface ApiResponse<T> {
  data: T
  status: number
  message: string
}

interface ApiEndpoints {
  '/api/users': { GET: { query: { page: number }; response: User[] }; POST: { body: CreateUser; response: User } }
  '/api/users/:id': { GET: { params: { id: number }; response: User }; PUT: { params: { id: number }; body: UpdateUser; response: User }; DELETE: { params: { id: number }; response: void } }
  '/api/login': { POST: { body: { username: string; password: string }; response: { token: string } } }
}

type ExtractParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param | keyof ExtractParams<Rest>]: string }
    : Path extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {}

async function api<T extends keyof ApiEndpoints,
  M extends keyof ApiEndpoints[T] & HttpMethod>(
  method: M,
  path: T,
  options?: {
    query?: ApiEndpoints[T][M] extends { query: infer Q } ? Q : never
    body?: ApiEndpoints[T][M] extends { body: infer B } ? B : never
    params?: ApiEndpoints[T][M] extends { params: infer P } ? P : never
  }
): Promise<ApiEndpoints[T][M] extends { response: infer R } ? R : never> {
  let url = path as string

  // 替换路径参数
  if (options?.params) {
    Object.entries(options.params).forEach(([k, v]) => {
      url = url.replace(`:${k}`, String(v))
    })
  }

  // 拼接 query
  if (options?.query) {
    const params = new URLSearchParams()
    Object.entries(options.query).forEach(([k, v]) => params.append(k, String(v)))
    url += '?' + params.toString()
  }

  const res = await fetch(url, {
    method: method as string,
    headers: { 'Content-Type': 'application/json' },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  return res.json()
}

// 使用 — 完全类型安全
const users = await api('GET', '/api/users', { query: { page: 1 } })
// users: User[] ✅

const user = await api('POST', '/api/users', { body: { name: 'LC', email: 'test@test.com', role: 'user' } })
// user: User ✅

const detail = await api('GET', '/api/users/:id', { params: { id: 1 } })
// detail: User ✅
```

---

## 总结

| 概念 | 用途 | 示例 |
|------|------|------|
| **泛型约束** | 限制泛型参数的范围 | `<T extends HasLength>` |
| **keyof** | 获取对象所有键的联合 | `keyof User → 'id' \| 'name'` |
| **Partial** | 所有属性可选 | 更新接口、部分配置 |
| **Pick / Omit** | 选取/排除属性 | DTO 转换 |
| **Record** | 构造键值对类型 | 枚举映射、缓存 |
| **类型守卫** | 运行时类型收窄 | `pet is Cat` |
| **satisfies** | 保持精确类型时做检查 | TS 4.9+ |
| **Branded Types** | 名义类型模拟 | 防参数混淆 |

> TypeScript 类型系统的强大之处在于：用极少的代码描述极复杂的约束。理解工具类型的实现原理（映射类型 + 条件类型），就能自己写出任何需要的类型工具。
