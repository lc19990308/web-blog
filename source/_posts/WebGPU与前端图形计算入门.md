---
title: "WebGPU 与前端图形计算入门：从 Canvas 到 GPU 计算"
date: 2026-07-07
categories: "图形学"
description: "WebGPU 作为下一代 Web 图形 API，不仅带来更好的 3D 渲染性能，还开启了浏览器端通用 GPU 计算的新纪元"
tags: ["图形学", "JavaScript"]
copyright: true
---

## 前言

WebGPU 是 WebGL 的继任者，由 W3C 标准组织推动。它不是"WebGL 的升级"，而是**一套全新的、更接近现代 GPU 架构的 API**。

> 如果把 WebGL 比作手动挡汽车，WebGPU 就是 F1 赛车——性能更强，但需要你更懂底层原理。

---

## 一、WebGPU vs WebGL

| 特性 | WebGL | WebGPU |
|------|-------|--------|
| 基于 | OpenGL ES | Vulkan/D3D12/Metal |
| 着色器语言 | GLSL | WGSL（WebGPU Shading Language） |
| CPU 开销 | 高（状态机模型） | 低（显式资源管理） |
| 计算能力 | ❌ 仅渲染 | ✅ 通用计算（Compute Shader） |
| 跨平台 | ✅ 广泛支持 | Chrome/Edge/Firefox/Safari 逐步支持 |

**最关键的区别：** WebGPU 支持 **Compute Shader**，可以在 GPU 上执行通用计算任务！

---

## 二、核心概念

```ts
// WebGPU 的主要对象
const adapter = await navigator.gpu.requestAdapter()
const device = await adapter.requestDevice()

const swapChain = ...     // 交换链 —— 显示帧
const renderPipeline = ... // 渲染管线 —— 描述如何渲染
const computePipeline = ... // 计算管线 —— 描述如何计算
const buffer = ...         // 缓冲区 —— GPU 内存中的数据
const texture = ...        // 纹理 —— 图片/数据
const bindGroup = ...      // 绑定组 —— 将资源连接到管线
```

**设计哲学：** 显式、确定、零隐藏开销。没有"隐式状态"——你需要明确告诉 GPU 每一步做什么。

---

## 三、绘制第一个三角形

### 3.1 着色器

```wgsl
// vertex shader
@vertex
fn vertexMain(@builtin(vertex_index) idx: u32) -> @builtin(position) vec4f {
  const positions = array<vec2f, 3>(
    vec2f(0.0, 0.5),
    vec2f(-0.5, -0.5),
    vec2f(0.5, -0.5)
  );
  return vec4f(positions[idx], 0.0, 1.0);
}

// fragment shader
@fragment
fn fragmentMain() -> @location(0) vec4f {
  return vec4f(0.3, 0.7, 1.0, 1.0);
}
```

### 3.2 创建管线并绘制

```ts
const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    module: device.createShaderModule({ code: vertexShaderWGSL }),
    entryPoint: 'vertexMain'
  },
  fragment: {
    module: device.createShaderModule({ code: fragmentShaderWGSL }),
    entryPoint: 'fragmentMain',
    targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
  },
  primitive: { topology: 'triangle-list' }
})

// 每帧渲染
function frame() {
  const encoder = device.createCommandEncoder()
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store'
    }]
  })
  pass.setPipeline(pipeline)
  pass.draw(3) // 3 个顶点
  pass.end()
  device.queue.submit([encoder.finish()])
  requestAnimationFrame(frame)
}
```

---

## 四、Compute Shader —— GPU 通用计算

这是 WebGPU 超越 WebGL 的最强能力。

```wgsl
// GPU 上并行计算平方
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let idx = id.x;
  output[idx] = input[idx] * input[idx];
}
```

```ts
// 数据：100 万个数的平方
const input = new Float32Array(1_000_000)

const inputBuffer = device.createBuffer({
  size: input.byteLength,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
})
const outputBuffer = device.createBuffer({ ... })

device.queue.writeBuffer(inputBuffer, 0, input)

const computePipeline = device.createComputePipeline({
  layout: 'auto',
  compute: {
    module: device.createShaderModule({ code: computeShaderWGSL }),
    entryPoint: 'main'
  }
})

// 执行
const encoder = device.createCommandEncoder()
const pass = encoder.beginComputePass()
pass.setPipeline(computePipeline)
pass.dispatchWorkgroups(Math.ceil(1_000_000 / 64)) // 并行度
pass.end()
device.queue.submit([encoder.finish()])
```

这 100 万个数在 GPU 上并行计算平方，**比 CPU 快数十倍**。

---

## 五、适合前端开发者的 WebGPU 场景

1. **高性能数据可视化** —— 百万级数据点实时渲染
2. **图像/视频处理** —— 滤镜、特效、色彩校正
3. **物理模拟** —— 粒子系统、碰撞检测
4. **机器学习推理** —— 在浏览器中运行小型模型
5. **游戏引擎** —— 3A 级 Web 游戏

---

## 六、学习资源推荐

-   [WebGPU 官方规范](https://www.w3.org/TR/webgpu/)
-   [WebGPU Fundamentals](https://webgpufundamentals.org/) —— 最佳入门教程
-   [Three.js WebGPU 支持](https://threejs.org/) —— 高级抽象，无需手写 WGSL
-   [PlayCanvas WebGPU](https://playcanvas.com/)

---

## 七、总结

WebGPU 代表 Web 图形和计算的未来。即使你不需要手写 WGSL（Three.js/Babylon.js 会封装），理解其背后的**渲染管线**、**计算管线**和 **GPU 并行**概念，也会让你在使用高级库时更加得心应手。

**一句话：** WebGL 让浏览器能跑 3D，WebGPU 让浏览器能利用显卡来算一切。
