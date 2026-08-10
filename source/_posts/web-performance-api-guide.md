---
title: "Web 性能 API 完全指南：Performance Observer、LCP、CLS、INP 实战"
date: 2026-06-25
categories: "性能优化"
description: "深入讲解 Web 性能 API 的核心原理与实战，涵盖 Performance Observer、Core Web Vitals（LCP/CLS/INP/FID）的监测与优化，以及自定义性能指标采集"
tags: ["性能优化", "JavaScript"]
copyright: true
---

## 前言

Web 性能优化不能靠感觉，必须**基于数据做决策**。

浏览器提供了丰富的 **Performance API**，让开发者可以直接采集页面加载、交互、渲染的各项指标。其中 **Core Web Vitals**（LCP、CLS、INP）已经是 Google 搜索排名的重要因素。

本文详解：
1. **Performance Observer** — 统一监听性能事件的现代 API
2. **Core Web Vitals** — LCP、CLS、INP 的原理与优化
3. **自定义性能监控** — 构建自己的性能监控系统

---

## 一、Performance Observer 基础

### 1.1 为什么用 Performance Observer？

传统的 `performance.timing`（Navigation Timing API）已被标记为废弃，无法监听异步加载的资源。**Performance Observer** 采用观察者模式，可以实时监听各种性能事件：

```javascript
// 创建一个观察者，监听特定类型的性能事件
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries()
  entries.forEach((entry) => {
    console.log(`${entry.name}:`, entry.startTime)
  })
})

// 开始监听 first-input 事件
observer.observe({ type: 'first-input', buffered: true })
```

**`buffered: true`** 表示获取注册之前已发生的性能条目，这对于页面初始化场景很重要。

### 1.2 可监听的性能条目类型

| entryType | 说明 | 首次支持 |
|-----------|------|---------|
| `navigation` | 页面导航性能（DNS、TCP、DOM 解析等） | 所有 |
| `resource` | 资源加载性能（图片、脚本、样式等） | 所有 |
| `paint` | 关键渲染时间点（FP、FCP） | 所有 |
| `largest-contentful-paint` | LCP — 最大内容绘制 | Chrome |
| `layout-shift` | CLS — 布局偏移 | Chrome |
| `first-input` | FID/INP — 首次交互延迟 | Chrome |
| `long-animation-frame` | 长动画帧（阻塞主线程） | Chrome |
| `longtask` | 长任务（已废弃，用 long-animation-frame 代替） | Chrome |

---

## 二、核心指标详解

### 2.1 FCP（First Contentful Paint）

首次内容绘制——浏览器首次渲染任何文本、图片、Canvas 内容的时间点：

```javascript
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries()
  entries.forEach((entry) => {
    console.log(`FCP: ${entry.startTime}ms`)
    // 上报
    reportMetric('FCP', entry.startTime)
  })
})

observer.observe({ type: 'paint', buffered: true })
// entry.name 为 'first-contentful-paint' 的即为 FCP
```

**优化目标**：≤ 1.8s（良好），> 3.0s（差）

**优化手段**：
- 消除渲染阻塞资源（内联关键 CSS）
- 预加载首屏字体和图片
- 使用 SSR/SSG 提前渲染 HTML

### 2.2 LCP（Largest Contentful Paint）

最大内容绘制——页面主要内容（图片、视频、大文本块）渲染完成的时间点：

```javascript
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries()
  const lastEntry = entries[entries.length - 1]

  console.log(`LCP: ${lastEntry.startTime}ms`)
  console.log('LCP 元素:', lastEntry.element?.tagName, lastEntry.url)

  reportMetric('LCP', {
    value: lastEntry.startTime,
    element: lastEntry.element?.tagName,
    url: lastEntry.url,
  })
})

observer.observe({ type: 'largest-contentful-paint', buffered: true })
```

**LCP 常见优化场景**：

