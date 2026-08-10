---
title: "Chrome DevTools 高级调试技巧：不止是 F12"
date: 2025-06-23
categories: "调试"
description: "从 Performance 面板到 Network 分析，从断点调试到 Coverage 检测，系统掌握 Chrome DevTools 的 15+ 个实用调试技巧"
tags: ["调试", "JavaScript"]
copyright: true
---

## 前言

绝大多数开发者只用过 DevTools 的 20% 功能——Console 打 log、Elements 看样式、Network 看请求。但 DevTools 真正的威力远不止于此。

本文分享 **15+ 个高级调试技巧**，帮你从"能用"到"会用"。

---

## 一、Console 面板

### 1.1 console.assert——条件断言

只有条件为 `false` 时才打印，避免满屏 log：

```javascript
const value = getData()
console.assert(value !== undefined, '数据不应该为 undefined', value)
// 只有 value 为 undefined 时才输出
```

### 1.2 console.table——表格化输出

```javascript
const users = [
  { name: '张三', age: 25, role: 'admin' },
  { name: '李四', age: 30, role: 'user' },
]
console.table(users)
// 以表格形式展示，一目了然
```

### 1.3 console.time——精确计时

```javascript
console.time('数据处理')
// ... 执行代码 ...
console.timeEnd('数据处理') // 输出：数据处理: 1234ms

// 带标签的计数器
console.time('fetch')
await fetch('/api/data')
console.timeLog('fetch', '第一次请求完成') // 中间打点
await fetch('/api/more')
console.timeEnd('fetch')
```

### 1.4 console.trace——堆栈追踪

```javascript
function a() { b() }
function b() { c() }
function c() { console.trace('调用链') }
a()
// 输出完整调用栈：a → b → c
```

### 1.5 $0 快捷引用

```javascript
// 在 Elements 面板选中元素后，在 Console 中可以直接用 $0 引用
$0                                    // 当前选中的元素
$0.style.backgroundColor = 'red'      // 直接修改样式
$0.dataset                             // 查看 data-* 属性

// $$ 返回所有匹配选择器的元素数组（类似 querySelectorAll）
$$('button').forEach(btn => btn.disabled = true)
```

---

## 二、Sources 面板——断点调试

### 2.1 条件断点

右键行号 → "Add conditional breakpoint"：

```javascript
for (let i = 0; i < 1000; i++) {
  const item = process(items[i])
  // 只在这个条件满足时停住
  // 条件：items[i].id === 'target'
}
```

### 2.2 DOM 断点

在 Elements 面板中右键元素 → Break on：

| 类型 | 触发时机 | 适用场景 |
|------|---------|---------|
| **Subtree modifications** | 子节点增删 | 组件被意外替换 |
| **Attribute modifications** | 属性变化 | class/style 被谁修改 |
| **Node removal** | 节点被删除 | 元素消失问题 |

### 2.3 异步调用栈

当代码中有 `setTimeout` / `Promise` / `async` 时，开启 **Async** 开关可以追踪完整调用链：

```
Call Stack (async):
  handleClick   (app.js:15)    ← 原始调用
  waitAndLog    (app.js:20)    ← Promise 回调
  (async)                      ← 异步边界
```

### 2.4 Overrides——持久化修改

在 Sources > Overrides 中可以**临时修改线上代码并持久化到本地磁盘**：

1. 选择文件夹 → 允许
2. 在 Sources 中修改文件 → 自动保存到本地
3. 页面刷新后修改依然生效

**适合场景：** 调试线上问题、快速验证修复方案。

---

## 三、Network 面板

### 3.1 模拟慢网速

Presets 中的预设：

| 预设 | 下载速度 | 上传速度 | 延迟 |
|------|---------|---------|------|
| Slow 3G | 400kbps | 400kbps | 400ms |
| Fast 3G | 1.5Mbps | 750kbps | 150ms |
| 自定义 | 可配置 | 可配置 | 可配置 |

### 3.2 请求拦截（Block Request）

右键请求 → **Block Request URL**：

```
场景：第三方 CDN 挂了，页面会怎样？
→ 直接模拟 CDN 不可用，验证页面的降级方案
```

### 3.3 筛选与搜索

```
# 按类型筛选
img     # 只看图片
js:     # 只看 JS
css:    # 只看 CSS

# 按状态码筛选
200     # 只看成功请求
404     # 只看失败的
500     # 只看服务端错误

# 按住 Cmd/Ctrl 多选
```

### 3.4 发起重放（Replay XHR）

右键请求 → **Replay XHR**：

