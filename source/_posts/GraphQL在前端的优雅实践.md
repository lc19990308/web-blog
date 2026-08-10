---
title: "GraphQL 在前端的优雅实践：从 REST 到 GraphQL"
date: 2026-07-11
categories: "网络协议"
description: "从 RESTful API 的痛点出发，讲解 GraphQL 在前端的完整实践——查询、变更、缓存、订阅，以及与 React 的集成"
tags: ["网络协议", "JavaScript"]
copyright: true
---

## 前言

GraphQL 是由 Facebook 开发的数据查询语言，它解决了 RESTful API 中**数据过取（over-fetching）**和**数据不足（under-fetching）**的经典问题。

> 前端需要什么数据，就查询什么数据——不多不少。

---

## 一、REST 的痛点

### 1.1 典型场景：获取文章及作者

```ts
// REST 方式
GET /api/posts         // 拿到文章列表，但可能返回 20 个字段，你只需要标题
GET /api/posts/1       // 获取单篇文章
GET /api/posts/1/comments // 再请求评论——N+1 问题
```

### 1.2 根本问题

-   前端**无法控制**服务端返回的数据结构
-   多个端点组合导致**网络请求过多**
-   版本迭代困难，新旧客户端需求冲突

---

## 二、GraphQL 基础

### 2.1 查询（Query）

```graphql
# 前端精确指定需要的字段
query {
  post(id: 1) {
    title
    publishedAt
    author {
      name
      avatar
    }
    comments {
      content
      createdAt
    }
  }
}
```

### 2.2 变更（Mutation）

```graphql
mutation {
  createPost(input: {
    title: "Hello GraphQL"
    content: "This is my first post"
  }) {
    id
    title
    createdAt
  }
}
```

### 2.3 订阅（Subscription）

```graphql
subscription {
  commentAdded(postId: 1) {
    id
    content
    author { name }
  }
}
```

---

## 三、前端集成：Apollo Client

### 3.1 初始化

```ts
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'

const client = new ApolloClient({
  uri: 'https://api.example.com/graphql',
  cache: new InMemoryCache()
})
```

### 3.2 React 中使用

```tsx
import { useQuery, useMutation } from '@apollo/client'

const GET_POSTS = gql`
  query GetPosts {
    posts {
      id
      title
      author { name }
    }
  }
`

function PostList() {
  const { loading, error, data } = useQuery(GET_POSTS)

  if (loading) return <Skeleton />
  if (error) return <Error message={error.message} />

  return (
    <ul>
      {data.posts.map(post => (
        <li key={post.id}>{post.title} — {post.author.name}</li>
      ))}
    </ul>
  )
}
```

### 3.3 缓存策略

Apollo 的 InMemoryCache 提供规范化缓存（Normalized Cache）：

```ts
const client = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies: {
      Post: {
        fields: {
          comments: {
            // 合并分页数据
            merge(existing = [], incoming) {
              return [...existing, ...incoming]
            }
          }
        }
      }
    }
  })
})
```

---

## 四、Fragments —— 片段复用

```graphql
fragment PostFields on Post {
  id
  title
  excerpt
  publishedAt
}

# 在多个查询中复用
query {
  recentPosts {
    ...PostFields
    author { name }
  }
  featuredPost {
    ...PostFields
    content
  }
}
```

---

## 五、GraphQL vs REST 对比

| 维度 | REST | GraphQL |
|------|------|---------|
| 数据获取 | 固定结构 | 前端指定 |
| 网络请求 | 多个端点 | 单一端点 |
| 类型系统 | 无（或 OpenAPI） | 强类型 Schema |
| 缓存 | HTTP 缓存 | 规范化缓存 |
| 学习成本 | 低 | 中 |
| 工具链 | Postman | GraphiQL / Apollo DevTools |
| 适用场景 | 简单 CRUD | 复杂数据依赖 |

---

## 六、最佳实践

1. **查询最小化** —— 只查询你真正需要的字段
2. **使用 Fragments** —— 避免重复定义字段集
3. **利用 Persisted Queries** —— 生产环境用哈希查询，减少请求体积
4. **设置合理的缓存策略** —— `fetchPolicy`： `cache-first` / `network-only` / `cache-and-network`
5. **对敏感操作添加认证** —— Mutation 必须鉴权

---

## 七、总结

GraphQL 让前端拥有了"精确取数"的能力，特别适合数据关系复杂的场景。但也要注意——**不要因为它"酷"就盲目引入**，小项目用 REST 可能更高效。
