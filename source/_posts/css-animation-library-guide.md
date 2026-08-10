---
title: "CSS 动画库选型与实战：Animate.css、Motion One、GSAP 对比指南"
date: 2026-06-25
categories: "css"
description: "深度对比主流 CSS/JS 动画方案：Animate.css、Motion One、GSAP、Framer Motion、Lottie，从性能、功能、体积到适用场景全面分析"
tags: ["css", "JavaScript"]
copyright: true
---

## 前言

前端动画有很多方案：纯 CSS transition/animation、JS 驱动的动画库、SVG/Lottie 动效、Canvas/WebGL。

本文聚焦最主流的五个动画库/框架：

| 库 | 类型 | 体积 | 适用场景 |
|----|------|------|---------|
| **Animate.css** | CSS 类库 | ~20KB | 快速添加简单进入/离开动画 |
| **Motion One** | JS + WAAPI | ~12KB | 高性能、声明式动画 |
| **GSAP** | JS 动画引擎 | ~30KB | 复杂时间线、交互式动画 |
| **Framer Motion** | React 组件 | ~35KB | React 项目、声明式动画 |
| **Lottie** | JSON 动画 | ~10KB | 设计师导出的复杂动效 |

---

## 一、Animate.css — 零成本的 CSS 动画

### 1.1 安装

```bash
npm install animate.css
# 或 CDN：
# <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
```

### 1.2 基本使用

```html
<!-- 只需添加 class -->
<h1 class="animate__animated animate__bounce">Hello World</h1>

<!-- 进入动画 -->
<div class="animate__animated animate__fadeInUp">淡入上升</div>

<!-- 强调动画 -->
<button class="animate__animated animate__pulse animate__infinite">持续脉冲</button>
```

```javascript
// JS 控制
const el = document.querySelector('.card')

// 添加动画
el.classList.add('animate__animated', 'animate__fadeInUp')

// 动画结束后移除
el.addEventListener('animationend', () => {
  el.classList.remove('animate__animated', 'animate__fadeInUp')
})
```

### 1.3 自定义配置

```css
/* 自定义时长和延迟 */
.my-element {
  --animate-duration: 0.5s;    /* 动画时长 */
  --animate-delay: 0.3s;       /* 动画延迟 */
  --animate-repeat: 2;         /* 重复次数 */
}
```

### 1.4 可用动画分类

| 分类 | 代表动画 |
|------|---------|
| **进入** | bounceIn, fadeIn, fadeInUp, fadeInDown, slideInLeft, zoomIn |
| **退出** | bounceOut, fadeOut, fadeOutDown, slideOutRight, zoomOut |
| **强调** | bounce, flash, pulse, rubberBand, shake, swing, tada, wobble |
| **其他** | flip, rotateIn, lightSpeedIn, jackInTheBox |

### 1.5 优缺点

```
✅ 优点：零代码、开箱即用、选择丰富、仅 ~20KB
❌ 缺点：不可定制、不交互、不能控制中间状态
```

---

## 二、Motion One — 高性能轻量方案

Motion One 基于 **Web Animations API（WAAPI）**，性能优于 JS 驱动方案：

### 2.1 安装

```bash
npm install motion
```

### 2.2 基本使用

```javascript
import { animate, scroll, inView } from 'motion'

// 基础动画
animate('.card', { opacity: [0, 1], transform: ['translateY(50px)', 'translateY(0)'] }, {
  duration: 0.5,
  easing: 'ease-out',
})

// 滚动触发
scroll(
  animate('.progress-bar', { scaleX: [0, 1] }),
  { target: document.querySelector('.article') }
)

// 进入视口
inView('.section', ({ target }) => {
  animate(target, { opacity: 1, transform: 'none' }, { duration: 0.6 })
})
```

### 2.3 关键帧动画

```javascript
animate('.ball', {
  transform: [
    'translateY(0px)',
    'translateY(-100px)',
    'translateY(0px)',
  ],
  borderRadius: ['50%', '50%', '0%'],
}, {
  duration: 1,
  easing: 'ease-in-out',
  repeat: Infinity,
})
```

### 2.4 时间线

```javascript
import { timeline } from 'motion'

timeline([
  ['.box-1', { opacity: [0, 1] }, { duration: 0.3 }],
  ['.box-2', { transform: ['scale(0)', 'scale(1)'] }, { duration: 0.4, at: 0.2 }],
  ['.box-3', { x: [100, 0] }, { duration: 0.5, at: '-0.2' }],
])
```

### 2.5 优缺点

```
✅ 优点：性能好（WAAPI）、体积小（~12KB）、API 简洁、支持滚动驱动
❌ 缺点：社区较小、不支持 IE、复杂交互不如 GSAP
```

---

## 三、GSAP — 专业级动画引擎

