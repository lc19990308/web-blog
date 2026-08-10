---
title: "创建自定义 Skill：AI 编程代理的工作流模板"
date: 2026-07-22
categories: "AI"
description: "Skill 是 AI 编程代理（Codex）的可复用任务模板，本文介绍 Skill 的概念、创建方法与最佳实践，帮你打造专属工作流"
tags: ["AI"]
copyright: true
---

## 前言

Skill 是 AI 编程代理（如 AtomCode）中的**可复用任务模板**。你可以把常用的工作流程编写为 Skill，像调用函数一样执行。

```
Skill = 可复用的提示词模板 + 执行逻辑
```

**为什么需要 Skill？**

| 场景 | 没有 Skill | 有 Skill |
|------|-----------|----------|
| 创建新组件 | 每次都要详细描述 | `use_skill create-vue-component` |
| 代码审查 | 每次都要说审查标准 | `use_skill code-review` |
| 添加 API 接口 | 每次都要说明规范 | `use_skill add-api-endpoint` |

---

## 一、Skill 的组成

一个 Skill 包含以下要素：

```yaml
name: "skill-name"           # 唯一名称
description: "功能描述"       # 简短描述，用于发现
prompt: |
  这里是提示词模板
  可以使用 {{变量名}} 传递参数
```

### 简单示例

```yaml
# ~/.atomcode/skills/create-component.yaml
name: "create-component"
description: "创建 Vue 组件"
prompt: |
  在 src/components/ 下创建一个 Vue 组件

  组件需求：
  - 名称：{{name}}
  - 类型：{{type}}
  - Props：{{props}}
  - 事件：{{events}}

  要求：
  - 使用 Composition API + <script setup>
  - 添加 TypeScript 类型
  - 添加基础样式 scoped
```

**使用：**
```bash
use_skill create-component --name "UserCard" --type "展示型" --props "user, loading"
```

---

## 二、Skill 模板语法

### 2.1 变量替换

```markdown
# 使用 {{变量名}} 定义参数
项目名称：{{project_name}}
框架：{{framework}}
路由：{{router}}

# 带默认值
端口号：{{port:3000}}
```

### 2.2 条件判断

```markdown
{% if hasAuth %}
- 添加登录页面（/login）
- 添加路由守卫（beforeEach）
- 存储 token 到 localStorage
{% endif %}

{% if type == "modal" %}
- 使用 Teleport 渲染到 body
- 添加遮罩层点击关闭
- 支持键盘 ESC 关闭
{% endif %}
```

### 2.3 循环

```markdown
{% for field in fields %}
- {{field.name}}：{{field.type}}（{{field.required ? '必填' : '可选'}}）
{% endfor %}
```

---

## 三、创建 Skill 的步骤

### 3.1 确定 Skills 目录

```bash
# 全局 Skills 目录
~/.atomcode/skills/

# 项目级 Skills 目录
./.atomcode/skills/
```

### 3.2 创建 Skill 文件

```bash
# 创建目录
mkdir -p ~/.atomcode/skills

# 创建 Skill 文件
touch ~/.atomcode/skills/code-review.yaml
```

### 3.3 编写 Skill 内容

```yaml
# ~/.atomcode/skills/code-review.yaml
name: "code-review"
description: "对当前代码变更进行代码审查"
prompt: |
  请对以下 Git 变更进行代码审查：

  Git 变更：
  {{# 自动获取 git diff 作为上下文}}

  请按以下维度检查：

  1. 正确性（高优先级）
     - 是否有逻辑错误？
     - 边界情况是否处理？
     - 异步操作是否有错误处理？

  2. 安全性（高优先级）
     - 用户输入是否校验？
     - 是否存在 XSS/SQL 注入风险？
     - API Key 等敏感信息是否泄露？

  3. 性能
     - 是否有不必要的重复计算？
     - 是否存在内存泄漏风险？
     - 数据库查询是否优化？

  4. 可维护性
     - 命名是否清晰？
     - 代码是否过于复杂？
     - 是否有重复代码需要提取？

  5. 测试
     - 新功能是否包含测试？
     - 测试是否覆盖了主要场景？

  请按优先级从高到低输出问题列表。
```

---

## 四、常用 Skill 示例

### 4.1 API 接口 Skill

```yaml
name: "add-api"
description: "添加一个新的 API 接口"
prompt: |
  在 src/api/ 下添加一个 API 方法

  API 信息：
  - 功能：{{description}}
  - 路径：{{path}}
  - 方法：{{method:GET}}
  - 请求参数：{{params}}
  - 响应类型：{{response_type}}

  要求：
  1. 统一使用封装的 request 方法
  2. 添加完整的 TypeScript 类型
  3. 添加错误处理
  4. 更新相关 API 文档
```

### 4.2 组件提取 Skill

```yaml
name: "extract-component"
description: "从现有代码中提取为独立组件"
prompt: |
  从 {{file}} 中提取 {{component_name}} 组件

  提取规则：
  1. 将相关代码抽取到 src/components/{{component_name}}.vue
  2. 定义清晰的 props 接口
  3. 如果有事件，使用 emit
  4. 如果有插槽，使用 slot
  5. 更新原文件中的引用
  6. 添加 JSDoc/TSDoc 注释
```

---

## 五、Skill 最佳实践

### 5.1 Skill 设计原则

```markdown
1. 单一职责
   - 一个 Skill 只做一件事
   - 不要试图在一个 Skill 里塞太多需求

2. 参数化
   - 把可能变化的部分定义为参数
   - 固定不变的部分写死在模板中

3. 明确输出
   - 说明 Skill 执行后会产生什么效果
   - 列出会修改哪些文件

4. 先写提纲，再细化
   - 先用 Plan 模式让 AI 出计划
   - 确认后再执行
```

### 5.2 Skill 管理

```bash
# 列出所有可用 Skill
list_skills

# 查看 Skill 详情
cat ~/.atomcode/skills/my-skill.yaml

# 分享 Skill 给团队
# 将 .yaml 文件提交到项目的 .atomcode/skills/ 目录
```

---

## 六、实战：创建一个完整的 Skill

下面创建一个**「创建 Vue 页面」**的完整 Skill：

```yaml
name: "create-page"
description: "创建新的 Vue 路由页面"
prompt: |
  在项目中创建一个新的路由页面

  页面信息：
  - 名称：{{name}}
  - 路径：/{{path:name}}
  - 是否需要登录：{{auth:true}}
  - 页面功能描述：{{description}}

  执行步骤：
  1. 在 src/views/ 下创建页面文件
     - 文件名：{{name}}.vue
     - 使用 Composition API
     - 添加基础模板结构

  2. 在路由配置中添加
     - 懒加载 import()
     - 设置 meta 信息（title、requiresAuth）

  3. 在导航菜单中添加链接（如果有菜单组件）

  注意事项：
  - 不要修改已有文件的功能
  - 添加必要的注释
  - 保持代码风格与项目一致
```

```bash
# 使用
use_skill create-page \
  --name "UserProfile" \
  --path "user/profile" \
  --auth "true" \
  --description "用户个人资料页面，包含头像上传和个人信息编辑"
```

---

## 总结

```markdown
Skill 的核心价值：把重复性工作变成一行命令。

创建 Skill 三步走：
1. 识别重复性工作（需求→任务→模板）
2. 编写模板（确定参数、步骤、要求）
3. 持续迭代（根据实际使用不断优化）

好的 Skill 可以让团队效率翻倍——减少沟通成本、统一规范、降低错误率。
```
