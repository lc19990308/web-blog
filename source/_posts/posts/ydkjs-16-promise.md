---
title: "你不知道的JavaScript（十六）：Promise 深入理解——解决回调问题的终极方案"
date: 2026-06-26
categories: "你不知道的javascript"
description: "深入 Promise 的底层实现原理，从状态机、链式调用、错误传播到微任务调度，手写实现一个完整的 Promise"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

Promise 的核心理念非常简洁：

> Promise 是一个**未来值的占位符**——它代表一个异步操作的最终结果。

但 Promise 的价值不仅仅是"避免回调地狱"，它解决了回调模式的根本问题：
1. **控制反转**——回调把执行控制权交给了第三方，Promise 保持控制权
2. **信任问题**——回调可能被多次/延迟/不调用，Promise 保证一旦决议就不再变
3. **错误处理**——回调中 try-catch 失效，Promise 链式传递错误

---

## 一、Promise 的三种状态

Promise 的状态一旦改变就不可逆转：

```
Pending（待定）
  ├── resolve(value)  →  Fulfilled（已兑现）
  └── reject(reason)  →  Rejected（已拒绝）

状态不可逆：Fulfilled → ❌ Rejected（不能变）
            Rejected → ❌ Fulfilled（不能变）
```

```javascript
const p = new Promise((resolve, reject) => {
  // Promise 构造函数代码是同步执行的
  console.log('创建 Promise')

  // 状态只能改变一次
  resolve('成功')
  reject('失败') // 无效——已经 resolved
})

p.then(value => console.log(value)) // '成功'
```

---

## 二、Promise 链式调用

### 2.1 then 返回新 Promise

这是 Promise 最核心的特性——**每个 `then` 都返回一个新的 Promise**：

```javascript
const p1 = Promise.resolve(1)
const p2 = p1.then(value => {
  console.log(value) // 1
  return value * 2
})
const p3 = p2.then(value => {
  console.log(value) // 2
  return value * 3
})
const p4 = p3.then(value => {
  console.log(value) // 6
})

// p1 ≠ p2 ≠ p3 ≠ p4（都是不同的 Promise 对象）
```

### 2.2 then 返回值规则

```javascript
// 规则1：返回值不是 Promise → 包装为 Promise.resolve(returnValue)
Promise.resolve(1)
  .then(v => v + 1)          // 返回 2
  .then(v => console.log(v)) // 2

// 规则2：返回值是 Promise → 展开 Promise，等待其决议
Promise.resolve(1)
  .then(v => {
    return new Promise(resolve => {
      setTimeout(() => resolve(v * 2), 1000)
    })
  })
  .then(v => console.log(v)) // 1秒后输出 2

// 规则3：不返回任何值 → undefined
Promise.resolve(1)
  .then(v => {
    // 没有 return
  })
  .then(v => console.log(v)) // undefined

// 规则4：抛出异常 → Promise.reject(error)
Promise.resolve(1)
  .then(v => {
    throw new Error('出错了')
  })
  .catch(e => console.log(e.message)) // '出错了'
```

### 2.3 链式调用场景

```javascript
// 异步流程编排
fetchUser(id)
  .then(user => fetchOrders(user.id))
  .then(orders => fetchOrderDetails(orders[0].id))
  .catch(error => handleError(error))

// 每一步都能拿到上一步的结果
getUser()
  .then(user => getProfile(user.id))
  .then(profile => updateUI(user, profile))
  // 注意：这里不能直接拿到 user！因为链式传递
```

**如果你想在后续步骤中访问前面步骤的值**：

```javascript
// 方案1：嵌套（不推荐）
getUser().then(user => {
  return getProfile(user.id).then(profile => {
    return { user, profile }
  })
})

// 方案2：外部变量（不推荐）
let userData
getUser()
  .then(user => { userData = user; return getProfile(user.id) })
  .then(profile => updateUI(userData, profile))

// 方案3：Promise.all（推荐）
Promise.all([getUser(), getUser().then(u => getProfile(u.id))])
  .then(([user, profile]) => updateUI(user, profile))
```

---

## 三、错误处理

### 3.1 catch 的两种写法

```javascript
// 方式1：链式 catch
Promise.resolve(1)
  .then(v => { throw new Error('err') })
  .catch(e => console.log(e.message))

// 方式2：then 的第二个参数（不推荐，不能捕获同级的 then 内错误）
Promise.resolve(1).then(
  v => { throw new Error('err') },
  e => console.log('这个不会捕获到上面的错误'),
)
```

