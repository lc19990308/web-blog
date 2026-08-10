---
title: "Rust + WebAssembly：先测量，再迁移性能热点"
date: 2026-07-08
categories: "工程化"
description: "Wasm 适合迁移已被测量确认的纯计算热点。本文从选型、构建、Worker 接入到回归验收，说明怎样避免为了性能而增加无效复杂度。"
tags: ["工程化", "JavaScript"]
copyright: true
---

WebAssembly（Wasm）是浏览器可以执行的二进制格式。Rust 能编译到 Wasm，也有成熟的工具链，但它不是前端性能优化的默认答案。

真正值得迁移的通常是已经被测量确认的纯计算热点，例如图像编码、几何计算、压缩或领域解析器。网络请求、DOM 更新和少量数据处理即使改写成 Wasm，也未必能缩短用户等待时间，还会增加初始化、数据转换和调试成本。

这篇文章不提供脱离设备、浏览器和数据集的“固定加速倍数”。它给出一条更可靠的路径：先建立 JS 基线，再用同一批输入测量，只有收益超过复杂度时才迁移。

## 先判断问题是否适合 Wasm

Wasm 的优势主要来自稳定的低层计算模型，不等于整个页面会更快。以下情况通常值得做 PoC：

- 一段计算在真实设备上反复出现在 Performance 面板或业务埋点中，并影响交互的 p95 耗时。
- 输入可以用 `Uint8Array`、`Float32Array` 等连续数据表示，避免频繁把大对象序列化成 JSON 再跨越 JS/Wasm 边界。
- 算法不依赖 DOM，能放进 Web Worker，主线程只负责交互和渲染。
- 团队愿意维护 Rust 工具链、Wasm 包体积、错误上报与回归测试。

以下情况应先保留 JavaScript：瓶颈来自接口、图片下载或布局；计算本身只有几毫秒；主要工作是调用浏览器 API；或者很难稳定复现问题。现代 JS 引擎对普通业务代码已经足够快，先消除不必要的渲染和 I/O 往往更有效。

## 先测量，再迁移

<iframe class="article-diagram" src="/web-blog/diagrams/wasm-hotspot-migration-workflow.html" title="Wasm 热点迁移流程图" loading="lazy"></iframe>

<p class="diagram-caption">图：Wasm 是性能流程中的一个分支。确认不是 CPU 热点时，继续使用 JavaScript。</p>

先为一次完整用户操作记录基线，而不是只测某个函数的一次调用。至少同时观察：

- 预热后的 p50 与 p95 耗时，以及测试输入的规模和浏览器版本。
- 模块下载、编译和初始化是否影响首屏或首次操作。
- 内存、包体积与 Worker 通信的开销，是否抵消了计算收益。

浏览器的 Performance 面板适合定位长任务；业务侧可以用 `performance.mark()` 记录真实路径。下面的代码只负责收集一个操作的耗时，结果需要在同一设备和同一组输入下多次比较。

```ts
export async function measure<T>(name: string, task: () => Promise<T> | T) {
  performance.mark(`${name}:start`)
  const result = await task()
  performance.mark(`${name}:end`)
  performance.measure(name, `${name}:start`, `${name}:end`)

  const [entry] = performance.getEntriesByName(name).slice(-1)
  console.info(name, `${entry.duration.toFixed(1)} ms`)
  performance.clearMarks(`${name}:start`)
  performance.clearMarks(`${name}:end`)
  performance.clearMeasures(name)
  return result
}
```

## 构建一个足够小的 Wasm 模块

Rust、C/C++、AssemblyScript 都能生成 Wasm。Rust 适合团队已经使用 Cargo、希望得到较强的类型和内存安全保障的场景；它不是唯一选择。先从一个无 DOM、输入输出清晰的函数开始，别一开始就搬运整条业务链路。

```bash
# 一次性准备工具链
rustup target add wasm32-unknown-unknown
cargo install wasm-pack

# 构建供浏览器直接加载的产物
wasm-pack build --target web --release --out-dir pkg
```

`Cargo.toml` 只保留这个例子需要的依赖：

```toml
[package]
name = "byte-counter"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
```

这个函数接收二进制数据，刻意不碰 DOM，也不保存跨调用状态：

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn count(data: &[u8], target: u8) -> u32 {
    data
        .iter()
        .filter(|&&byte| byte == target)
        .count() as u32
}
```

`wasm-pack` 会在 `pkg/` 中生成 `.wasm` 文件和负责加载它的 JavaScript 包装层。前端侧必须等待初始化完成，再调用导出的函数：

```ts
import init, { count } from '../wasm/pkg/byte_counter.js'

let ready: Promise<void> | undefined

export async function countNewlines(bytes: Uint8Array) {
  ready ??= init()
  await ready
  return count(bytes, 10)
}
```

路径和构建集成依赖你的脚手架。重点不是照抄目录，而是确保产物会被部署、MIME 类型正确，并在 CI 中从干净环境重新构建。

## 把计算移出主线程

Wasm 不会自动多线程。普通 Wasm 模块仍可能占满浏览器主线程，因此对长计算更常见的组合是 **Wasm + Web Worker**。Worker 初始化一次，随后处理多次消息：

```ts
// compute.worker.ts
import init, { count } from '../wasm/pkg/byte_counter.js'

const ready = init()

self.onmessage = async ({ data }: MessageEvent<{ id: string; bytes: Uint8Array }>) => {
  await ready
  const value = count(data.bytes, 10)
  self.postMessage({ id: data.id, value })
}
```

Worker 与主线程之间仍然有数据传递成本。大数据可以评估 `ArrayBuffer` 的 Transferable 传递方式，但传递后原线程的缓冲区会被置空，调用方需要明确所有权。别为了“用了 Worker”又把同一份数据复制三次。

Wasm 可以通过 JavaScript 导入或 Rust 的 `web-sys` 间接调用浏览器 API，但每次跨边界都有成本，也会让测试更复杂。DOM、事件和渲染状态通常留在 JavaScript 一侧更清楚。

## 用回归数据决定是否保留

把 Wasm 实现与原有 JS 实现并存一段时间，比较相同输入的结果和完整操作耗时。生产验收至少覆盖：

- 正确性：边界数据、失败输入和浏览器兼容性与 JS 版本一致。
- 性能：预热后的 p95、首次使用耗时、内存峰值和主线程长任务都有记录。
- 交付：`.wasm` 资源随版本发布，缓存策略可控，加载失败时有清晰的降级或报错路径。
- 观测：能区分 Wasm 初始化失败、Worker 通信失败和算法执行失败。

Rust + Wasm 的价值在于给明确的计算瓶颈一条可控的优化路径。先让 JavaScript 版本正确且可测，再用真实数据证明迁移值得，这比追逐任何固定的性能倍数更可靠。

参考：[MDN WebAssembly 概述](https://developer.mozilla.org/zh-CN/docs/WebAssembly)、[Rust and WebAssembly](https://rustwasm.github.io/docs/book/) 与 [wasm-pack](https://drager.github.io/wasm-pack/)。
