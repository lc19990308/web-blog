---
title: "前端数据可视化：ECharts 实战入门"
date: 2026-03-15
categories: "数据可视化"
description: "掌握 ECharts 的核心概念（图表/系列/数据集/组件），从基础图表到数据更新、事件交互、响应式适配的完整实战"
tags: ["数据可视化"]
copyright: true
---

## 前言

数据可视化是将数据转化为图表的过程。ECharts 是国产最流行的前端图表库，功能强大、文档完善、性能优秀。

---

## 一、快速开始

```bash
npm install echarts
```

```vue
<template>
  <div ref="chartRef" style="width: 100%; height: 400px"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'

const chartRef = ref(null)
let chartInstance = null

onMounted(() => {
  // 1. 初始化
  chartInstance = echarts.init(chartRef.value)

  // 2. 配置
  chartInstance.setOption({
    title: { text: '示例图表' },
    tooltip: {},
    xAxis: { data: ['一月', '二月', '三月', '四月'] },
    yAxis: {},
    series: [{
      type: 'bar',
      data: [120, 200, 150, 80],
    }],
  })
})

// 3. 窗口大小变化时自适应
window.addEventListener('resize', () => {
  chartInstance?.resize()
})

onUnmounted(() => {
  chartInstance?.dispose()
})
</script>
```

---

## 二、常用图表类型

### 2.1 折线图

```javascript
const option = {
  title: { text: '用户增长趋势' },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月'] },
  yAxis: { type: 'value' },
  series: [{
    type: 'line',
    data: [820, 932, 901, 934, 1290],
    smooth: true,         // 平滑曲线
    areaStyle: {},        // 面积图效果
  }],
}
```

### 2.2 饼图

```javascript
const option = {
  title: { text: '浏览器市场份额', left: 'center' },
  tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],  // 环形图（内径40%，外径70%）
    center: ['50%', '55%'],
    data: [
      { value: 64.5, name: 'Chrome' },
      { value: 12.8, name: 'Safari' },
      { value: 8.3, name: 'Firefox' },
      { value: 5.2, name: 'Edge' },
    ],
    emphasis: {
      itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
    },
  }],
}
```

### 2.3 柱状图

```javascript
const option = {
  tooltip: { trigger: 'axis' },
  legend: { data: ['销售额', '利润'] },
  xAxis: { data: ['Q1', 'Q2', 'Q3', 'Q4'] },
  yAxis: { type: 'value' },
  series: [
    {
      name: '销售额',
      type: 'bar',
      data: [500, 800, 700, 1200],
    },
    {
      name: '利润',
      type: 'bar',
      data: [100, 160, 140, 240],
    },
  ],
}
```

---

## 三、数据集（Dataset）

使用 dataset 管理数据，让数据和配置分离：

```javascript
const option = {
  dataset: {
    dimensions: ['product', '2024', '2025'],
    source: [
      { product: '手机', 2024: 430, 2025: 520 },
      { product: '电脑', 2024: 260, 2025: 310 },
      { product: '平板', 2024: 180, 2025: 230 },
    ],
  },
  xAxis: { type: 'category' },
  yAxis: { type: 'value' },
  series: [
    { type: 'bar', seriesLayoutBy: 'row' },
    { type: 'bar', seriesLayoutBy: 'row' },
  ],
}
```

---

## 四、数据更新

```javascript
// 定时更新数据（实时图表）
setInterval(() => {
  chartInstance.setOption({
    series: [{
      data: generateRandomData(),  // 生成新数据
    }],
  })
}, 2000)

// 追加数据（折线图滚动更新）
function addData(newValue) {
  chartInstance.setOption({
    series: [{ data: dataArray }],
    xAxis: { data: timeArray },
  })
}
```

---

## 五、事件交互

```javascript
// 点击图表项
chartInstance.on('click', (params) => {
  console.log(`${params.name}: ${params.value}`)
})

// 鼠标悬停
chartInstance.on('mouseover', (params) => {
  console.log('悬停:', params.name)
})

// 图例切换
chartInstance.on('legendselectchanged', (params) => {
  console.log('图例切换:', params.name, params.selected)
})
```

---

## 六、响应式适配

```javascript
// PC 端和移动端使用不同配置
function getOption(width) {
  const isMobile = width < 768

  return {
    grid: {
      left: isMobile ? 30 : 60,
      right: isMobile ? 10 : 30,
    },
    xAxis: {
      axisLabel: {
        rotate: isMobile ? 45 : 0,  // 移动端标签旋转
      },
    },
    series: [{
      type: 'bar',
      barWidth: isMobile ? '60%' : '40%',
    }],
  }
}

// 窗口变化时重新配置
window.addEventListener('resize', () => {
  chartInstance.resize()
  chartInstance.setOption(getOption(window.innerWidth))
})
```

---

## 七、性能优化

```javascript
// 1. 大数据量使用 sampling
series: [{
  type: 'scatter',
  sampling: 'lttb',  // 降采样算法
  data: largeDataset,
}]

// 2. 关闭不需要的动画
chartInstance.setOption({
  animation: false,
})

// 3. 组件按需引入（减少打包体积）
import echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, LineChart, TitleComponent, TooltipComponent, CanvasRenderer])
```

---

## 八、选型对比

| 库 | 类型 | 学习成本 | 性能 | 适用场景 |
|------|------|---------|------|---------|
| **ECharts** | 配置式 | **低** | 高 | 通用图表 |
| D3.js | 命令式 | 高 | 高 | 自定义可视化 |
| Chart.js | 配置式 | 低 | 中 | 简单图表 |
| AntV G2 | 配置式 | 中 | 高 | 统计图表 |

**选型建议：**

```markdown
企业后台报表 → ECharts（最成熟，文档最全）
简单的图标卡片 → Chart.js（轻量）
需要高度自定义 → D3.js（灵活但学习成本高）
与 Ant Design 配合 → AntV G2
```

---

## 总结

```javascript
// ECharts 核心三步：
// 1. echarts.init(dom) → 实例
// 2. setOption(config) → 配置
// 3. resize() → 自适应

// 常用图表类型：
// bar（柱状图）→ 对比数据
// line（折线图）→ 趋势数据
// pie（饼图）→ 占比数据
// scatter（散点图）→ 相关性
```

**推荐阅读：**
- [ECharts 官方文档](https://echarts.apache.org/)
- [ECharts 示例 Gallery](https://echarts.apache.org/examples/)