```html
<!-- 1. 预加载首屏大图 -->
<link rel="preload" href="hero.jpg" as="image" />

<!-- 2. 设置图片宽高避免布局偏移 -->
<img src="hero.jpg" width="1200" height="600" alt="banner" />

<!-- 3. 优化字体加载，避免 FOIT -->
<link rel="preload" href="font.woff2" as="font" crossorigin />
<style>
  @font-face {
    font-family: 'CustomFont';
    src: url('font.woff2') format('woff2');
    font-display: swap; /* 先用系统字体，字体加载后替换 */
  }
</style>
```

**优化目标**：≤ 2.5s（良好），> 4.0s（差）

### 2.3 CLS（Cumulative Layout Shift）

累计布局偏移——页面在生命周期内所有**非用户预期的**布局偏移的累计分数：

```javascript
let clsValue = 0
let clsEntries = []

const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    // 忽略用户交互后 500ms 内的偏移
    if (!entry.hadRecentInput) {
      clsValue += entry.value
      clsEntries.push(entry)
    }
  })

  console.log(`CLS: ${clsValue}`)
  reportMetric('CLS', clsValue)
})

observer.observe({ type: 'layout-shift', buffered: true })
```

**CLS 分数计算原理**：

```
CLS 分数 = 影响比例 × 位移比例

例如：一个元素占视口 50%（影响比 0.5），向下挪了 30%（位移比 0.3）
CLS = 0.5 × 0.3 = 0.15
```

**常见 CLS 问题与对策**：

| 问题 | 解决方案 |
|------|---------|
| 图片无固定尺寸 | 显式设置 `width` + `height`，或使用 `aspect-ratio` |
| 动态插入广告 | 预留广告位容器，设置固定尺寸 |
| 字体加载导致布局偏移 | `font-display: swap` 或 `font-display: optional` |
| 懒加载图片 | 先显示占位符，宽高比与图片一致 |
| Web 字体渲染后大小不同 | 使用 `size-adjust` 属性对齐 fallback 字体 |

```css
/* 防止无尺寸图片导致 CLS */
img, video {
  width: 100%;
  height: auto;
  aspect-ratio: attr(width) / attr(height);
}

/* 或者使用现代 CSS */
img {
  width: 100%;
  height: auto;
}
img:not([width]), img:not([height]) {
  aspect-ratio: 16 / 9; /* 默认宽高比兜底 */
}
```

**优化目标**：≤ 0.1（良好），> 0.25（差）

### 2.4 FID → INP（First Input Delay → Interaction to Next Paint）

**FID** 只测量**首次**交互到浏览器能处理该交互的时间。**INP**（Interaction to Next Paint）则是所有交互延迟的**最差值**，是 FID 的全面替代者：

```javascript
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries()

  entries.forEach((entry) => {
    // entry.duration 表示处理时长
    const interactionDelay = entry.processingStart - entry.startTime
    const processingTime = entry.processingEnd - entry.processingStart

    console.log(`交互类型: ${entry.name}`)
    console.log(`输入延迟: ${interactionDelay}ms`)
    console.log(`处理时间: ${processingTime}ms`)
    console.log(`总延迟: ${entry.duration}ms`)

    reportMetric('INP', {
      type: entry.name,
      delay: entry.duration,
      target: entry.target?.tagName || 'unknown',
    })
  })
})

observer.observe({ type: 'first-input', buffered: true })

// 注意：Chrome 116+ 可以使用 'interaction' 类型获取完整 INP
if (PerformanceObserver.supportedEntryTypes?.includes('interaction')) {
  const inpObserver = new PerformanceObserver((list) => {
    // 获取所有交互中的最大值
    list.getEntries().forEach(reportInteraction)
  })
  inpObserver.observe({ type: 'interaction', buffered: true })
}
```

**INP 与 FID 的区别**：

```
FID: 只测量第一次交互的输入延迟
     忽略点击后处理脚本的耗时

INP: 测量所有交互（点击、键盘、触摸）的端到端延迟
     包含输入延迟 + 事件处理 + 渲染时间
     取所有交互中的 P75 最差值
```

**优化目标**：≤ 200ms（良好），> 500ms（差）

**INP 优化策略**：

