---
title: "用 React Three Fiber 搭一座小镇：从地形网格到夜景灯光"
date: 2026-11-05
categories: "图形学"
description: "从地形网格对齐、楼体合并到窗户实例化与夜间灯光，按九个里程碑把一座能跑的小镇搭起来，每一步都给可执行的验收方法"
tags: ["图形学", "React"]
copyright: true
---

打开页面，第一眼看到的是一个岛：中间是广场和湖，湖心立着几栋高楼，北侧是商业街，东南角是沙滩，主路上有车在跑，人行道上有行人。

![正午的小镇全景：环岛主路、广场湖、湖心高楼、北侧商业街与东南角的沙滩](/web-blog/images/xiaozhen/noon-aerial.jpg)
*图 1：正午全景，346 个地块与广场湖。*

这是 `?seed=1` 的正午，全部由代码算出来。仓库里另有一批 GLB 只负责细节，关掉它们，小镇仍然成立。

目标不是做一个 3D 演示，是让你能从零把这条路走一遍：地形怎么铺、楼怎么来、夜里的光怎么造、人怎么走。项目最终 28,146 行，本文只保留最小闭环，每一步都能先跑起来，再进下一步。

边界先说清楚：不教 three.js 的场景、相机、渲染循环，那些有大量入门材料。这里处理的是另一个问题——一个生成器该怎么组织，哪里该由代码算、哪里可以交给假象。

每节末尾留了一句验收。做完一步就验一次，比全部写完之后一起调要省时间。

## 先把数据层从 React 里摘出来

项目叫「小镇生成器」，跑起来看到的这一座叫「临河小镇」，名字写在 `spec/fixture.ts` 里，由 `App.tsx` 渲染。两者不是一回事，混着叫会在读源码时迷路。

代码分成两半，边界画得很硬：`src/world/` 有 71 个 `.ts`，里面没有任何一处 React 引用；`src/components/` 有 25 个 `.tsx`，只做实例化和写矩阵。所有几何、地块、道路、可走图、行为，全在前一半用纯函数算完，后一半拿到结果只负责画。

这条边界带来两个好处。数据层可以直接在 Node 里跑，不需要浏览器；渲染层可以整个换掉，数据层不用改一行。

分层靠的是函数签名，不是注释。结构层的入口是 `composeStructure(spec)`——注意它只收一份规格，**没有种子参数**；产出细节的 `composeDetail(spec, structure, seed, library)` 才拿得到种子。想让结构层按种子抖一下，得先改签名，这个动作在评审里藏不住。

规格本身也刻意只描述语义。zod schema 里没有 x/y/z，只写“这里要一条商业街、那里要一个广场”，坐标由地图算法自己决定。原因很实际：这份规格是要给模型生成的，让它去猜坐标只会更难对齐。

仓库里随附的 `fixture` 规格描述的就是这座临河小镇：一条环岛主路、一个广场、一片沙滩、几条商业街，全都不带坐标。同一份规格随时能复现同一座镇，这是后面所有测试敢把数字钉死的前提。

验收：把 URL 加上 `?seed=21` 再打开，布局不该有任何变化，只有楼体、窗户、招牌换掉。如果连街道走向都变了，说明种子漏进了结构层。

## 地表先对齐，再谈铺路面

所有穿刺问题的根源都在这里，值得单独占一节。

地形是一张分成 160 段的高度场。路面、人行道、广场铺装是另一套矩形网格，它们的高度必须从地形上取。麻烦在于两套网格如果不共用同一批采样点，取出来的折线就永远对不齐——地形起伏的地方，路面会沉下去，人行道会浮起来。

实测代价很具体：路面按 6 米网格取样时，最多会沉到地形底下 0.69 米；同一套网格做出来的人行道，比路面高出 0.43 米。这两个数字不是观感问题，是走在路上会掉进地里、台阶会凭空出现。

修法不是去推一个解析公式，而是让铺装的顶点强制落在**地形格点**上。先把段数定成一个常量，注释里把原因写死：

