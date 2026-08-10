---
title: "你不知道的JavaScript（二十九）：国际化 API——Intl 对象的完整能力"
date: 2026-06-28
categories: "你不知道的javascript"
description: "Intl 是 JavaScript 内置的国际化引擎——日期格式化、数字格式化、排序、复数规则、相对时间，以及浏览器如何实现区域敏感的文本处理"
tags: ["你不知道的javascript", "JavaScript"]
copyright: true
---

## 前言

前端国际化（i18n）不仅仅是翻译文本。你还需要：

- 不同地区的日期格式（2026/06/28 vs June 28, 2026）
- 数字格式（1,000.50 vs 1.000,50）
- 排序规则（é 排在 e 前还是后？）
- 复数规则（1 item vs 2 items）

Intl 对象是浏览器内置的国际化引擎——**无需引入 moment.js、day.js 等库**，原生 API 已经覆盖了 90% 的国际化需求。

---

## 一、Intl.DateTimeFormat——日期格式化

### 1.1 基本用法

```js
const date = new Date('2026-06-28T12:00:00')

// 美式英语
const us = new Intl.DateTimeFormat('en-US')
console.log(us.format(date)) // 6/28/2026

// 中文
const cn = new Intl.DateTimeFormat('zh-CN')
console.log(cn.format(date)) // 2026/6/28

// 德国
const de = new Intl.DateTimeFormat('de-DE')
console.log(de.format(date)) // 28.6.2026

// 日本
const jp = new Intl.DateTimeFormat('ja-JP')
console.log(jp.format(date)) // 2026/6/28
```

### 1.2 自定义格式

```js
const options = {
  year: 'numeric',
  month: 'long',   // long: "June", short: "Jun", narrow: "J"
  day: 'numeric',
  weekday: 'long',   // "Sunday"
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Shanghai',
  timeZoneName: 'short'
}

const formatter = new Intl.DateTimeFormat('zh-CN', options)
console.log(formatter.format(date))
// "2026年6月28日星期日 北京时间 12:00"
```

### 1.3 formatRange——日期范围

```js
const start = new Date('2026-06-28')
const end = new Date('2026-07-05')

const formatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'long', day: 'numeric'
})

console.log(formatter.formatRange(start, end))
// "6月28日 至 7月5日"
```

---

## 二、Intl.NumberFormat——数字格式化

### 2.1 区域化的数字

```js
const number = 1234567.89

// 美式
new Intl.NumberFormat('en-US').format(number)
// "1,234,567.89"

// 德语
new Intl.NumberFormat('de-DE').format(number)
// "1.234.567,89"

// 印度
new Intl.NumberFormat('en-IN').format(number)
// "12,34,567.89"
```

### 2.2 货币格式化

```js
const price = 1234.56

const options = {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'code'
}

new Intl.NumberFormat('en-US', { ...options, currency: 'USD' }).format(price)
// "USD 1,234.56"

new Intl.NumberFormat('zh-CN', { ...options, currency: 'CNY' }).format(price)
// "CNY 1,234.56"

new Intl.NumberFormat('de-DE', { ...options, currency: 'EUR' }).format(price)
// "EUR 1.234,56"

// 简写符号
new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  currencyDisplay: 'symbol'  // code | symbol | narrowSymbol
}).format(price)
// "¥1,234.56"
```

### 2.3 单位格式化

```js
new Intl.NumberFormat('zh-CN', {
  style: 'unit',
  unit: 'kilometer-per-hour',
  unitDisplay: 'long'  // long: "千米/小时", short: "km/h", narrow: "km/h"
}).format(120)
// "120千米/小时"

new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'mile-per-hour'
}).format(120)
// "120 mph"
```

---

## 三、Intl.RelativeTimeFormat——相对时间

```js
const rtf = new Intl.RelativeTimeFormat('zh-CN', {
  numeric: 'auto',  // auto: "昨天", always: "1天前"
  style: 'long'     // long: "1分钟前", short: "1分钟前", narrow: "1分前"
})

console.log(rtf.format(-1, 'day'))    // "昨天"
console.log(rtf.format(-3, 'day'))    // "3天前"
console.log(rtf.format(1, 'hour'))    // "1小时后"
console.log(rtf.format(-30, 'minute')) // "30分钟前"
console.log(rtf.format(2, 'month'))   // "2个月后"
```

