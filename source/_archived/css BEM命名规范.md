---
title: "css BEM命名规范"
date: 2023年2月1日-4点36分
categories: "css"
description: "BEM命名规范,常用的css class命名"
tags: "CSS"
copyright : ture
---


#### 为什么要使用BEM命名规范

当我们写css，参与到大项目的时候，需要一种统一的方式来书写css。BEM（block element modifier）是一种命名规范，使用这种方式让css代码更容易进行维护。

标准的BEM写法是，.block-name__element-name--modifier-name。



#### __和--，-，都代表什么意思。。

**--** 符号，需要连接的是，modifier。

**__** 符号，需要连接的是，element。
**-** 符号，需要连接的是，block-name，elenemt-name，modifier-name。



#### 使用BEM命名class的例子。


```
    <div class="new-list">
      <div class="new-list__item new-list__item--active">这是一段新闻呀</div>
      <div class="new-list__item">这是一段新闻呀</div>
      <div class="new-list__item">这是一段新闻呀</div>
      <div class="new-list__item">这是一段新闻呀</div>
      <div class="new-list__item">这是一段新闻呀</div>
    </div>


```

new-list是block
new-list__item,是element，
new-list__item--active,是modifier



#### 常用的Class命名

##### 页面结构

容器: container
页头：header
内容：content/container
页面主体：main
页尾：footer
导航：nav
侧栏：sidebar
栏目：column
页面外围控制整体布局宽度：wrapper
左右中：left right center


##### 导航栏相关
导航：nav
主导航：mainnav
子导航：subnav
顶导航：topnav
边导航：sidebar
左导航：leftsidebar
右导航：rightsidebar
菜单：menu
子菜单：submenu
标题: heading
子标题：subHeading
摘要: summary


##### 功能


标志：logo
广告：banner
登陆：login
登录条：loginbar
注册：regsiter
搜索：search
功能区：shop
标题：title
加入：joinus
状态：status
按钮：btn
滚动：scroll
标签页：tab
文章列表：list
提示信息：message
当前的: current
小技巧：tips
图标: icon
注释：note
指南：guild
服务：service
热点：hot
新闻：news
下载：download
投票：vote
合作伙伴：partner
友情链接：friendlink
版权：copyright


##### 样式文件命名


主要的 main.css
模块 module.css
基本共用 base.css
布局 layout.css
主题 themes.css
专栏 columns.css
文字 font.css
表单 forms.css
补丁 mend.css
打印 print.css


#### 参考的文章

[简单总结前端CSS常用语义类名](https://blog.csdn.net/m0_37585915/article/details/79570571)
[BEM命名规范入门及常用CSS class 命名](https://juejin.cn/post/6844903601127555085)