```ts
// src/world/terrain.ts
/**
 * 地形网格的分段数。
 * 铺装必须按同一个格点取样，否则两套折线互不对齐，路面会在山脊处沉到地形下面。
 */
export const TERRAIN_SEGMENTS = 160
```

然后让铺装的每条轴线都从“地形格点 ∪ 矩形两端”里取值。只取格点会让矩形边缘被切掉，只取矩形端点又对不上地形，两者都并进来，再排序去重：

```ts
// src/world/compose.ts
/**
 * 沿一个方向取「地形格点 ∪ 矩形两端」，升序。
 * 铺装顶点必须落在地形网格的格点上，这是铺装不沉进地形的唯一保证。
 */
function latticeAxis(min: number, max: number, origin: number, cell: number): number[] {
  const values: number[] = [min]
  const first = Math.ceil((min - origin) / cell)
  const last = Math.floor((max - origin) / cell)

  for (let i = first; i <= last; i += 1) {
    const value = origin + i * cell
    if (value > min && value < max) values.push(value)
  }

  values.push(max)
  return values
}
```

两条轴都这么来一遍，铺装网格就落在地形格点上了。剩下唯一的高度差是一个常量：`const cell = spec.size / TERRAIN_SEGMENTS` 定出格距，铺装整体抬 `ROAD_LIFT = 0.06`，避免与地形共面打架。

对齐之后，路面和地形逐三角形一致，不再需要任何“贴合渲染”的技巧。这也是为什么后面所有几何都能放心合并——它们本来就在同一套坐标里。

这里没有选射线检测贴地，原因值得记一下。射线能求出任意一点的高度，但它求的是“当下这张地形”的高度；铺装网格是为渲染生成的，两者一旦分别演进，就会重新错开。共用格点是结构性约束，射线是运行时补丁——前者错了测试会红，后者错了只能靠眼睛发现。

验收：把相机压到第一人称，沿着主路走一圈。路面不该穿刺地形，人行道与路面之间只该有 6 厘米的台阶，不该在起伏处突然出现或高或低的缝隙。

## 楼体是算出来的，颜色是烘进顶点的

每个地块带三个信息：区域标识、地块类型、序号。这三样决定了它上面能长出什么，以及后续所有随机性从哪来。

楼不是按地块等比缩放的。等比缩放到刚好塞满，会遇到一个很现实的问题：一栋楼如果按两轴的较小系数缩放，另一边就会空出大片地方；如果两轴各自拉满，楼的平面形状又会变形到看不出原型。

`fitScale` 的做法是折中——先取两轴等比系数里的小者兜底，再允许每轴单向放大，最多到 `STRETCH_CAP = 1.35` 倍：

```ts
// src/world/assembleBuildings.ts
export function fitScale(lot: Lot, variant: BuildingVariant): [number, number] {
  const fill = lotFillRatio(lot.kind)
  // 东西朝向的建筑会被转过 90°，占地要按局部轴算（见 lotFootprint）
  const footprint = lotFootprint(lot)
  const targetWidth = Math.max(3.2, (footprint.width - 2) * fill)
  const targetDepth = Math.max(3.2, (footprint.depth - 2) * fill)

  const sx = targetWidth / variant.size.x
  const sz = targetDepth / variant.size.z
  const cap = Math.min(sx, sz) * STRETCH_CAP

  return [Math.min(sx, cap), Math.min(sz, cap)]
}
```

1.35 这个数不是拍脑袋来的。370 个非广场地块上试过三档：封顶 1.35 时，变形比最大就是 1.35，土地占用 87%，零溢出；改成纯等比 1.0，占用掉到 65%，全镇明显发空；两轴各自拉满，变形比的中位数就到了 1.54，最大 4.09，楼已经不像楼。

颜色是这一节真正省事的地方。多材质意味着多次绘制，所以这里不给楼分材质，而是**在几何合并前把颜色写进顶点属性**。每栋楼拆成外壳和屋顶两片，各自涂一次色再入合并队列：