```javascript
// then 的第二个参数 vs catch 的关键区别
const p = Promise.resolve(1)

// catch 可以捕获之前所有 then 中的错误
p.then(v => { throw new Error('a') })
 .then(v => console.log('跳过'))
 .catch(e => console.log(e.message)) // 'a'

// then(ok, fail) 只捕获当前 then 之前的错误
p.then(
  v => { throw new Error('a') },
  e => console.log('不会执行到这里'),
).then(v => console.log('跳过')) // 这里跳过
```

### 3.2 全局未捕获的 Promise 错误

```javascript
// 被 catch 处理过的错误不会冒泡
Promise.reject('err').catch(() => {}) // 已处理

// 没有 catch 的 reject 会触发全局事件
Promise.reject('未处理的错误')

// 浏览器：window 的 unhandledrejection 事件
window.addEventListener('unhandledrejection', (event) => {
  console.log('未处理的 Promise 拒绝:', event.reason)
  event.preventDefault() // 阻止默认的控制台错误输出
})

// Node.js：process 的 unhandledRejection 事件
process.on('unhandledRejection', (reason, promise) => {
  console.log('未处理拒绝:', reason)
})
```

### 3.3 推荐的错误处理模式

```javascript
// ✅ 每条 Promise 链最后都有 catch
doSomething()
  .then(doSomethingElse)
  .then(finalHandler)
  .catch(handleError) // 捕获所有错误

// ✅ 在关键步骤 catch 并恢复
fetchData()
  .catch(() => ({ data: [] })) // API 失败时返回空数据
  .then(renderData)

// ❌ 不要吞掉错误
doSomething()
  .catch(e => {}) // 空的 catch → 错误静默消失
```

---

## 四、Promise 静态方法

### 4.1 Promise.resolve

```javascript
// 包装普通值
const p = Promise.resolve(42)
p.then(v => console.log(v)) // 42

// 包装 Promise
const original = new Promise(r => setTimeout(() => r('done'), 1000))
const wrapped = Promise.resolve(original)
wrapped === original // true（Promise.resolve 直接返回传入的 Promise）

// 包装 thenable（有 then 方法的对象）
const thenable = {
  then(resolve) {
    resolve('thenable')
  },
}
Promise.resolve(thenable).then(v => console.log(v)) // 'thenable'
```

### 4.2 Promise.reject

```javascript
const p = Promise.reject(new Error('失败'))
p.catch(e => console.log(e.message)) // '失败'
```

### 4.3 Promise.all

```javascript
// 全部成功 → 返回结果数组
// 任意失败 → 立即返回第一个失败的错误
const promises = [
  fetch('/api/users'),
  fetch('/api/posts'),
  fetch('/api/comments'),
]

Promise.all(promises)
  .then(([users, posts, comments]) => {
    console.log('全部加载完成')
    render({ users, posts, comments })
  })
  .catch(err => {
    console.log('至少一个请求失败:', err)
  })

// 注意：Promise.all 是"快速失败"的
// 一个请求失败，其他请求的结果即使返回也被忽略
const fastFail = Promise.all([
  fetch('/api/slow?delay=5000'), // 5秒后成功
  fetch('/api/fail'),             // 立即失败
])

fastFail.catch(e => console.log('快速失败')) // 立即触发
```

### 4.4 Promise.allSettled

```javascript
// 所有 Promise 都 settle（fulfilled 或 rejected）后返回
// 不快速失败——等待所有 Promise 完成
const promises = [
  Promise.resolve(1),
  Promise.reject('err'),
  Promise.resolve(3),
]

Promise.allSettled(promises).then(results => {
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      console.log(`Promise ${i}: 成功，值 = ${result.value}`)
    } else {
      console.log(`Promise ${i}: 失败，原因 = ${result.reason}`)
    }
  })
})
// 输出：
// Promise 0: 成功，值 = 1
// Promise 1: 失败，原因 = err
// Promise 2: 成功，值 = 3
```

### 4.5 Promise.race

```javascript
// 返回第一个 settle 的 Promise（不管成功还是失败）
const timeout = (ms) => new Promise((_, reject) =>
  setTimeout(() => reject(new Error('超时')), ms)
)

Promise.race([
  fetch('/api/data'),
  timeout(5000), // 5秒超时
])
  .then(data => console.log('数据:', data))
  .catch(err => console.log('超时或其他错误:', err))
```

### 4.6 Promise.any（ES2021）

