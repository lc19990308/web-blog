---
title: "includes"
date: 2022-01-10 19点12分
categories: "JavaScript"
description: "关于ES6，includes"
tags: "ES6"
copyright : ture
---


#### 关于ES6-include的使用方法。


场景，和后端同学调试接口的时候，后端同学很喜欢返回我，status，或者type来给我判断。但是，，，如果状态多的话，那么判断可能是这样的。


```
let status = 0;

if (status == 1 || status == 2 || status == 3) {
    alert('yes');
} else {
    alert('no')
}

```

说实话这样写一点都不优雅。但是还能接受。毕竟 1 2 3，还好判断。




场景，后端同学又过来，接口要改，status可能要多判断2个值，4，5。4是进行中，5是已售后，或者叫啥都行。


[![7VEMdI.jpg](https://s4.ax1x.com/2022/01/10/7VEMdI.jpg)](https://imgtu.com/i/7VEMdI)


接下来，我们的代码就是这样。。


```

let status = 5;

if (status == 1 || status == 2 || status == 3 || status == 4 || status == 5) {
    alert('yes');
} else {
    alert('no')
}

```



即便后端哥们不再过来改接口，添加状态。你也觉得这段代码不妥了把。


includes方法就可以完美解决这个问题。。




```
let status = 5;


let arr = [1, 2, 3, 4, 5];
if (arr.includes(status)) {
    alert('yes');
} else {
    alert('no')
}

```

**includes**会找数组的成员，找到了就是true，找不到就是false。





可可可，有indexof，呀。为什么要使用includes。


的确。indexof能实现这个问题。。



可是，如果数组里面存在NaN呢。indexof是否还能找得到？


例子如下。


```

let status = NaN;
let arr = [1, 2, 3, 4, 5, NaN, null];
if (arr.indexOf(status) != -1) {
    alert('yes');
} else {
    alert('no')

}

```
alert 出来到是 no。


而，includes就不会存在这样到问题。


```

let status = NaN;
let arr = [1, 2, 3, 4, 5, NaN, null];
if (arr.includes(status)) {
    alert('yes');
} else {
    alert('no')

}

```

indexof 无法在数组内定位到，NaN的位置。


结论如下，NaN无敌可能会存在数组的情况下，使用includes。