```ts
// src/world/buildings.ts
/** 墙体 + 屋顶 + 顶部标志物。 */
function shellGeometry(params: BodyParams): THREE.BufferGeometry[] {
  const bodyHeight = params.groundFloorHeight + (params.floors - 1) * params.floorHeight

  const body = new THREE.BoxGeometry(params.width, bodyHeight, params.depth)
  body.translate(0, bodyHeight / 2, 0)

  const roof =
    params.roof === 'gable'
      ? gableRoof(params.width * 1.04, params.depth * 1.04, params.roofHeight)
      : params.roof === 'hip'
        ? hipRoof(params.width * 1.08, params.depth * 1.08, params.roofHeight)
        : flatRoof(params.width, params.depth, params.roofHeight)
  roof.translate(0, bodyHeight, 0)

  const parts = [paint(body, params.bodyColor), paint(roof, params.roofColor)]
```

合并的入口是 `buildTownGeometry`，逐栋生成、压进同一个数组、最后合成一份几何：

```ts
// src/world/buildings.ts
/** 把整座小镇的建筑合并成单一几何体 —— 一个 draw call。 */
export function buildTownGeometry(
  lots: Lot[],
  field: TerrainField,
  palette: Palette,
  worldSeed: number,
): { geometry: THREE.BufferGeometry | null; windows: WindowSlot[] } {
  const parts: THREE.BufferGeometry[] = []
  const windows: WindowSlot[] = []

  for (const lot of lots) {
    const result = buildBuilding(lot, field, palette, worldSeed)
    if (!result) continue
    parts.push(result.geometry)
    windows.push(...result.windows)
  }

  if (parts.length === 0) return { geometry: null, windows }

  return {
    geometry: mergeGeometries(parts, false),
    windows,
  }
```

结果是一座镇 43,336 个三角面、130,008 个顶点、**1 个 mesh**。代价写在 `paint()` 里：要合并就得把索引几何展开成非索引，面数不变，顶点数变成面数的三倍。这是拿顶点换绘制次数，在静态几何上划算，在逐帧变形的模型上不成立。

![21:30 的夜景全景：窗光与地面光斑沿主路连成亮带，湖心高楼与广场清晰可辨](/web-blog/images/xiaozhen/night-aerial.jpg)
*图 2：21:30 的夜景全景，seed=1。*

![同机位的第二张：街道走向、广场与湖岸线完全相同，楼体、窗户与招牌全部更换](/web-blog/images/xiaozhen/night-seed21.jpg)
*图 3：同机位换成 seed=21，布局不动，楼全换。*

验收：打开 DevTools 的性能面板或 three 的 info，建筑部分的 draw call 应该是 1。把图 2 与图 3 并排看，街道、广场、湖岸必须一模一样，只有楼体在变——这就是结构层拿不到种子的直接证据。

## 四千扇窗压成一次绘制

窗户数量大、形状完全相同、只有位置和颜色不同，正好是实例化的教科书场景。整座镇 4,628 扇窗合成一个 `instancedMesh`。

实例化本身不难，难在三个坑。

第一个：`setMatrixAt` 写完之后必须调 `computeBoundingSphere()`。不调，three 会拿旧的包围球做视锥剔除，相机一转，整片窗户会毫无征兆地消失。

第二个：窗户要在夜里透出不同色温，直觉是用 `setColorAt`。但 `instanceColor` 只会被 `<color_fragment>` 乘进 diffuse，碰不到 `totalEmissiveRadiance`——也就是说，它影响的是窗玻璃的“底色”，不是“发光”。要一扇窗一个色温，必须自己补一条只喂发光的实例属性。

第三个是最阴的：这条属性如果没人创建，three 会退回 GL 默认值 `(0,0,0,1)`，片元里 `totalEmissiveRadiance *= 0`。结果是**编译不报错、白天一切正常、夜里窗光全灭**。