GSAP（GreenSock Animation Platform）是前端动画的事实标准。

### 3.1 安装

```bash
npm install gsap
```

### 3.2 基础 Tween

```javascript
import gsap from 'gsap'

// 基础动画
gsap.to('.box', {
  x: 200,           // 向右移动 200px
  rotation: 360,    // 旋转 360 度
  scale: 1.5,
  duration: 1,
  ease: 'power2.out',
  delay: 0.5,
})

// 从指定状态开始
gsap.from('.card', {
  opacity: 0,
  y: 50,
  stagger: 0.1,     // 每个元素依次延迟 0.1s
})

// 从当前到指定再到另一个
gsap.fromTo('.box', 
  { x: -100, opacity: 0 },
  { x: 0, opacity: 1, duration: 0.8 }
)
```

### 3.3 时间线（Timeline）

```javascript
const tl = gsap.timeline({ defaults: { duration: 0.5, ease: 'power2.out' } })

tl.to('.header', { y: 0, opacity: 1 })
  .to('.title', { x: 0, opacity: 1 }, '-=0.3')  // 与前一个重叠 0.3s
  .to('.content', { opacity: 1 }, '+=0.2')       // 延迟 0.2s
  .to('.button', { scale: 1 })
```

### 3.4 ScrollTrigger 插件

```javascript
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

// 滚动触发的动画
gsap.to('.progress-bar', {
  scaleX: 1,
  scrollTrigger: {
    trigger: '.article',
    start: 'top center',
    end: 'bottom top',
    scrub: true,        // 滚到哪播到哪
    markers: false,     // 调试标记
  },
})

// 视差效果
gsap.to('.parallax-bg', {
  y: 200,
  ease: 'none',
  scrollTrigger: {
    trigger: '.section',
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
  },
})
```

### 3.5 缓动函数

```javascript
// GSAP 内置大量缓动
gsap.to('.box', { x: 300, ease: 'power2.out' })     // 缓出
gsap.to('.box', { x: 300, ease: 'bounce.out' })     // 弹跳
gsap.to('.box', { x: 300, ease: 'elastic.out(1, 0.3)' }) // 弹性
gsap.to('.box', { x: 300, ease: 'steps(12)' })      // 逐帧
```

### 3.6 优缺点

```
✅ 优点：功能最强、时间线强大、ScrollTrigger 出色、浏览器兼容好
❌ 缺点：体积较大（~30KB）、学习曲线陡、商业项目需付费许可
```

---

## 四、Framer Motion — React 动画首选

### 4.1 安装

```bash
npm install framer-motion
```

### 4.2 基本使用

```jsx
import { motion } from 'framer-motion'

function App() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      Hello World
    </motion.div>
  )
}
```

### 4.3 动画变体（Variants）

```jsx
const variants = {
  hidden: { opacity: 0, y: 50 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1 },
  }),
}

function List({ items }) {
  return (
    <motion.ul initial="hidden" animate="visible">
      {items.map((item, i) => (
        <motion.li key={item} custom={i} variants={variants}>
          {item}
        </motion.li>
      ))}
    </motion.ul>
  )
}
```

### 4.4 手势动画

```jsx
<motion.div
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  drag="x"
  dragConstraints={{ left: -100, right: 100 }}
  onDragEnd={(event, info) => {
    if (info.offset.x > 100) {
      // 滑动超过 100px 触发
    }
  }}
>
  拖拽我
</motion.div>
```

### 4.5 AnimatePresence — 进出动画

```jsx
import { AnimatePresence, motion } from 'framer-motion'

function Notifications({ notifications }) {
  return (
    <AnimatePresence>
      {notifications.map(n => (
        <motion.div
          key={n.id}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
        >
          {n.text}
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
```

### 4.6 优缺点

```
✅ 优点：React 原生、声明式 API、手势支持、AnimatePresence 进出动画
❌ 缺点：仅限 React、体积较大（~35KB）
```

---

## 五、Lottie — 设计师驱动的复杂动画

Lottie 播放由设计师在 After Effects 中制作并导出为 JSON 的动画：

### 5.1 安装

```bash
npm install lottie-web
```

### 5.2 基本使用

```javascript
import lottie from 'lottie-web'

const animation = lottie.loadAnimation({
  container: document.getElementById('animation-container'),
  renderer: 'svg',        // 'svg' | 'canvas' | 'html'
  loop: true,
  autoplay: true,
  path: '/animations/loading.json', // 设计师导出的 JSON
})

// 控制播放
animation.play()
animation.pause()
animation.stop()
animation.goToAndStop(30, true) // 跳到第 30 帧

// 播放进度
animation.addEventListener('progress', (e) => {
  console.log(`进度: ${e.detail}%`)
})
```

### 5.3 按需加载与分段播放

