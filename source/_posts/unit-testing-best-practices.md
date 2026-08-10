---
title: "单元测试最佳实践：AAA 模式、Mock 策略与边界覆盖"
date: 2026-06-25
categories: "测试"
description: "深入单元测试的实用方法论，涵盖 AAA（Arrange-Act-Assert）模式、Mock 与 Stub 策略、边界值测试，以及实测覆盖率提升技巧"
tags: ["测试", "JavaScript"]
copyright: true
---

## 前言

很多团队写了单元测试但效果不好——要么是"为了覆盖率"的无效测试，要么测试太脆弱每次重构都要重写。

好的单元测试有三个特征：
1. **可信赖** — 测试失败一定代表代码有 bug
2. **可维护** — 重构代码时测试改动小
3. **可读性强** — 一眼能看出测什么

本文从模式到实战，讲解怎么写好单元测试。

---

## 一、AAA 模式

AAA（Arrange-Act-Assert）是单元测试的标准结构：

```javascript
describe('计算器', () => {
  it('两数相加', () => {
    // Arrange（准备）：设置测试环境和输入
    const calculator = new Calculator()
    const a = 1
    const b = 2

    // Act（执行）：调用被测方法
    const result = calculator.add(a, b)

    // Assert（断言）：验证结果
    expect(result).toBe(3)
  })
})
```

### 1.1 错误的写法

```javascript
// ❌ 太多职责
describe('用户服务', () => {
  it('用户相关测试', () => {
    // 一个 it 里测了太多东西
    const user = createUser()
    expect(user.name).toBe('LC')
    
    user.updateName('New')
    expect(user.name).toBe('New')
    
    const roles = user.getRoles()
    expect(roles).toContain('user')

    const canDelete = user.hasPermission('delete')
    expect(canDelete).toBe(false)
  })
})

// ✅ 拆分
describe('用户服务', () => {
  it('创建用户时设置默认名', () => {
    const user = createUser()
    expect(user.name).toBe('LC')
  })

  it('更新用户名', () => {
    const user = createUser()
    user.updateName('New')
    expect(user.name).toBe('New')
  })

  it('新用户默认角色为 user', () => {
    const user = createUser()
    expect(user.getRoles()).toContain('user')
  })
})
```

### 1.2 Arrange 的三种写法

```javascript
// 写法1：直接在 it 内准备（适合简单场景）
it('加法', () => {
  const calc = new Calculator() // 准备
  const result = calc.add(1, 2) // 执行
  expect(result).toBe(3)        // 断言
})

// 写法2：beforeEach 准备（适合重复使用）
let calc
beforeEach(() => {
  calc = new Calculator()
})
it('加法', () => expect(calc.add(1, 2)).toBe(3))
it('减法', () => expect(calc.sub(5, 3)).toBe(2))

// 写法3：工厂函数（推荐——灵活且可读）
function createUser(overrides = {}) {
  return {
    id: 1,
    name: 'LC',
    email: 'lc@test.com',
    role: 'user',
    ...overrides,
  }
}

it('管理员有删除权限', () => {
  const admin = createUser({ role: 'admin' })
  expect(admin.hasPermission('delete')).toBe(true)
})

it('普通用户无删除权限', () => {
  const user = createUser({ role: 'user' })
  expect(user.hasPermission('delete')).toBe(false)
})
```

---

## 二、Mock 与 Stub

### 2.1 Mock vs Stub vs Spy

| 术语 | 作用 | 验证点 |
|------|------|--------|
| **Stub** | 提供预设返回值 | 不验证调用 |
| **Mock** | 预设行为 + 验证调用 | 是否被调用、调用次数、参数 |
| **Spy** | 包装真实对象 | 真实行为 + 调用信息 |

### 2.2 Stub 示例