```jsx
// src/components/Town.tsx
useLayoutEffect(() => {
  const mesh = ref.current
  if (!mesh || slots.length === 0) return

  const vColor = new THREE.Color()
  // 色温由 buildings.ts 按「区域档 + lotSeed 抖动」逐窗写进 slot.tint
  const tints = new Float32Array(slots.length * 3)

  slots.forEach((slot, index) => {
    dummy.position.set(slot.x, slot.y, slot.z)
    dummy.rotation.set(0, slot.rotationY, 0)
    dummy.scale.set(slot.width, slot.height, 1)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
    mesh.setColorAt(index, vColor.set(slot.tint))
    tints[index * 3] = vColor.r
    tints[index * 3 + 1] = vColor.g
    tints[index * 3 + 2] = vColor.b
  })
  mesh.geometry.setAttribute(
    EMISSIVE_TINT_ATTRIBUTE,
    new THREE.InstancedBufferAttribute(tints, 3),
  )
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
}, [slots])
```

![夜间商业街街景：霓虹招牌、亮着的窗户、公交与行人](/web-blog/images/xiaozhen/street-night.jpg)
*图 4：商业街夜景，窗光的冷暖差异来自逐实例的发色温属性。*

验收：拖到 21:30，商业街的窗户应该有冷有暖（对比图 4）；把上面那行 `setAttribute` 注释掉再刷新，白天看不出任何区别，夜里窗光会整片消失。这个对比本身就是最好的检查。

## 夜里的亮不靠光源数量

夜色的底子来自一张逐小时插值的天空状态。9 条关键帧覆盖整天，太阳高度、色温、雾色、天幕亮度从中插出来，白天和夜里共用同一套结构。

真正容易漏的是这一句乘法：

```ts
// src/world/clock.ts
export function computeSkyState(hour: number): SkyState {
  const { from, to, t } = frameAt(hour)
  const sunPosition = sunPositionAt(hour)
  const elevation = sunPosition[1]
  const elevationSin = elevation / SUN_RADIUS

  // 太阳落在地平线以下就不再照亮：直接沿用关键帧的强度会让方向光从地下往上打
  const horizon = clamp01(elevation / 20)

  return {
    sunPosition,
    sunIntensity: lerp(from.sunIntensity, to.sunIntensity, t) * horizon,
    sunColor: mixColor(from.sunColor, to.sunColor, t),
    ambientIntensity: lerp(from.ambientIntensity, to.ambientIntensity, t),
    ambientSky: mixColor(from.ambientSky, to.ambientSky, t),
    ambientGround: mixColor(from.ambientGround, to.ambientGround, t),
    background: mixColor(from.background, to.background, t),
    fogColor: mixColor(from.fogColor, to.fogColor, t),
    horizonColor: mixColor(from.horizonColor, to.horizonColor, t),
    windowGlow: lerp(from.windowGlow, to.windowGlow, t),
    nightFill: clamp01(-elevation / 60) * 0.25,
    isNight: elevation <= 0,
    sunElevation: elevationSin,
    moonPosition: moonPositionAt(hour),
    starOpacity: starVisibility(elevationSin),
  }
}
```

不乘 `horizon`，太阳落到地平线以下之后方向光会从地下往上打，夜里整座镇反着亮——楼顶一片黑，楼底一片亮。

然后是光源。全镇 408 盏路灯，真正挂点光源的只有 5 盏：广场 4 盏、沙滩 1 盏，按离广场和沙滩的远近挑出来。其余 403 盏的贡献只有两样：一盏合并进几何的自发光灯头，和**一整片合并的 additive 贴地光斑**——圆盘半径 5.2 米，抬离铺装 0.05 米，不写深度。

灯是假的，被照亮的地面是真的。观感上没人会去数光源，只会看地上有没有那片暖色。

阴影同理，只有方向光那一张 2048² 的阴影图。它默认每帧重画，这里关掉自动更新，改成 `SHADOW_UPDATE_INTERVAL = 2`，每两帧标记一次重绘。依据是全镇 37 万投影三角铺满阴影图大约 1.4 毫秒，而投影物绝大多数是静态的，隔一帧看不出来。

