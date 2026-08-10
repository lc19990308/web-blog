---
title: "TypeScript 类型体操：条件类型、映射类型、infer 与递归"
date: 2026-06-25
categories: "TypeScript"
description: "深入 TypeScript 类型体操核心技巧：条件类型、映射类型、infer 推导、模板字面量类型与递归类型，手写实现 10+ 个常用工具类型"
tags: ["TypeScript"]
copyright: true
---

## 前言

> "类型体操"指的是用 TypeScript 的类型系统解决复杂类型问题的编程实践。

它很有趣，但不是炫技——在实际项目中，类型体操能：
- 推导 API 响应中的嵌套类型
- 从复杂数据结构中提取特定字段
- 实现类型安全的 Builder / Chain 模式

本文从基础到进阶，逐步拆解类型体操的四大核心构造。

---

## 一、条件类型（Conditional Types）

### 1.1 基础语法

```typescript
// T extends U ? X : Y
// 如果 T 可以赋值给 U，则为 X，否则为 Y

type IsString<T> = T extends string ? true : false

type A = IsString<'hello'>   // true
type B = IsString<42>        // false

// 条件类型的分发特性（Distributive）
type ToArray<T> = T extends any ? T[] : never

type Result = ToArray<string | number>
// string[] | number[]（不是 (string | number)[]）
```

### 1.2 分布式条件类型

当条件类型作用于**联合类型**时，会自动分发：

```typescript
// 联合类型的分发
type Without<T, U> = T extends U ? never : T

type T0 = Without<'a' | 'b' | 'c', 'a'>
// 分发过程：
// 'a' extends 'a' ? never : 'a' → never
// 'b' extends 'a' ? never : 'b' → 'b'
// 'c' extends 'a' ? never : 'c' → 'c'
// 结果: 'b' | 'c'

type T1 = Without<string | number | (() => void), Function>
// string | number（函数类型被排除）
```

### 1.3 禁用分发

用方括号包裹条件类型可以禁用分发：

```typescript
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never

type Result = ToArrayNonDist<string | number>
// (string | number)[]（不分发，保留联合）

// 实用场景：判断是否是精确的联合类型
type IsUnion<T, U = T> =
  T extends U
    ? [U] extends [T]
      ? false
      : true
    : never

type T0 = IsUnion<string>          // false
type T1 = IsUnion<string | number> // true
```

---

## 二、映射类型（Mapped Types）

### 2.1 基础

```typescript
// 遍历联合类型，生成对象类型
type Options<T extends string> = {
  [P in T]: boolean
}

type Features = Options<'darkMode' | 'notifications'>
// { darkMode: boolean; notifications: boolean }

// 修饰符：+ | - | ? | readonly
type Mutable<T> = {
  -readonly [P in keyof T]: T[P]   // 去掉 readonly
}

type Required<T> = {
  [P in keyof T]-?: T[P]            // 去掉 ?
}
```

### 2.2 键名重映射（as）

```typescript
// 给所有键加前缀
type AddPrefix<T, Prefix extends string> = {
  [K in keyof T as `${Prefix}${Capitalize<string & K>}`]: T[K]
}

type User = { name: string; age: number }
type ApiUser = AddPrefix<User, 'set'>
// { setName: string; setAge: number }

// 过滤特定类型的键
type PickByType<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
}

type User = { name: string; age: number; email: string; role: 'admin' | 'user' }
type StringKeys = PickByType<User, string>
// { name: string; email: string }

// 排除特定键名
type ExcludeKeys<T, K extends string> = {
  [P in keyof T as P extends K ? never : P]: T[P]
}
```

---

## 三、infer — 类型推导

`infer` 用于在条件类型中**声明一个待推导的类型变量**。

### 3.1 基础用法

```typescript
// 提取函数返回类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never

type Fn = () => string
type R = ReturnType<Fn> // string

// 提取函数参数类型
type Params<T> = T extends (...args: infer P) => any ? P : never

type Fn2 = (a: string, b: number) => void
type P = Params<Fn2> // [string, number]
```

### 3.2 提取 Promise 值

```typescript
type Unwrap<T> = T extends Promise<infer R> ? R : T

type A = Unwrap<Promise<string>> // string
type B = Unwrap<Promise<Promise<number>>> // Promise<number>（一层）
```

### 3.3 递归解包

```typescript
type DeepUnwrap<T> = T extends Promise<infer R>
  ? DeepUnwrap<R>  // 递归解包
  : T

type C = DeepUnwrap<Promise<Promise<Promise<number>>>>
// number ✅
```

### 3.4 提取数组元素类型

```typescript
type ArrayItem<T> = T extends (infer U)[] ? U : never

type Nums = ArrayItem<number[]>   // number
type Union = ArrayItem<(string | number)[]> // string | number

// 提取元组最后一个元素
type Last<T extends any[]> = T extends [...infer _, infer L] ? L : never

type LastNum = Last<[1, 2, 3]>    // 3
type LastStr = Last<['a', 'b', 'c', 'd']> // 'd'
```

### 3.5 模板字面量 + infer

```typescript
// 提取路径参数
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<Rest>
    : T extends `${string}:${infer Param}`
      ? Param
      : never

type Params = ExtractParams<'/api/users/:id/posts/:postId'>
// 'id' | 'postId'

// 去掉空白
type Trim<T extends string> =
  T extends ` ${infer R}` ? Trim<R>
  : T extends `${infer R} ` ? Trim<R>
  : T

type Trimmed = Trim<'  hello  '> // 'hello'
```

