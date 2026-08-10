---
title: "TypeScript 入门指南：从 JavaScript 到类型安全"
date: 2026-01-15
categories: "TypeScript"
description: "系统掌握 TypeScript 的核心概念：基础类型、接口、泛型、类型推断，以及如何将现有 JS 项目逐步迁移到 TS"
tags: ["TypeScript"]
copyright: true
---

## 前言

TypeScript = JavaScript + 类型系统。它不是一门新语言，而是 JS 的**超集**——所有 JS 代码都是合法的 TS 代码。

**为什么需要 TypeScript？**
- 在**编码阶段**发现 Bug（而非运行时）
- 更好的 IDE 智能提示和自动补全
- 代码自文档化（类型即文档）

---

## 一、基础类型

```typescript
// 基本类型
let name: string = '张三'
let age: number = 25
let isActive: boolean = true
let data: null = null
let undef: undefined = undefined

// 数组
let list: number[] = [1, 2, 3]
let fruits: Array<string> = ['苹果', '香蕉']

// 元组（固定长度、各位置类型不同）
let tuple: [string, number] = ['张三', 25]

// 枚举
enum Color { Red, Green, Blue }
let c: Color = Color.Red  // 0

// any（尽量避免使用）
let notSure: any = 4
notSure = '字符串'  // 不报错（any 关闭了类型检查）

// unknown（安全的 any）
let value: unknown = 4
value = '字符串'
// value.toUpperCase() // ❌ 不能直接调用，必须先判断类型
if (typeof value === 'string') {
  value.toUpperCase() // ✅ 类型收窄后可以
}

// void（无返回值）
function log(msg: string): void {
  console.log(msg)
}

// never（永远不会返回）
function throwError(msg: string): never {
  throw new Error(msg)
}
```

---

## 二、接口（Interface）

```typescript
interface User {
  id: number
  name: string
  email?: string       // 可选属性
  readonly createdAt: Date  // 只读属性
}

const user: User = {
  id: 1,
  name: '张三',
  createdAt: new Date(),
}

// user.id = 2 // ❌ 只读属性不能修改

// 接口继承
interface Admin extends User {
  role: 'admin' | 'superadmin'
}

const admin: Admin = {
  id: 1,
  name: '管理员',
  createdAt: new Date(),
  role: 'admin',
}
```

**type vs interface：**
```typescript
// type 可以定义联合类型、交叉类型
type Status = 'active' | 'inactive' | 'pending'
type ID = string | number

// interface 可以声明合并（同名自动合并）
interface User { name: string }
interface User { age: number }
// User 有 name 和 age

// 类型别名不可重复声明
```

---

## 三、函数类型

```typescript
// 函数声明
function add(a: number, b: number): number {
  return a + b
}

// 箭头函数
const multiply = (a: number, b: number): number => a * b

// 可选参数
function greet(name: string, greeting?: string): string {
  return `${greeting || '你好'}, ${name}`
}

// 默认参数
function createUser(name: string, age: number = 18): User {
  return { id: 1, name, age, createdAt: new Date() }
}

// 剩余参数
function sum(...nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0)
}

// 函数重载
function process(x: number): number
function process(x: string): string
function process(x: any): any {
  if (typeof x === 'number') return x * 2
  return x.toUpperCase()
}
```

---

## 四、泛型（Generics）

```typescript
// 泛型函数
function firstElement<T>(arr: T[]): T | undefined {
  return arr[0]
}

const num = firstElement([1, 2, 3])      // number
const str = firstElement(['a', 'b'])     // string

// 泛型接口
interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

const response: ApiResponse<User> = {
  code: 200,
  data: { id: 1, name: '张三', createdAt: new Date() },
  message: 'success',
}

// 泛型约束
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

const user = { name: '张三', age: 25 }
getProperty(user, 'name') // ✅ '张三'
// getProperty(user, 'email') // ❌ 'email' 不在 keyof 中
```

---

## 五、类型工具与实用类型

```typescript
// Partial：所有属性变为可选
type PartialUser = Partial<User>

// Required：所有属性变为必填
type RequiredUser = Required<User>

// Pick：提取部分属性
type UserName = Pick<User, 'name' | 'email'>

// Omit：排除部分属性
type UserWithoutId = Omit<User, 'id'>

// Record：构造对象类型
type UserMap = Record<number, User>

// 类型守卫
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function process(value: string | number) {
  if (isString(value)) {
    value.toUpperCase() // ✅ 类型收窄
  }
}
```

---

## 六、实际项目中的 TS

### 6.1 类型定义文件

```typescript
// types/api.d.ts
declare namespace API {
  interface User {
    id: number
    name: string
  }

  interface Response<T> {
    code: number
    data: T
    message: string
  }
}

// 使用
const res: API.Response<API.User> = await fetchUser()
```

### 6.2 常见模式

```typescript
// 环境变量类型安全
const config = {
  apiUrl: process.env.VITE_API_URL as string,
  appName: process.env.VITE_APP_NAME as string,
} as const

// API 请求封装
async function request<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return res.json()
}

const user = await request<User>('/api/user/1')
```

---

## 七、JS → TS 迁移策略

```typescript
// 1. 先加 tsconfig.json
// 2. 把 .js 改为 .ts
// 3. 逐步为函数和接口添加类型（从核心业务开始）
// 4. strict 模式先不开（逐步开启）

// tsconfig.json 推荐配置
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": false,        // 先关闭
    "jsx": "preserve",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

---

## 总结

```typescript
// TypeScript 核心：
// 1. 类型系统 — interface / type / enum
// 2. 泛型 — 让类型像参数一样灵活
// 3. 类型工具 — Partial / Pick / Omit
// 4. 类型守卫 — 运行时类型判断
// 5. 迁移策略 — 从宽松到严格

// 记住了：TS 不是束缚，是你的「安全带」和「导航仪」
```

**推荐阅读：**
- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [TypeScript 入门教程](https://ts.xcatliu.com/)
