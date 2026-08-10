---
title: "React Native 跨平台移动端开发实战"
date: 2026-07-15
categories: "React"
description: "从项目初始化到原生模块桥接，再到性能优化与热更新，系统讲解 React Native 在生产环境中的完整实践"
tags: ["React"]
copyright: true
---

## 前言

React Native 是 Meta 开源的跨平台移动端框架，让你用 React 的语法开发 iOS 和 Android 应用。

> "Learn once, write anywhere" —— 学会 React，就能写 iOS 和 Android。

---

## 一、React Native vs Flutter vs 原生

| 维度 | React Native | Flutter | Swift/Kotlin |
|------|-------------|---------|--------------|
| 语言 | JavaScript/TypeScript | Dart | Swift/Kotlin |
| 渲染引擎 | JavaScript Bridge → 原生组件 | Skia 自绘引擎 | 原生 SDK |
| 热重载 | ✅ Fast Refresh | ✅ Hot Reload | ❌ |
| 性能 | 中（有 Bridge 开销） | 高（自绘引擎） | 最高 |
| 生态系统 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| 学习成本 | 低（会 React 即可） | 中 | 高 |

**选择 RN 的理由：** 如果团队已有 React 经验，RN 是最快切入移动端的方案。

---

## 二、项目初始化

```bash
npx react-native init MyApp --template react-native-template-typescript
```

目录结构：

```
MyApp/
├── android/          # Android 原生项目
├── ios/              # iOS 原生项目
├── src/
│   ├── components/   # 通用组件
│   ├── screens/      # 页面
│   ├── navigation/   # 路由导航
│   ├── services/     # API 服务
│   └── hooks/        # 自定义 Hooks
├── App.tsx           # 入口
└── package.json
```

---

## 三、核心概念

### 3.1 组件

RN 没有 HTML 标签，取而代之的是 RN 内置组件：

```tsx
import { View, Text, ScrollView, FlatList, TouchableOpacity, TextInput } from 'react-native'

function MyComponent() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello React Native</Text>
      <TextInput placeholder="请输入" />
      <TouchableOpacity onPress={handlePress}>
        <Text>点击</Text>
      </TouchableOpacity>
    </View>
  )
}
```

### 3.2 样式

RN 使用 JavaScript 对象来写样式（类似 CSS-in-JS）：

```tsx
import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  }
})
```

**注意：** RN 的样式是 Flexbox 布局，默认 `flexDirection: 'column'`（Web 是 row）。

---

## 四、导航

使用 `@react-navigation`：

```bash
npm install @react-navigation/native @react-navigation/native-stack
```

```tsx
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

const Stack = createNativeStackNavigator()

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

---

## 五、原生模块桥接

当 RN 没有提供某个原生 API 时，你需要写原生模块。

### 5.1 Android（Kotlin）

```kotlin
// ToastModule.kt
class ToastModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "ToastModule"

    @ReactMethod
    fun show(message: String, duration: Int) {
        Toast.makeText(reactApplicationContext, message, duration).show()
    }
}
```

### 5.2 iOS（Swift）

```swift
// ToastModule.swift
@objc(ToastModule)
class ToastModule: RCTEventEmitter {
  @objc
  func show(_ message: String, duration: Double) -> Void {
    // 调用原生 Toast
  }
}
```

### 5.3 JS 调用

```ts
import { NativeModules } from 'react-native'

NativeModules.ToastModule.show('Hello from RN!', Toast.SHORT)
```

---

## 六、性能优化

### 6.1 FlatList 虚拟列表

```tsx
// ✅ 使用 FlatList 替代 ScrollView 渲染长列表
<FlatList
  data={items}
  renderItem={({ item }) => <ItemComponent item={item} />}
  keyExtractor={item => item.id.toString()}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
/>
```

### 6.2 Hermes 引擎

```json
// android/app/build.gradle
project.ext.react = [
  enableHermes: true,  // 启用 Hermes 引擎，启动速度快 2 倍
]
```

### 6.3 减少 Bridge 通信

```tsx
// ❌ 避免频繁跨 Bridge 更新
onScroll={(e) => {
  NativeModules.DeviceModule.updatePosition(e.nativeEvent.contentOffset.y) // 每次滚动都通信
}}

// ✅ 批量处理或使用 worklet
```

---

## 七、热更新（CodePush / Expo Update）

```bash
npm install react-native-code-push
```

```tsx
import CodePush from 'react-native-code-push'

@CodePush({
  checkFrequency: CodePush.CheckFrequency.ON_APP_START,
  installMode: CodePush.InstallMode.ON_NEXT_RESTART
})
class App extends Component { /* ... */ }
```

无需经过 App Store / Play Store 审核即可更新 JS Bundle。

---

## 八、总结

React Native 的核心优势在于 **React 生态的复用** 和 **热更新能力**。适合以下场景：

- 移动端 MVP 快速验证
- 纯展示为主的 App
- 团队以 Web 前端为主

如果对性能有极致要求（如游戏、视频编辑），则建议 Flutter 或原生。