---

## 四、递归类型

### 4.1 基础递归

```typescript
// 读取深层可选属性
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object
    ? DeepPartial<T[P]>
    : T[P]
}

interface User {
  name: string
  address: {
    city: string
    zip: string
  }
}

type PartialUser = DeepPartial<User>
// { name?: string; address?: { city?: string; zip?: string } }
```

### 4.2 深层只读

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
      ? T[P]
      : DeepReadonly<T[P]>
    : T[P]
}
```

### 4.3 深层排除 null/undefined

```typescript
type DeepNonNullable<T> = T extends (infer U)[]
  ? DeepNonNullable<U>[]
  : T extends object
    ? { [P in keyof T]: DeepNonNullable<NonNullable<T[P]>> }
    : NonNullable<T>
```

---

## 五、实用类型体操实现

### 5.1 从联合类型中排除函数

```typescript
type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never
}[keyof T]

type NonFunctionProperties<T> = Pick<T, Exclude<keyof T, FunctionPropertyNames<T>>>

interface Api {
  fetchData(): Promise<void>
  url: string
  port: number
}

type Props = NonFunctionProperties<Api>
// { url: string; port: number }
```

### 5.2 实现类型安全的 Builder

```typescript
class QueryBuilder<T extends Record<string, any>> {
  private conditions: string[] = []

  where<K extends keyof T>(key: K, value: T[K]): this {
    this.conditions.push(`${String(key)} = ${value}`)
    return this
  }

  build(): string {
    return this.conditions.join(' AND ')
  }
}

interface User {
  id: number
  name: string
  age: number
  active: boolean
}

const query = new QueryBuilder<User>()
  .where('name', 'LC')     // ✅
  .where('age', 25)        // ✅
  .where('name', 123)      // ❌ name 不能赋值 number
  .where('xxx', 'value')   // ❌ xxx 不在 User 中
  .build()
```

### 5.3 从 GraphQL 响应推导类型

```typescript
// 假设从 API 返回的数据
const response = {
  data: {
    user: {
      id: 1,
      name: 'LC',
      posts: [
        { id: 1, title: 'Post 1' },
      ],
    },
  },
}

// 提取深层类型
type ExtractData<T> = {
  [K in keyof T]: T[K] extends object
    ? ExtractData<T[K]>
    : T[K]
}

type Observed<T> = {
  [K in keyof T]: T[K] extends object
    ? Observed<T[K]>
    : T[K]
}

type UserResponse = typeof response
// 类型安全地读取深层数据
type UserName = UserResponse['data']['user']['name'] // string
```

### 5.4 Chainable 类型

```typescript
type Chainable<T = {}> = {
  option<K extends string, V>(
    key: K extends keyof T ? never : K,
    value: V
  ): Chainable<T & { [P in K]: V }>
  get(): T
}

declare const config: Chainable

const result = config
  .option('name', 'LC')
  .option('age', 25)
  .get()

// result 类型: { name: string; age: number }
```

### 5.5 元组转对象

```typescript
type TupleToObject<T extends readonly (string | number | symbol)[]> = {
  [P in T[number]]: P
}

const tuple = ['vue', 'react', 'angular'] as const
type FrameworkMap = TupleToObject<typeof tuple>
// { vue: 'vue'; react: 'react'; angular: 'angular' }
```

---

## 六、Flatten 类型一题多解

经典的类型体操题——把嵌套对象拍平：

```typescript
// 输入
type Input = {
  user: {
    name: string
    address: {
      city: string
    }
  }
  config: {
    theme: string
  }
}

// 期望输出
type Output = {
  'user.name': string
  'user.address.city': string
  'config.theme': string
}

// 实现
type Flatten<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends object
    ? Flatten<T[K], `${Prefix}${string & K}.`>
    : { [P in `${Prefix}${string & K}`]: T[K] }
}[keyof T]

// 合并成单个对象
type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends
  (k: infer I) => void ? I : never

type Flattened = UnionToIntersection<Flatten<Input>>
// { 'user.name': string; 'user.address.city': string; 'config.theme': string }
```

---

## 七、面试题

```typescript
// 题目1：实现 Partial
type MyPartial<T> = {
  [P in keyof T]?: T[P]
}

// 题目2：实现 Pick
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P]
}

// 题目3：实现 Exclude
type MyExclude<T, U> = T extends U ? never : T

// 题目4：实现 ReturnType
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never

// 题目5：实现 DeepReadonly
type MyDeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
      ? T[P]
      : MyDeepReadonly<T[P]>
    : T[P]
}
```

---

## 总结

| 概念 | 用途 | 复杂度 |
|------|------|--------|
| **条件类型** | 类型级别的 if/else | ⭐⭐ |
| **分布式条件类型** | 联合类型自动拆解 | ⭐⭐⭐ |
| **映射类型** | 遍历对象键生成新类型 | ⭐⭐ |
| **infer** | 在条件类型中推导类型 | ⭐⭐⭐⭐ |
| **模板字面量类型** | 字符串类型模式匹配 | ⭐⭐⭐ |
| **递归类型** | 处理嵌套结构 | ⭐⭐⭐⭐ |
| **UnionToIntersection** | 联合转交叉 | ⭐⭐⭐⭐⭐ |

> 类型体操的核心不是"炫技"，而是精确地描述数据约束。在工作中，80% 的场景用工具类型就能解决，剩下 20% 才需要 infer + 递归。