```javascript
// 返回第一个 fulfilled 的 Promise
// 如果全部 rejected，返回 AggregateError
const promises = [
  fetch('/api/server1').catch(() => {}),
  fetch('/api/server2').catch(() => {}),
  fetch('/api/server3').catch(() => {}),
]

Promise.any(promises)
  .then(result => console.log('至少一个服务器可用:', result))
  .catch(err => {
    console.log('所有服务器都不可用')
    console.log(err.errors) // 所有拒绝原因
  })
```

---

## 五、微任务调度

Promise 的 then/catch/finally 回调是**微任务（MicroTask）**：

```javascript
console.log('1: 同步')

Promise.resolve().then(() => {
  console.log('3: 微任务')
})

console.log('2: 同步')

// 输出：1 2 3
```

### 5.1 Promise vs setTimeout 的执行顺序

```javascript
setTimeout(() => console.log('宏任务'), 0)
Promise.resolve().then(() => console.log('微任务'))

// 输出：
// 微任务
// 宏任务
```

### 5.2 queueMicrotask

```javascript
// 直接添加微任务
queueMicrotask(() => {
  console.log('微任务')
})

// 相当于
Promise.resolve().then(() => {
  console.log('微任务')
})
```

---

## 六、手写简易 Promise

```javascript
class MyPromise {
  constructor(executor) {
    this.state = 'pending'    // pending / fulfilled / rejected
    this.value = undefined    // resolve 的值
    this.reason = undefined   // reject 的原因
    this.onFulfilledCallbacks = []
    this.onRejectedCallbacks = []

    const resolve = (value) => {
      if (this.state !== 'pending') return
      this.state = 'fulfilled'
      this.value = value
      this.onFulfilledCallbacks.forEach(cb => cb())
    }

    const reject = (reason) => {
      if (this.state !== 'pending') return
      this.state = 'rejected'
      this.reason = reason
      this.onRejectedCallbacks.forEach(cb => cb())
    }

    try {
      executor(resolve, reject)
    } catch (e) {
      reject(e)
    }
  }

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v
    onRejected = typeof onRejected === 'function' ? onRejected : e => { throw e }

    const newPromise = new MyPromise((resolve, reject) => {
      const handleFulfilled = () => {
        queueMicrotask(() => {
          try {
            const result = onFulfilled(this.value)
            resolvePromise(newPromise, result, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }

      const handleRejected = () => {
        queueMicrotask(() => {
          try {
            const result = onRejected(this.reason)
            resolvePromise(newPromise, result, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }

      if (this.state === 'fulfilled') {
        handleFulfilled()
      } else if (this.state === 'rejected') {
        handleRejected()
      } else {
        this.onFulfilledCallbacks.push(handleFulfilled)
        this.onRejectedCallbacks.push(handleRejected)
      }
    })

    return newPromise
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }

  finally(callback) {
    return this.then(
      value => MyPromise.resolve(callback()).then(() => value),
      reason => MyPromise.resolve(callback()).then(() => { throw reason }),
    )
  }

  static resolve(value) {
    if (value instanceof MyPromise) return value
    return new MyPromise(resolve => resolve(value))
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason))
  }

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const results = []
      let count = 0
      promises.forEach((p, i) => {
        MyPromise.resolve(p).then(
          value => {
            results[i] = value
            if (++count === promises.length) resolve(results)
          },
          reject,
        )
      })
    })
  }
}

function resolvePromise(newPromise, result, resolve, reject) {
  if (newPromise === result) {
    reject(new TypeError('Chaining cycle'))
    return
  }

  if (result && (typeof result === 'object' || typeof result === 'function')) {
    let called = false
    try {
      const then = result.then
      if (typeof then === 'function') {
        then.call(
          result,
          v => {
            if (called) return
            called = true
            resolvePromise(newPromise, v, resolve, reject)
          },
          e => {
            if (called) return
            called = true
            reject(e)
          },
        )
      } else {
        resolve(result)
      }
    } catch (e) {
      if (called) return
      called = true
      reject(e)
    }
  } else {
    resolve(result)
  }
}
```

---

## 总结

1. **Promise 是状态机**：pending → fulfilled/rejected，状态不可逆
2. **链式调用**：每个 `then` 返回新 Promise，支持异步流程编排
3. **错误传递链**：`catch` 捕获链上任何位置的错误
4. **静态方法**：`Promise.resolve`/`reject`/`all`/`allSettled`/`race`/`any`
5. **微任务**：Promise 回调在微任务队列执行，优先级高于宏任务
6. **Promise 解决了"信任问题"**：一次决议、不可变、链式传递

> 下一篇将深入 **Generator + Promise**，理解 async/await 的底层实现。
