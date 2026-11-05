---
title: "React Three Fiber 夜间小镇：程序化建模、光照与性能账本"
date: 2026-11-05
categories: "图形学"
description: "夜间小镇的难点不在把楼画出来，而在决定哪些交给代码生成、哪些交给光照假象。本文用 346 个地块的小镇说明 draw call、路灯与阴影上的取舍"
tags: ["图形学", "React"]
copyright: true
---

这座小镇能做的事不算少：五种相机视角、一整夜的时间轴、四季与天气。它的可信度不来自这些功能，而来自一组约束——地块不能重叠、路面不能穿进地形、同一颗种子必须生成同一座镇。

约束收得越紧，观感越像一个地方，而不是一堆随机摆放的盒子。下面讲四件事：换种子不改布局、一次绘制付了什么、夜里的光由什么构成，以及几笔不在 GPU 上的账。场景与渲染循环的基础另文交代。

## 换种子不该改布局

很多程序化项目的稳定性靠约定撑着：结构层不读种子，作者记得不读。这里不靠记性——结构函数的签名里没有种子参数，它只接受一份规格，返回地块、道路与可走图；产出细节的函数才拿得到种子。想给结构层加一点随机性，得先改签名，这个动作在评审里藏不住。

种子分三层：地形、布局、居民各自固定，只有世界种子暴露给用户。每个地块再派生一条独立随机流，一栋楼的随机性不会串到隔壁。

```ts
// src/world/buildings.ts
// 每个地块按「世界种子 + 序号 + 区域名哈希」派生出独立随机流
const rng = createRng(mixSeed(worldSeed, lot.lotIndex, hashString(lot.regionId)))
// 东西朝向要先交换宽深，否则长边会顶到地块的短边上
const footprint = lotFootprint(lot)

// 省略：建筑、配件与窗户都从这条流取数，
// 下一个地块用新种子重新开始，互不影响
```

副产品是结构层的 71 个模块里没有一处 React 引用，全部是纯函数，可以在 Node 里直接跑。随机源也是自带实现，没有 `Math.random`。

不过纯函数跑得快不等于首屏快。两层生成在本机 Node 上合计一百多毫秒，这只覆盖数据部分，浏览器还要编译着色器、上传纹理、建实例缓冲。

## 一个 draw call，代价是三倍顶点

整镇建筑合并成一份几何，最后只留一个网格。346 个地块是 43,336 个三角面，一次绘制。合并的难点不在把几何拼起来，在把材质也统一掉：进入合并前给每个顶点写一个颜色属性，整片用一个顶点色材质，于是不必按材质分批。

代价藏在索引里。合并要求把索引几何展开成非索引，三角面数不变，顶点数从 43,336 涨到 130,008。用三倍顶点换一次绘制，在静态几何的小镇里划算；换成逐帧变形的模型就不成立。

```ts
// src/world/paint.ts
// 合并要求所有几何共用一个材质，颜色只能落在顶点上
const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry
const count = nonIndexed.attributes.position.count
const colors = new Float32Array(count * 3)
for (let i = 0; i < count; i += 1) {
  colors[i * 3] = color.r
  colors[i * 3 + 1] = color.g
  colors[i * 3 + 2] = color.b
}
nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3))
```

| 手段 | 换来的 | 付掉的 |
| --- | --- | --- |
| 建筑合并成一个网格 | 一次绘制 | 顶点数涨到三倍 |
| 顶点色替代多材质 | 合并时不必分批 | 颜色只能逐顶点烘焙 |
| 窗户走实例化 | 四千多扇窗只占一次绘制 | 单扇差异只能走实例属性 |

合并的只是程序化那部分：地形、道路、地块与可走图必须由代码产出，几何一致性不能交给手工；其余物件可以是模型文件，逐子系统一个开关、缺件按类回退。

窗户数量大、形状相同、只有颜色与位置不同，正好是实例化的定义。

## 408 盏路灯，只有 5 盏是真的

夜里的小镇看起来灯火通明，四百多盏路灯里挂点光源的只有五盏：广场四盏，沙滩一盏，按离广场与沙滩的远近挑出。港区、机场另有几盏，那是有明确照明对象的地方，不在街道这笔账里。

其余四百零三盏灯的全部贡献是两样东西：一盏合并进几何的自发光灯头，和一大片合并的贴地光斑。光斑是一个圆盘，半径五米出头，抬离铺装五厘米，叠加混合、不写深度。灯的错觉来自那块被照亮的圆盘，不来自灯本身。

```jsx
// src/components/Lamps.tsx
// 真正挂点光源的路灯数量，按离广场与沙滩的远近挑选
const PLAZA_LIGHT_COUNT = 4
const PLAZA_LIGHT_CANDELA = 200
const BEACH_LIGHT_COUNT = 1
const BEACH_LIGHT_CANDELA = 90

return [...lamps]
  .sort((left, right) => distanceToPlaza(left) - distanceToPlaza(right))
  .slice(0, PLAZA_LIGHT_COUNT)

// 省略：其余路灯的全部贡献是合并进几何的灯头 + 一片合并的贴地光斑
```