图 2 与图 3 里沿主路连成一条带子的东西，就是这些光斑接起来的效果；把它拆成 408 盏真实光源，这个画面在集成显卡上撑不住。

验收：把时间轴拖过 18:00 到 21:30，地面应该先亮、天幕后暗；把 `* horizon` 去掉再跑，夜里会看到楼体上下颠倒的照明。

## 让人不用碰撞也能走对路

140 个居民，行为是一棵“优先级选择器”行为树：睡觉 → 避雨 → 上午上班 → …… → 回家兜底，每个节点判断条件成立就接管，不成立就交给下一个。

这个顺序本身就是设计。避雨排在上班前面，是因为下雨天还在通勤看起来像 bug；回家放在最后兜底，保证任何时刻都有一个合法目标，行为树不会走进没有分支的状态。

关键在于所有节点的目标都只返回一个 `nodeId`，而不是坐标。人在可走图的节点之间移动，目的地永远是合法节点，所以运行时不需要任何碰撞检测。

可走图在建图时就按水面过滤了一次：节点判一次 `isDry`，边再过一次中点判定，避免出现跨过窄水道的边。

```ts
// src/world/walkable.ts
export function buildWalkableGraph(
  grid: StreetGrid,
  field: TerrainField,
  plazas: Rect[] = [],
): WalkableGraph {
  const nodes: WalkNode[] = []
  const index = new Map<string, number>()

  for (let col = 0; col <= grid.cols; col += 1) {
    for (let row = 0; row <= grid.rows; row += 1) {
      const x = gridLineX(grid, col)
      const z = gridLineZ(grid, row)
      if (insideAnyRect(plazas, x, z)) continue
      if (!field.isDry(x, z)) continue
      const id = nodes.length
      nodes.push({ id, x, z, y: field.heightAt(x, z) })
      index.set(nodeKey(col, row), id)
    }
  }

  const edges: WalkEdge[] = []
  const adjacency: number[][] = nodes.map(() => [])
```

边连起来的时候还要再判一次。`connect` 里取出两端的中点，`if (!field.isDry(midX, midZ)) return`——节点是干的、中间是水，这条边就不该存在。同一条链路上还拦了广场内部（`insideAnyRect`），因为广场不铺街道。两个过滤都发生在建图时，跑起来之后一次都不会再判。

过滤之后，**可达集就等于边集**。搜索路径时不用担心走到水里，因为水里根本没有节点；也不用担心撞墙，因为墙的位置根本没有边。

人形也没用 `SkinnedMesh`。7 根骨、24 帧动画烘成一张纹理，顶点着色器按实例相位取行做变换，140 个人共用一套骨架，2 个 draw call。

验收：切到雨天，把人放到商业街，他们应该往最近的屋檐走，不穿墙、不进水；再切到雪天看走路节奏是否跟着变慢。

## HUD 不该每帧碰 React

相机遥测每帧都在变。如果写进 React 状态，就是每帧一次全树 reconcile——一个只显示坐标和朝向的小组件，会把整棵树拖下水。

做法是把这条链路拆成三段，React 只参与第一段：

```ts
// src/hud/telemetry.ts
/**
 * HUD 遥测：罗盘、经纬度与圆形地图共用的那几个数。
 *
 * 3D 场景在 Canvas 里每帧更新，HUD 在 Canvas 外面。把这些数写进 React state
 * 就是每帧一次全树 re-render，所以这里只放一个可变快照：
 * `CameraTelemetry` 每帧写，罗盘与地图每帧读，两边都不经过 React。
 * 这是刻意的共享可变对象，不是随便改的外部状态 —— 它的唯一职责就是当这块缓冲区。
 */
export interface CameraSnapshot {
  /** 视线落点的世界 X（视线打不到地面时退回沿视线水平方向的一个点） */
  x: number
  z: number
  /** 航向，弧度：0 = 北（−Z），顺时针到东（+X），与 CSS 旋转同向 */
  heading: number
  /** 相机高度（米） */
  altitude: number
}

export const cameraSnapshot: CameraSnapshot = { x: 0, z: 0, heading: 0, altitude: 0 }

export function writeSnapshot(x: number, z: number, heading: number, altitude: number): void {
  cameraSnapshot.x = x
  cameraSnapshot.z = z
  cameraSnapshot.heading = heading
  cameraSnapshot.altitude = altitude
}
```