```javascript
// 预加载
lottie.loadAnimation({
  container: el,
  path: '/animations/checkmark.json',
  autoplay: false,
  loop: false,
})

// 分段播放（从第 10 帧到第 50 帧）
animation.playSegments([10, 50], true)
```

### 5.4 优缺点

```
✅ 优点：设计师直接导出、高度复杂、可控性强
❌ 缺点：依赖设计师、JSON 文件可能很大、交互能力有限
```

---

## 六、五款方案选型对比

| 维度 | Animate.css | Motion One | GSAP | Framer Motion | Lottie |
|------|-------------|------------|------|---------------|--------|
| **技术类型** | CSS | JS + WAAPI | JS | React 组件 | JSON + JS |
| **体积** | ~20KB CSS | ~12KB JS | ~30KB JS | ~35KB JS | ~10KB JS |
| **学习曲线** | ⭐ 极低 | ⭐⭐ 低 | ⭐⭐⭐⭐ 高 | ⭐⭐⭐ 中 | ⭐⭐ 低 |
| **交互能力** | 无 | 中 | 强 | 强 | 低 |
| **复杂动画** | 仅基础 | 中等 | 最强 | 强 | 强（设计师） |
| **滚动驱动** | 无 | ✅ 内置 | ✅ 插件 | ✅ 内置 | 无 |
| **时间线** | 无 | ✅ 基础 | ✅ 专业 | ✅ 声明式 | 无 |
| **React 支持** | 通用 | 通用 | 通用 | ✅ 原生 | 通用 |
| **兼容性** | 好 | 中（需 WAAPI） | 好 | 好 | 好 |
| **价格** | MIT | MIT | 商业许可 | MIT | MIT |

---

## 七、实战选型建议

### 7.1 选型决策树

```
项目类型是什么？
├── 纯展示站、简单进入动画 → Animate.css（够用）
├── React 项目
│   ├── 日常动效 → Framer Motion
│   └── 复杂交互 → GSAP + Framer Motion 混用
├── 高性能要求（滚动/视差）
│   ├── Motion One（轻量）
│   └── GSAP + ScrollTrigger（功能最强）
├── 设计团队产出动效
│   └── Lottie
└── 只是偶尔用几个动画
    └── 手写 CSS animation（零依赖）
```

### 7.2 手写 CSS 动画 vs 库

```css
/* 简单的 fadeIn 完全不需要库 */
.fade-in {
  opacity: 0;
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  to { opacity: 1; }
}

/* 脉冲按钮 */
.pulse-btn {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

**推荐原则**：

```
动画复杂度            → 推荐方案
────────────────────────────────
简单 CSS 过渡         → CSS transition
单次进入动画          → Animate.css / 手写 CSS animation
滚动触发              → Motion One / GSAP ScrollTrigger
交互/拖拽             → GSAP / Framer Motion
复杂时间线            → GSAP
设计师导出            → Lottie
React 项目日常动效    → Framer Motion
按钮/悬浮微动效      → CSS transition（零依赖）
```

---

## 八、性能注意事项

### 8.1 触发重排 vs 合成

```css
/* ❌ 触发重排（layout 变化），性能差 */
animation: moveLeft 0.3s;
@keyframes moveLeft {
  from { margin-left: 0; }
  to { margin-left: 100px; }
}

/* ✅ 触发合成（仅 composite），性能好 */
animation: moveLeft 0.3s;
@keyframes moveLeft {
  from { transform: translateX(0); }
  to { transform: translateX(100px); }
}
```

### 8.2 优先使用的属性

| 高性能（触发合成） | 低性能（触发重排） |
|------------------|-----------------|
| `transform` | `width`、`height` |
| `opacity` | `margin`、`padding` |
| `filter`（部分） | `left`、`top` |
| `clip-path` | `border-radius` |

### 8.3 will-change

```css
/* 提前告知浏览器该元素将发生动画 */
.animated-element {
  will-change: transform, opacity;
}

/* 使用完记得移除，避免消耗过多内存 */
/* 或用 JS 动态添加 */
el.style.willChange = 'transform'
// 动画结束后
setTimeout(() => { el.style.willChange = 'auto' }, 1000)
```

---

## 总结

| 你的需求 | 最佳选择 |
|---------|---------|
| 零代码、开箱即用 | Animate.css |
| 轻量、高性能 | Motion One |
| 滚动视差、复杂交互 | GSAP + ScrollTrigger |
| React 项目 | Framer Motion |
| 设计师动效 | Lottie |
| 极其简单 | 手写 CSS animation |

> 动画的核心原则：**少即是多**。不是所有元素都需要动画，动画应当有目的——引导视线、反馈交互、传递状态。好的动效用户甚至不会注意到它，但坏的动效一定会被用户注意到。