**替换 dayjs 的 fromNow：**

```js
function timeAgo(date) {
  const now = Date.now()
  const diff = date - now
  const seconds = Math.round(diff / 1000)
  const minutes = Math.round(seconds / 60)
  const hours = Math.round(minutes / 60)
  const days = Math.round(hours / 24)

  const rtf = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })

  if (Math.abs(seconds) < 60) return rtf.format(seconds, 'second')
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(days, 'day')
}
```

---

## 四、Intl.Collator——区域敏感的排序

```js
const items = ['ä', 'a', 'b', 'z', 'é', 'e']

// 默认排序（按 Unicode 码点）
items.sort()
// ['a', 'b', 'e', 'z', 'ä', 'é'] —— ä 和 é 被排到最后

// 德式排序
const deCollator = new Intl.Collator('de-DE')
items.sort(deCollator.compare)
// ['a', 'ä', 'b', 'e', 'é', 'z'] —— ä 排在 a 旁边

// 瑞典排序（ä 在 z 之后！）
const svCollator = new Intl.Collator('sv-SE')
items.sort(svCollator.compare)
// ['a', 'b', 'e', 'é', 'z', 'ä']

// 中文拼音排序
const zhCollator = new Intl.Collator('zh-CN')
const chineseNames = ['张', '李', '王', '赵']
chineseNames.sort(zhCollator.compare)
// 按拼音排序
```

---

## 五、Intl.ListFormat——列表连接

```js
const items = ['Vue', 'React', 'Svelte']

new Intl.ListFormat('zh-CN', {
  style: 'long',
  type: 'conjunction'  // conjunction: "和", disjunction: "或"
}).format(items)
// "Vue、React和Svelte"

new Intl.ListFormat('en-US', {
  style: 'long',
  type: 'disjunction'
}).format(items)
// "Vue, React, or Svelte"

new Intl.ListFormat('en-US', {
  style: 'short'
}).format(items)
// "Vue, React, & Svelte"
```

---

## 六、Intl.Segmenter——文本分割

```js
// 正确统计字符数（应对 emoji、组合字符）
const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' })

// 统计 emoji
const emojiStr = '👨‍👩‍👧‍👦' // 一个家庭 emoji
console.log(emojiStr.length)                    // 7（错误！）
console.log([...emojiStr].length)               // 7（错误！）

const segments = [...segmenter.segment(emojiStr)]
console.log(segments.length)                    // 1（正确！）
```

---

## 七、Intl.DisplayNames——区域名称

```js
// 获取语言的中文名称
const languageNames = new Intl.DisplayNames('zh-CN', { type: 'language' })
console.log(languageNames.of('en'))  // "英语"
console.log(languageNames.of('ja'))  // "日语"
console.log(languageNames.of('zh'))  // "中文"

// 获取国家/地区的中文名称
const regionNames = new Intl.DisplayNames('zh-CN', { type: 'region' })
console.log(regionNames.of('CN'))  // "中国"
console.log(regionNames.of('US'))  // "美国"
console.log(regionNames.of('JP'))  // "日本"
```

---

## 八、总结

| API | 用途 | 替代库 |
|------|------|--------|
| `Intl.DateTimeFormat` | 日期/时间格式化 | moment.js, day.js |
| `Intl.NumberFormat` | 数字/货币/单位格式化 | numeral.js |
| `Intl.RelativeTimeFormat` | 相对时间（"3天前"） | dayjs.fromNow |
| `Intl.Collator` | 区域敏感排序 | — |
| `Intl.ListFormat` | 列表连接（"A、B和C"） | — |
| `Intl.Segmenter` | 文本分割（emoji 感知） | — |
| `Intl.DisplayNames` | 区域/语言名称翻译 | — |

**核心建议：** 不要为了日期格式化就引入 50KB 的 moment.js——Intl API 已经覆盖了绝大多数场景，且不需要额外加载任何资源。
