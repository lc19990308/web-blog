---
title: "git团队协作"
date: 2021年9月2日-21点03分
categories: "git"
description: "如何进行git团队协作，使用git遇到的坑儿"
tags: "Git"
copyright : ture
---
#### 前言

客驾到的时候，我使用了breach，来进行分支管控。
dev分支用来开发。master用来合并。

如果我和A君一起开发的话，我俩一起在一个dev分支下进行开发。然后去master进行合并。
春鹏告诉我，我们可以一人一个分支去玩的。一起往master上面合并。我意识到我对breach 的使用略显不足，所以补充一下我的理解。


#### 过程

客驾到项目中，我想的更多的是 ，想通过分支来做一个**沙盒**。进行**隔绝**。
去进行**区分**。

但是，分支给我带来的体验并不好，因为2个人使用一个分支，我与A君，我们两个人之间，没有沙盒。

如果这个时候 B君也参与了进来，我们三个人，使用一个dev分支。超级容易打架。



#### 多分支开发。

标准团队协作模式下进行开发。

应该有这样的分支。

**master**  **hotfix** **develop** **feature** **release**



分支名 | 用途 
---|---
master | 主分支，随时都得处于发布状态。
hotfix | 修复线上的bug
develop | 开发分支
feature | 开发功能分支。
release | 预发布分支。





首先咱们先从 master分支下 创建 develop
develop 下创建 feature分支，用来开发功能。
功能开发结束，develop合并feature的功能。
然后从develop签出一条 release分支。用来准备发布。
出现bug，release修复bug，修复结束，同步给develop，与matser分支。

master分支 出现bug。

建立hotfix分支。修复bug。修复成功同步给master 与develop。


主要还是围绕着master 与 develop来展开的。



这就是标准的 git团队协作。