```
场景：调试某个接口返回的数据
→ 不用刷新页面，直接重放请求看最新结果
```

---

## 四、Performance 面板

### 4.1 录制与解读

点击 Record 按钮（或 Cmd+E），操作页面后停止：

```
关键指标解读：
┌─────────────────────────────────────────────┐
│  FPS（帧率）     绿色越高越好，红色表示卡顿   │
│  CPU             满表示瓶颈在 CPU              │
│  NET             网络请求时间线                │
│  Main            主线程活动（最关键）          │
│  Summary         各阶段耗时占比                │
└─────────────────────────────────────────────┘
```

**排查卡顿的步骤：**
1. 看 FPS 是否有红色
2. 看 Main 中哪个 Task 耗时最长
3. 点击 Task 看调用栈
4. 定位到具体代码行

### 4.2 检测强制重排（Layout Thrashing）

Performance 录制中，留意黄色三角警告 ⚠️：

```
Layout 后面跟着黄色警告 → 说明发生了强制重排
通常是因为：在读取布局属性（如 offsetHeight）前
先修改了样式（如 style.height = ...）
```

### 4.3 Web Vitals 实时监控

Performance > Experience 面板可以实时看到：

- **CLS**（累计布局偏移）：页面元素是否跳动
- **LCP**（最大内容绘制）：首屏加载时间

---

## 五、Application 面板

### 5.1 存储管理

| 存储类型 | 清理方式 | 适用场景 |
|---------|---------|---------|
| Local Storage | 双击 → Clear | 应用配置缓存 |
| Session Storage | 同上 | 会话级数据 |
| IndexedDB | 删除数据库 | 离线数据存储 |
| Cache Storage | 删除缓存 | Service Worker 缓存 |
| Cookies | 逐个删除 | 认证 token |

### 5.2 Service Workers

Application > Service Workers：

```
● 状态：activated and is running   ← 正常运行
○ Offline 复选框                   ← 离线模式测试
```

勾选 **Offline** 可以测试应用的**离线体验**——PWA 必备。

---

## 六、Lighthouse 面板

生成性能报告：

| 指标 | 满分 | 说明 |
|------|------|------|
| Performance | 100 | 加载性能 |
| Accessibility | 100 | 无障碍访问 |
| Best Practices | 100 | 最佳实践 |
| SEO | 100 | 搜索引擎优化 |

**建议：** 每次发版前跑一次 Lighthouse，把 Performance 控制在 **90+**。

---

## 七、Elements 面板

### 7.1 伪类状态强制

选中元素 → **:hov** 按钮：

```css
/* 强制触发 :hover / :active / :focus / :visited 状态 */
```

### 7.2 监听元素变化（Break on）

右键元素 → Break on → attribute modifications：

```
场景：某个元素的 class 被 JS 意外改动了
→ 设置断点，谁改的立即定位到代码行
```

### 7.3 复制元素路径

右键元素 → Copy → **Copy JS path**：

```
// 复制结果示例（可直接在 Console 中用）
document.querySelector('#app > div.container > div:nth-child(2) > button')
```

---

## 八、快捷键速查

| 操作 | Mac | Windows |
|------|-----|---------|
| 打开 DevTools | `Cmd+Option+I` | `F12` / `Ctrl+Shift+I` |
| 切换面板 | `Cmd+[` / `Cmd+]` | `Ctrl+[` / `Ctrl+]` |
| 搜索所有文件 | `Cmd+P` | `Ctrl+P` |
| 搜索所有文件内容 | `Cmd+Shift+F` | `Ctrl+Shift+F` |
| 格式化代码 | `Cmd+Shift+P` → Format | `Ctrl+Shift+P` → Format |
| 复制选中的元素 | `Cmd+C` | `Ctrl+C` |
| Network 录制 | `Cmd+E` | `Ctrl+E` |
| 清空 Console | `Cmd+K` | `Ctrl+L` |

---

## 总结

| 面板 | 最实用的技能 |
|------|------------|
| **Console** | `console.table` / `$0` / `console.time` |
| **Sources** | 条件断点 / DOM 断点 / Overrides |
| **Network** | 限速模拟 / Block Request / Replay |
| **Performance** | Main 主线程分析 / Layout Thrashing 检测 |
| **Application** | Service Worker 离线测试 / 存储管理 |
| **Elements** | 伪类状态强制 / Break on attribute |

**记住一个原则：** 能用 DevTools 解决的问题，不要加 console.log。

**推荐阅读：**
- [Chrome DevTools 官方文档](https://developer.chrome.com/docs/devtools/)
- [DevTools Tips](https://devtoolstips.org/)
