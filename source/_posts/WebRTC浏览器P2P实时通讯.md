---
title: "WebRTC 入门：浏览器 P2P 实时通讯"
date: 2024-08-08
categories: "网络协议"
description: "WebRTC 是浏览器的点对点实时通讯技术，支持视频通话、屏幕共享、文件传输。本文从 WebRTC 核心 API 到信令服务器搭建，实现一个视频通话 Demo"
tags: ["网络协议"]
copyright: true
---

## 前言

WebRTC（Web Real-Time Communication）是浏览器内置的 P2P 通讯技术，不需要安装任何插件即可实现：

- 视频通话 / 语音通话
- 屏幕共享
- 文件传输

---

## 一、核心 API

```javascript
// 获取本地媒体流（摄像头 + 麦克风）
const localStream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
})

// 显示到本地视频
localVideo.srcObject = localStream

// 创建 RTCPeerConnection（核心——建立 P2P 连接）
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },  // STUN 打洞
  ],
})

// 添加本地流到连接
localStream.getTracks().forEach((track) => {
  pc.addTrack(track, localStream)
})

// 监听远程流
pc.ontrack = (event) => {
  remoteVideo.srcObject = event.streams[0]
}
```

---

## 二、信令流程

```
 呼叫方                      被呼叫方
    │                           │
    ├── 1. 创建 Offer ──────────►│
    │    (SDP)                  │
    │                           ├── 2. 设置 Remote
    │                           ├── 3. 创建 Answer
    │◄────── 4. 返回 Answer ────┤
    │                           │
    ├── 5. ICE Candidate ──────►│
    │◄──── 6. ICE Candidate ────┤
    │                           │
    │══════ 7. P2P 连接建立 ════│
```

---

## 三、信令服务器（Socket.io）

```javascript
// 使用 WebSocket 交换 SDP 和 ICE Candidate
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000')
const pc = new RTCPeerConnection()

// 发起通话
async function call(targetId) {
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  socket.emit('offer', { target: targetId, sdp: offer })
}

// 接收 offer
socket.on('offer', async ({ from, sdp }) => {
  await pc.setRemoteDescription(new RTCSessionDescription(sdp))
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  socket.emit('answer', { target: from, sdp: answer })
})

// ICE 候选者交换
pc.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('ice-candidate', { target: peerId, candidate: event.candidate })
  }
}
```

---

## 四、适用场景

```markdown
✅ 视频会议（Google Meet、Zoom 的浏览器端核心）
✅ 直播推流（低延迟）
✅ 屏幕共享
✅ P2P 文件传输
✅ 在线教育/远程医疗
```

**推荐阅读：** [MDN: WebRTC API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API)