```javascript
// Stub：替换外部依赖，返回固定值
import { fetchUser } from './api'

// ❌ 测试依赖真实 API
it('获取用户信息', async () => {
  const user = await fetchUser(1)
  expect(user.name).toBe('LC')
})

// ✅ Stub API 调用
jest.mock('./api')
import { fetchUser } from './api'

it('获取用户信息（stub）', async () => {
  fetchUser.mockResolvedValue({ id: 1, name: 'LC' })

  const user = await fetchUser(1)
  expect(user.name).toBe('LC')
})
```

### 2.3 Mock 示例

```javascript
// Mock：验证函数被正确调用
import { sendEmail } from './email'
import { notifyUser } from './notification'

jest.mock('./email')

it('通知用户时会发送邮件', () => {
  notifyUser('user@test.com', '欢迎加入')

  expect(sendEmail).toHaveBeenCalled()
  expect(sendEmail).toHaveBeenCalledTimes(1)
  expect(sendEmail).toHaveBeenCalledWith(
    'user@test.com',
    expect.stringContaining('欢迎')
  )
})
```

### 2.4 Spy 示例

```javascript
// Spy：观察真实对象的方法调用
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
}

it('记录错误日志', () => {
  const errorSpy = vi.spyOn(logger, 'error')

  processData({ invalid: 'data' }, logger)

  expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('数据格式错误'))
})
```

### 2.5 时间 Mock

```javascript
// 测试与时间相关的逻辑
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('30 分钟后标记会话过期', () => {
  const session = createSession()
  expect(session.isExpired()).toBe(false)

  // 快进 30 分钟
  vi.advanceTimersByTime(30 * 60 * 1000)

  expect(session.isExpired()).toBe(true)
})

it('setTimeout 被正确调用', () => {
  const fn = vi.fn()
  setTimeout(fn, 1000)

  vi.advanceTimersByTime(1000)
  expect(fn).toHaveBeenCalled()
})
```

---

## 三、边界覆盖测试

### 3.1 等价类划分

```javascript
// 测试场景：用户年龄校验（0-150 合法）
function validateAge(age) {
  if (typeof age !== 'number') return '必须为数字'
  if (!Number.isInteger(age)) return '必须为整数'
  if (age < 0) return '年龄不能为负'
  if (age > 150) return '年龄超出范围'
  return null // 合法
}

it('验证年龄——等价类覆盖', () => {
  // 有效等价类
  expect(validateAge(0)).toBeNull()
  expect(validateAge(25)).toBeNull()
  expect(validateAge(150)).toBeNull()

  // 无效等价类
  expect(validateAge(-1)).toBe('年龄不能为负')
  expect(validateAge(151)).toBe('年龄超出范围')
  expect(validateAge('abc')).toBe('必须为数字')
  expect(validateAge(25.5)).toBe('必须为整数')
})
```

### 3.2 边界值分析

```javascript
it('验证年龄——边界值覆盖', () => {
  // 下边界附近
  expect(validateAge(-1)).toBe('年龄不能为负')
  expect(validateAge(0)).toBeNull()

  // 上边界附近
  expect(validateAge(150)).toBeNull()
  expect(validateAge(151)).toBe('年龄超出范围')

  // 空值
  expect(validateAge(null)).toBe('必须为数字')
  expect(validateAge(undefined)).toBe('必须为数字')
})
```

### 3.3 数组/字符串边界

```javascript
it('数组操作——边界覆盖', () => {
  // 空数组
  expect(first([])).toBeUndefined()
  expect(last([])).toBeUndefined()

  // 单元素数组
  expect(first([1])).toBe(1)
  expect(last([1])).toBe(1)

  // 多元素
  expect(first([1, 2, 3])).toBe(1)
  expect(last([1, 2, 3])).toBe(3)
})
```

---

## 四、覆盖率陷阱

### 4.1 覆盖率 ≠ 质量