账在这里：点光源不投阴影，但每个像素都要为它多算一次光照，而夜间画面的主体是暖色墙脚和地面反光，靠叠加的贴片就能伪造。唯一那张阴影图来自方向光，与路灯无关。把“看起来亮”和“真的有光”分开，是这类场景最有效的一次解耦。

## 交互不是拾取，是参数

这套场景里没有一处点击拾取。交互面全部是参数：五种相机模式、时间轴、四季、天气、音频开关，外加一组按子系统拆开的 URL 开关。

```jsx
// src/App.tsx
const CAMERA_LABELS: Array<{ value: CameraMode; label: string }> = [
  { value: 'orbit', label: '鸟瞰' },
  { value: 'street', label: '街景' },
  { value: 'fp', label: '第一人称' },
  { value: 'tour', label: '巡游' },
  { value: 'follow', label: '跟随' },
]

// 省略：时间轴、季节、天气与音频状态，
// 以及 ?seed ?hour ?lamps ?debug 这组逐子系统开关
```

做成参数的好处是状态可还原：一个 URL 能复现画面；代价是没有直接操作的爽感。

参数化还带来一个约束：每帧变化的值不能进 React 状态，相机遥测写进状态就是每帧一次全树重渲染。做法是拿一个可变对象承接每帧数值，HUD 直接改 DOM 文本，状态完全不参与。

## 后处理装了但没接

依赖清单里躺着两个后处理包，源码引用是零，产物里也找不到合成器。霓虹不靠后期叠，靠几块材质参数：基础色材质、关掉色调映射与雾，深夜把颜色乘到两倍过曝，再补一块放大的溢光面。

这是未完成，不是设计。写清楚是因为它影响判断：所有“加一层泛光会好看”的讨论，在这套实现里都还没有被验证过。

```jsx
// src/components/Town.tsx
// 霓虹色烘顶点色；MeshBasic 直出即发光观感（不吃光照、不投影）
const glowMaterial = useMemo(
  () => new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide,
    toneMapped: false, fog: false,
  }),
  [],
)
useEffect(() => {
  // 深夜满亮并过曝，2.0 倍才能从暗街里顶出来；白天只剩灭灯塑料白
  const lit = Math.min(2.0, night * 1.4)
  glowMaterial.color.setRGB(0.06 + lit * 0.94, 0.07 + lit * 0.93, 0.08 + lit * 0.92)
}, [glowMaterial, night])
```

能接受的理由是分辨率：后处理按屏幕像素走，泛光要和主渲染抢同一份预算，而霓虹面积很小，用溢光几何可能更划算。这是假设，还没量过。

材质还有一个坑：塞进实例化网格的参数会触发 R3F 重建网格，实例颜色写进被丢弃的旧对象，表现为整片变黑；通过属性传入的几何不会被回收，换一次种子就漏一批显存。

## 阴影贴图不需要每帧重画

方向光带一张 2048 见方的阴影图。默认行为是每帧重画，这里关掉自动更新，改成每两帧标记一次需要重绘。

依据是这条线上真正在动的只有行人和车，建筑、路灯、地面全静态。把全镇三十余万投影三角铺满阴影图约 1.4 毫秒，隔帧重绘把开销对折，而隔帧的阴影抖动几乎看不出来。

```jsx
// src/components/WorldLighting.tsx
const SHADOW_UPDATE_INTERVAL = 2
// 省略：天幕与补光的初始化
const shadowTick = useRef(0)
useEffect(() => {
  gl.shadowMap.autoUpdate = false
  gl.shadowMap.needsUpdate = true
  return () => {
    gl.shadowMap.autoUpdate = true
  }
}, [gl])

useFrame(() => {
  shadowTick.current = (shadowTick.current + 1) % SHADOW_UPDATE_INTERVAL
  if (shadowTick.current === 0) gl.shadowMap.needsUpdate = true
})
```

代价得认：移动物体的阴影有一帧延迟，车开快时看得出来。这里没人盯着车轮的投影，可以拿。

另外两个反例。项目没做 LOD，反而给三十多处关了视锥剔除：实例化后整体包围盒不可靠，误剔除会让整批消失。逐帧订阅的顺序也没有类型保护，相机遥测必须排在相机装配之后，否则读到上一帧位置。

## 发布验收

发布前值得按这张单子过一遍：

- 换五个种子各跑一次，确认布局真的变了、结构没有被随机性污染
- 关掉全部模型资源，确认场景仍然能起，只是细节消失
- 低端设备上把 `dpr` 从 `[1, 2]` 压到 1 复测，确认帧率退得可接受
- 窗口尺寸变化、切后台再回来，确认时间轴没有跳帧
- 拖动时间轴跨过晨昏线，检查窗光与霓虹的阈值没有落在恒真区间

最后一条踩过：阈值太低时，正午的窗光也会全亮。判据不是数字好看，是它落不落在真实取值区间里。

**推荐阅读：**
- [three.js 文档](https://threejs.org/docs/)
- [React Three Fiber 文档](https://r3f.docs.pmnd.rs/getting-started/introduction)
- [InstancedMesh](https://threejs.org/docs/#api/en/objects/InstancedMesh)
