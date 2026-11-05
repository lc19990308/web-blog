---
title: "WebRTC 入门：浏览器 P2P 实时通讯"
date: 2024-08-08
categories: "网络协议"
description: "WebRTC 能在浏览器中传输音视频和数据，但生产环境还需要信令、STUN/TURN、权限与网络失败处理。本文从一条可落地的通话链路讲起。"
tags: ["网络协议"]
copyright: true
---

## WebRTC 不是“建连接就能直连”

WebRTC 提供浏览器里的媒体采集、编解码和实时传输能力。视频通话、屏幕共享和数据通道都可以用它实现，但它不负责让两个用户找到彼此，也不能保证两个网络之间总能直连。

一次真实通话至少有四个角色：

- 浏览器通过 HTTPS 和用户授权取得摄像头或屏幕流。
- 信令服务交换 SDP 和 ICE 候选信息。
- STUN 服务帮助端点发现对外可达的地址。
- TURN 服务在直连失败时中继媒体流。

所以“P2P”是 ICE 尝试出的优先路径，不是产品可以承诺的网络结果。公司网络、对称 NAT 和严格防火墙常会让连接走 TURN；带宽、并发和地域因此都会变成成本问题。

## 先拿到本地媒体

媒体设备 API 要求安全上下文。生产环境必须使用 HTTPS，并为用户拒绝权限、没有摄像头和设备占用准备反馈。

```js
async function getLocalStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    })
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      throw new Error('未获得摄像头或麦克风权限')
    }
    throw error
  }
}

const localStream = await getLocalStream()
localVideo.srcObject = localStream
```

屏幕共享使用 `getDisplayMedia`，同样必须由用户操作触发。无论是摄像头还是屏幕流，都要在挂断时调用 `track.stop()`，否则设备指示灯和资源可能一直占用。

## 创建连接并准备 STUN/TURN

TURN 凭据不应硬编码在前端。常见做法是由业务后端根据已登录用户签发短期凭据，再把它交给 `RTCPeerConnection`。

```js
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.example.com:3478' },
    {
      urls: 'turn:turn.example.com:3478?transport=udp',
      username: turnCredentials.username,
      credential: turnCredentials.password,
    },
  ],
})

localStream.getTracks().forEach((track) => {
  pc.addTrack(track, localStream)
})

pc.ontrack = ({ streams }) => {
  remoteVideo.srcObject = streams[0]
}

pc.onconnectionstatechange = () => {
  console.log('connection state:', pc.connectionState)
}
```

`connectionState` 进入 `failed` 并不等同于 UI 只显示一条错误消息。产品通常需要提供重试或重新协商入口，并记录用户网络、候选类型和失败阶段，才能排查 TURN 配置或地区网络问题。

## 信令只传协商信息

信令服务器可以是 WebSocket、Socket.IO 或现有的消息通道。它只负责把消息送到同一房间的正确对端，不传输音视频。需要校验房间成员、登录态、消息大小和速率，避免任何人伪造 offer 或向陌生用户灌入候选信息。

发起端创建并发送 offer：

```js
pc.onicecandidate = ({ candidate }) => {
  if (candidate) {
    socket.emit('ice-candidate', { roomId, candidate })
  }
}

async function startCall() {
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  socket.emit('offer', { roomId, sdp: pc.localDescription })
}
```

接收端设置远端描述、生成 answer，再把 answer 发回。收到候选时必须在远端描述已设置后再加入；如果信令可能乱序，就在服务端或客户端排队。

```js
socket.on('offer', async ({ sdp }) => {
  await pc.setRemoteDescription(sdp)
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  socket.emit('answer', { roomId, sdp: pc.localDescription })
})

socket.on('answer', async ({ sdp }) => {
  await pc.setRemoteDescription(sdp)
})

socket.on('ice-candidate', async ({ candidate }) => {
  await pc.addIceCandidate(candidate)
})
```

调用顺序可以概括为：媒体授权 → 加入房间 → offer/answer → 交换候选 → ICE 选择直连或中继路径 → 媒体传输。信令断开后已建立的媒体连接未必马上中断，但重连和重新协商会受影响。

## 先做一对一，再考虑多人

一对一通话适合浏览器直接建立一条连接。多人会议若让每个浏览器分别给所有人发流，连接数和上行带宽会随人数快速增长。多人会议、录制、转码和大规模直播通常需要 SFU 或其他媒体服务，不应只靠一个 Socket.IO 服务扩展。

文件传输可以使用 `RTCDataChannel`，但大文件仍要处理分片、背压、断线恢复和内存占用。WebRTC 提供通道，不替你设计传输协议。

## 测试清单

- 在 HTTPS、拒绝权限和无摄像头三种条件下检查界面反馈。
- 用不同网络组合测试，例如家庭宽带、移动网络和公司网络。
- 统计直连与 TURN 中继的比例，核对 TURN 带宽和凭据过期策略。
- 挂断、刷新或切换设备后，确认所有媒体轨道停止且房间成员状态正确。
- 让信令服务按房间和用户授权转发消息，不能只信任浏览器传来的 `roomId`。

**推荐阅读：** [MDN：WebRTC 连接建立](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity)
