---
title: "Three.js 入门：前端 3D 图形开发"
date: 2024-05-16
categories: "图形学"
description: "Three.js 是最流行的 Web 3D 库，封装了 WebGL 的复杂性。本文从场景搭建、几何体、光影材质到动画交互，快速上手 3D 开发"
tags: ["图形学"]
copyright: true
---

## 前言

Three.js 封装了 WebGL 的底层 API，让你用几行代码就能在浏览器中创建 3D 场景。

---

## 一、基础场景

```javascript
import * as THREE from 'three'

// 1. 创建场景
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1a2e)

// 2. 创建摄像机（透视摄像机）
const camera = new THREE.PerspectiveCamera(
  75,                                    // 视野角度
  window.innerWidth / window.innerHeight,// 宽高比
  0.1,                                   // 近裁剪面
  1000                                   // 远裁剪面
)
camera.position.set(0, 2, 5)
camera.lookAt(0, 0, 0)

// 3. 创建渲染器
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)
```

---

## 二、几何体 + 材质 + 灯光

```javascript
// 创建一个立方体
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshStandardMaterial({
  color: 0x1890ff,
  metalness: 0.3,
  roughness: 0.4,
})
const cube = new THREE.Mesh(geometry, material)
cube.castShadow = true
scene.add(cube)

// 灯光
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(5, 5, 5)
light.castShadow = true
scene.add(light)

const ambientLight = new THREE.AmbientLight(0x404040)
scene.add(ambientLight)
```

---

## 三、动画循环

```javascript
function animate() {
  requestAnimationFrame(animate)

  cube.rotation.x += 0.01
  cube.rotation.y += 0.01

  renderer.render(scene, camera)
}

animate()
```

---

## 四、引入模型

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const loader = new GLTFLoader()
loader.load('/models/scene.glb', (gltf) => {
  scene.add(gltf.scene)
})
```

---

## 五、适用场景

```markdown
✅ 产品 3D 展示（家具、鞋服展示）
✅ 数据可视化（3D 图表、地球仪）
✅ 游戏/互动页面
✅ 建筑/BIM 可视化
✅ 交互式简历/个人主页
```

**推荐阅读：** [Three.js 官方文档](https://threejs.org/docs/)