```javascript
// ❌ 写了很多断言但没测到核心逻辑
it('测试', () => {
  expect(1 + 1).toBe(2)
  expect(typeof 'str').toBe('string')
  // 被测函数根本没调用
})

// ✅ 有价值的测试
it('用户登录——密码错误', async () => {
  const result = await login('user@test.com', 'wrong-password')
  expect(result.success).toBe(false)
  expect(result.error).toBe('密码错误')
})
```

### 4.2 关注哪些代码

```javascript
// ✅ 高优先级测试
// - 核心业务逻辑（计算、校验、转换）
// - 边界情况（空值、异常、超长）
// - 关键路径（登录、支付、权限）
// - 复杂条件分支（if-else、switch）

// ❌ 低优先级测试
// - 简单的 getter/setter
// - UI 组件样式
// - 第三方库的包装（信任库本身）
// - 明显的 CRUD 透传
```

---

## 五、实用技巧

### 5.1 测试描述规范

```javascript
// ❌ 模糊的描述
it('测试登录功能')

// ✅ 清晰的描述
it('用户输入正确密码后可以登录')
it('用户输入错误密码时显示错误提示')
it('用户连续输错 5 次后账号被锁定')
it('用户已锁定后即使输入正确密码也登录失败')

// 模板：it('在[条件]下，[操作]会[预期结果]')
```

### 5.2 避免测试之间的依赖

```javascript
// ❌ 测试之间共享状态
let count = 0
it('加 1', () => { count++; expect(count).toBe(1) })
it('加 1 再', () => { count++; expect(count).toBe(2) })

// ✅ 每个测试独立
it('从 0 开始加 1 得 1', () => {
  const counter = new Counter()
  counter.increment()
  expect(counter.value).toBe(1)
})

it('从 5 开始加 1 得 6', () => {
  const counter = new Counter(5)
  counter.increment()
  expect(counter.value).toBe(6)
})
```

### 5.3 快照测试

```javascript
// 快照测试：确保输出不意外变化
it('用户信息格式化快照', () => {
  const user = { id: 1, name: 'LC', roles: ['admin'], createdAt: '2026-06-25' }
  expect(formatUser(user)).toMatchSnapshot()
})

// 更新快照
// npx vitest --update
```

---

## 六、测试金字塔

```javascript
// 测试金字塔——从下往上，数量递减
//
//        ╱╲
//       ╱ E2E ╲         少量：关键用户流程
//      ╱────────╲
//     ╱ 集成测试 ╲      适量：模块间的交互
//    ╱────────────╲
//   ╱   单元测试    ╲    大量：纯逻辑、工具函数
//  ╱────────────────╲

// 分配比例建议
// 单元测试：70%  — 工具函数、业务逻辑、数据转换
// 集成测试：20%  — API 调用、数据库交互、组件组合
// E2E 测试：10%  — 关键用户流程（登录、下单）
```

---

## 七、实战清单

```javascript
/**
 * 单元测试检查清单
 *
 * □ 每个 it 只测一件事
 * □ 使用 AAA 模式（Arrange-Act-Assert）
 * □ 测试描述清晰，能读懂的失败信息
 * □ 覆盖边界值（0、空、负、大量、null）
 * □ Mock 外部依赖（API、数据库、时间）
 * □ 测试之间不共享状态
 * □ 不开心的路径（失败、异常）也要测
 * □ 纯函数优先测试，副作用次之
 * □ 快照测试用于防止意外变更
 * □ 不要在测试中验证第三方库的行为
 */
```

---

## 总结

```
好的单元测试 = AAA 模式 + 边界覆盖 + 正确 Mock + 独立运行

AAA 模式：Arrange（准备）→ Act（执行）→ Assert（断言）
边界覆盖：等价类划分 + 边界值分析 + 异常路径
Mock 策略：Stub 返回值、Mock 验证调用、Spy 观察行为
独立运行：不依赖共享状态、不依赖真实 IO、不依赖其他测试

最终目标：测试是代码行为的"活文档"——读测试就能知道代码应该怎么工作。
```