```javascript
// 1. 拆分长任务（Long Task）
// ❌ 同步阻塞
function handleClick() {
  expensiveCalculation() // 阻塞主线程 500ms
}

// ✅ 使用 requestAnimationFrame 或 setTimeout
function handleClick() {
  setTimeout(() => expensiveCalculation(), 0)
}

// ✅ 使用 scheduler.yield()（Chrome 122+）
async function handleClick() {
  await scheduler.yield()
  expensiveCalculation()
}

// 2. 延迟非关键计算
function handleInput(e) {
  // 立即处理 UI 更新
  updateUi(e.target.value)

  // 延迟非关键逻辑
  requestIdleCallback(() => {
    syncToServer(e.target.value)
  })
}
```

---

## 三、长任务与长动画帧

主线程阻塞超过 50ms 就是**长任务（Long Task）**，在 Chrome 中已被 `long-animation-frame` 取代：

```javascript
// 监听长动画帧（更精确，包含详细的子任务信息）
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(`长动画帧: ${entry.duration}ms`)
    console.log(`渲染时间: ${entry.renderStart}ms`)
    console.log(`脚本执行时间: ${entry.scripts?.reduce((t, s) => t + s.duration, 0)}ms`)

    // 分析具体哪些脚本耗时
    entry.scripts?.forEach((script) => {
      if (script.duration > 50) {
        console.warn(`耗时脚本: ${script.sourceURL || 'inline'} 耗时 ${script.duration}ms`)
      }
    })
  })
})

observer.observe({ type: 'long-animation-frame', buffered: true })
```

---

## 四、资源加载性能监控

```javascript
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    // 只监控关键资源
    if (entry.initiatorType === 'script' || entry.initiatorType === 'link') {
      console.log(`资源: ${entry.name}`)
      console.log(`DNS: ${entry.domainLookupEnd - entry.domainLookupStart}ms`)
      console.log(`TCP: ${entry.connectEnd - entry.connectStart}ms`)
      console.log(`SSL: ${entry.secureConnectionStart ? entry.connectEnd - entry.secureConnectionStart : 0}ms`)
      console.log(`TTFB: ${entry.responseStart - entry.requestStart}ms`)
      console.log(`下载: ${entry.responseEnd - entry.responseStart}ms`)

      reportMetric('resource', {
        url: entry.name,
        type: entry.initiatorType,
        ttfb: entry.responseStart - entry.requestStart,
        download: entry.responseEnd - entry.responseStart,
        total: entry.duration,
      })
    }
  })
})

observer.observe({ type: 'resource', buffered: true })
```

---

## 五、构建性能监控系统

### 5.1 统一采集上报

```javascript
class WebVitalsReporter {
  constructor(options) {
    this.endpoint = options.endpoint || '/api/vitals'
    this.sampleRate = options.sampleRate || 0.1 // 10% 采样
    this.metrics = new Map()
    this.initObservers()
  }

  initObservers() {
    // 采样控制
    if (Math.random() > this.sampleRate) return

    this.observeFCP()
    this.observeLCP()
    this.observeCLS()
    this.observeINP()
    this.observeTTFB()
    this.observeResources()
  }

  observeFCP() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.record('FCP', entry.startTime)
          observer.disconnect()
        }
      })
    })
    observer.observe({ type: 'paint', buffered: true })
  }

  observeLCP() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      this.record('LCP', entries[entries.length - 1].startTime)
    })
    observer.observe({ type: 'largest-contentful-paint', buffered: true })
  }

  observeCLS() {
    let clsValue = 0
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) clsValue += entry.value
      })
      this.record('CLS', clsValue)
    })
    observer.observe({ type: 'layout-shift', buffered: true })
  }

  observeINP() {
    let worstDelay = 0
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        worstDelay = Math.max(worstDelay, entry.duration)
      })
      this.record('INP', worstDelay)
    })
    observer.observe({ type: 'first-input', buffered: true })
  }

  observeTTFB() {
    const nav = performance.getEntriesByType('navigation')[0]
    if (nav) {
      this.record('TTFB', nav.responseStart - nav.requestStart)
    }
  }

  observeResources() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        // 只采样关键资源
        if (entry.duration > 1000) {
          this.record('SLOW_RESOURCE', entry.duration, {
            url: entry.name.slice(0, 200),
            type: entry.initiatorType,
          })
        }
      })
    })
    observer.observe({ type: 'resource', buffered: true })
  }

  record(name, value, extra = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name).push({
      value: Math.round(value * 100) / 100,
      timestamp: Date.now(),
      ...extra,
    })
  }

  // 页面隐藏或关闭时上报
  flush() {
    if (this.metrics.size === 0) return

    const payload = {
      url: window.location.pathname,
      ua: navigator.userAgent.slice(0, 200),
      timestamp: Date.now(),
      metrics: Object.fromEntries(this.metrics),
    }

    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, JSON.stringify(payload))
    } else {
      fetch(this.endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        keepalive: true,
      })
    }

    this.metrics.clear()
  }
}

// 页面关闭前上报
const reporter = new WebVitalsReporter({ endpoint: '/api/vitals', sampleRate: 0.5 })

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    reporter.flush()
  }
})
```

