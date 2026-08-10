---
title: "vue配置内网环境"
date: 2021年6月22日，21点39分
categories: "vue"
description: "内网开发下，搭建vue开发环境，从node.js的安装，npm包的缓存。"
tags: "Vue"
copyright: ture
---

#### 前景提要

我需要在内网配置 node npm yarn 顺便把 vue cli 安装上去。

遇到的问题，csdn 能够参考的文章不多。而且，极为拉胯，所以我就先写一篇。如何配置环境。

##### 前期准备

1. 确保环境一致，比如内网的设备是 windows，那么我们准备一台有网的 windows。
2. 准备一个 u 盘。

确保内网的设备，没有任何开发环境，如果他已经被安装了 node，那么我们就把他给卸载掉。

##### 外网设备需要做的事情

- node -v，查看外网设备的 node 版本，下载对应的 node 版本。（这个是要放到内网使用的 node）
- 下载内网所需要的环境

```
npm install -g @vue/cli
npm install -g webpack
npm install -g webpack-cli
npm install -g yarn

```

查看外网设备的 npm 缓存包放到了那里。

```
npm config get cache
```

通用路径
`C:\Users\lc19990308_157557654\AppData\Roaming\npm-cache`

把 node 版本，和，npm-cache，放入 u 盘。

#### 内网设备要做的事情

插入 u 盘，安装 node。
查看 node 是否安装成功。

```
node -v
npm -v
```

把 npm-cache，放到 C:\Users\lc19990308_157557654\AppData\Roaming 目录下。

查看当前 npm 全局安装目录；

```
使用npm root -g

```

把 npm-cache 放到，npm root -g 获取到的路径下的 npm 文件下面。

最后命令行

```
npm install --cache ./npm-cache --optional --cache-min 99999999999 --shrinkwrap false @vue/cli
npm install --cache ./npm-cache --optional --cache-min 99999999999 --shrinkwrap false webpack
npm install --cache ./npm-cache --optional --cache-min 99999999999 --shrinkwrap false webpack-cli
npm install --cache ./npm-cache --optional --cache-min 99999999999 --shrinkwrap false yarn

```

最后，客户 vue 项目在内网 git 上，项目就不用新建，但是 fetch 下来之后无法启动，因为 git 上没有 node_modules，得，在外网机上新建一个 vue 项目，进行 install 操作之后，把生成的 node_modules 复制到内网，这才把内网 vue 项目启动起来。