Canvas 外由 `hud/useHudFrame.ts` 自己起一个 `requestAnimationFrame` 循环读它，罗盘和圆形地图直接改 DOM 的 `style` 与 `textContent`。React 只渲染一次结构，之后再也不参与。

这条链路唯一的约束是那个可变对象必须唯一、职责单一。一旦有两处往同一个对象里写，读的一方就分不清手里拿到的是相机数据还是别的东西。

一个容易踩的顺序问题：`CameraTelemetry` 组件必须挂在 `CameraRig` 之后。R3F 的 `useFrame` 按订阅顺序执行，顺序错了读到的是上一帧的相机位置，HUD 会永远慢一拍。

验收：打开 DevTools 的 Performance 录 5 秒，拖动时间轴。React 的 commit 次数应该只有开始和结束那两次，不该随帧数增长。

## 怎么验证生成器没跑偏

这类项目的测试难点是：输出是几万个浮点数，“看起来对”完全不可靠。跑偏一次，可能一个月后才发现。

手法是几何指纹加黄金基线。把生成结果的 Float32 位模式整体做一次 FNV-1a，得到一个整数；`LOT_COUNT = 346`、`LOT_HASH = 131985459` 这类值直接钉进断言。不四舍五入，也不比距离——纯函数必须逐位相同，容差会让回归悄悄溜过去。

只有正向断言还不够，容易写出“永远通过”的空测试。所以反面也要钉一条：换一个种子，外观指纹必须真的变。这条断言防的是“测试空转”——哪天有人把随机性改没了，它立刻红。

黄金基线不自动更新。改了布局算法，指纹必然变，这时要做的是先确认新结果是对的，再手动改掉常量；如果让测试自己跟随，它就不再是基线，只是一张会说话的快照。

规模是 352 个用例、87 个套件、4.1 秒跑完，用 `node:test` 加一个自写的 `ts-resolve.mjs` 解析路径，不引第三方测试框架。

另有一处工程细节：项目配了两套 tsconfig，让浏览器代码看不见 Node 全局。少了这层，`world/` 里会悄悄出现 `process.env`，等真正搬到浏览器再炸。

验收：随便改一行布局代码，比如把街道间距加 1 米，测试应该在 5 秒内红，并且报出对不上的指纹。

## 搬到别的场景要改什么

整套结构里真正与“小镇”绑定的东西不多，换场景时按这张单子过一遍：

- 规格里只留语义字段，坐标继续交给地图算法，别为了快而在 schema 里写死 x/z
- 铺装与地形的格点对齐必须保留，这是所有穿刺问题的总闸
- 颜色继续烘进顶点，别为了几个特殊零件退回多材质
- 夜景继续用合并光斑而不是加灯，光源数量一上去，阴影和光照都会翻倍

天气是另一条省事的路子：它只乘系数、不改几何。下雪时把地面顶点色直接改成雪色，屋顶积雪单独扫一遍朝上的三角面生成，不需要任何新模型。图 5 是白天雪景，能同时看到屋顶积雪、降雪和雾。

![白天雪景：屋顶积雪、正在下落的雪与远处的雾](/web-blog/images/xiaozhen/snow-day.jpg)
*图 5：雪天，屋顶积雪单独生成，雾由天气系数控制。*

验收：把小镇换成你的场景，这四条都过一遍，能跑起来就算搬完。

**推荐阅读：**
- [three.js 文档](https://threejs.org/docs/)
- [React Three Fiber 文档](https://r3f.docs.pmnd.rs/getting-started/introduction)
- [InstancedMesh](https://threejs.org/docs/#api/en/objects/InstancedMesh)