### 5.2 指标聚合与告警阈值

```javascript
// 后端 /api/vitals 聚合逻辑（伪代码）

// 按页面路径 + 指标名 + 日聚合
const thresholds = {
  FCP:  { good: 1800, poor: 3000 },
  LCP:  { good: 2500, poor: 4000 },
  CLS:  { good: 0.1,  poor: 0.25 },
  INP:  { good: 200,  poor: 500 },
  TTFB: { good: 800,  poor: 1800 },
}

function evaluateMetric(name, p75Value) {
  const t = thresholds[name]
  if (!t) return 'unknown'
  if (p75Value <= t.good) return 'good'
  if (p75Value <= t.poor) return 'needs-improvement'
  return 'poor'
}

// 告警规则
function shouldAlert(page, metric, p75) {
  // p75 值连续 3 天处于 poor 区间则告警
  // 或者某天突然上涨超过 30%
}
```

---

## 六、Performance API 兼容性处理

```javascript
// 安全检测入口
function initPerformanceObservers() {
  if (!window.PerformanceObserver) {
    console.warn('当前浏览器不支持 PerformanceObserver')
    // 回退到 performance.timing（仅限页面加载）
    const navTiming = performance?.timing
    if (navTiming) {
      reportMetric('FP', navTiming.responseEnd - navTiming.navigationStart)
    }
    return
  }

  // 检测具体类型支持
  const supported = PerformanceObserver.supportedEntryTypes || []

  if (supported.includes('largest-contentful-paint')) {
    // 支持 LCP
  }

  if (supported.includes('layout-shift')) {
    // 支持 CLS
  }

  if (supported.includes('interaction')) {
    // 支持完整 INP（Chrome 116+）
  } else if (supported.includes('first-input')) {
    // 回退到 FID
  }
}
```

---

## 总结

### 关键指标速查表

| 指标 | 衡量内容 | 良好 | 差 | 优化重点 |
|------|---------|------|----|---------|
| **FCP** | 首次内容渲染 | ≤ 1.8s | > 3.0s | 消除阻塞渲染资源 |
| **LCP** | 最大内容渲染 | ≤ 2.5s | > 4.0s | 预加载、图片优化、SSR |
| **CLS** | 布局偏移 | ≤ 0.1 | > 0.25 | 固定尺寸、预留广告位 |
| **INP** | 交互响应延迟 | ≤ 200ms | > 500ms | 拆分长任务、延迟非关键计算 |
| **TTFB** | 服务端响应时间 | ≤ 800ms | > 1.8s | CDN、后端优化、边缘计算 |

### 最佳实践

1. **使用 PerformanceObserver**，而不是废弃的 `performance.timing`
2. **buffered: true** 确保获取注册前已发生的事件
3. **采样上报**，避免性能监控本身影响性能（建议 1-10% 采样）
4. **页面关闭时用 sendBeacon** 上报，不要用同步 XHR
5. **关注 P75 而不是平均值**，P75 更能反映大多数用户的体验
6. **区分开发/生产环境**，开发环境打印详细日志，生产环境只上报聚合数据

> 性能优化的起点是测量。没有数据支撑的优化是"凭感觉做事"——装好监控，让数据告诉你该优化什么。
