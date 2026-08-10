---
title: "使用es module模块化编程"
date: 2021年6月21日-15点36分
categories: "ES6"
description: "js模块化编程"
tags: "ES6"
copyright : ture
---


##### 前言

很长的一段时间内，我以为，es modules的关键字import，export,只能在vue里面，使用，是因为webpack，这样的打包工具，才能得已实现的。
甚至让我觉得，原生js不行的原因就是因为，不支持es moduls。

陷入了一定的误区，这篇文章，来修正我的认知错误。


##### 原生js使用es module进行模块化。

使用script 加载js文件的时候 **<u>type = 'module'</u>** 就可以开启模块化。


[![xTjKx0.md.png](https://s1.ax1x.com/2022/11/01/xTjKx0.md.png)](https://imgse.com/i/xTjKx0)


##### 注意，es module，默认开启的严格模式。我来证明给您看。

[![xTj92t.png](https://s1.ax1x.com/2022/11/01/xTj92t.png)](https://imgse.com/i/xTj92t)

[![xTjVaQ.png](https://s1.ax1x.com/2022/11/01/xTjVaQ.png)](https://imgse.com/i/xTjVaQ)


看吧，控制台上this是 undefined



##### 原生js，使用import，export



在上图的index.html文件下的index.js export抛出，
[![xTjZ5j.png](https://s1.ax1x.com/2022/11/01/xTjZ5j.png)](https://imgse.com/i/xTjZ5j)



在test import，引入。
[![xTjnGn.png](https://s1.ax1x.com/2022/11/01/xTjnGn.png)](https://imgse.com/i/xTjnGn)


控制台，打印的结果是，{a: 11}


##### es module，加载是通过cors进行的。


如果 **<script type='module' src=''> </script>**
如果，这里的 **src**加载的是服务器资源的话，如果资源不支持cors的话，会被浏览器拦截。


例子如下，
[![xTjZ5j.png](https://s1.ax1x.com/2022/11/01/xTjZ5j.png)](https://imgse.com/i/xTjZ5j)


支持，cors 加载的资源，type = 'module' 会被浏览器所加载，不支持cors的，会被浏览器拦截，这点服务端需要注意。


[![xTj1qU.png](https://s1.ax1x.com/2022/11/01/xTj1qU.png)](https://imgse.com/i/xTj1qU)

cors，不支持文件的访问，所以，必须使用，http，serve的方式进行访问。


**使用，文件访问导致的后果**

[![xTjlrT.png](https://s1.ax1x.com/2022/11/01/xTjlrT.png)](https://imgse.com/i/xTjlrT)



##### es module，自带脚本延迟效果

当页面，加载完毕后，才会加载，es module脚本。
[![xTjQMV.png](https://s1.ax1x.com/2022/11/01/xTjQMV.png)](https://imgse.com/i/xTjQMV)

当所有的，非es module加载完毕后，才能加载es module模块。



总结，
es module的特性是，
1，默认就是严格模式
2，每个module模块，都拥有私有的作用域。
3，只支持cors，加载。本地必须开启 web serve
4，自带延迟效果


##### 关于import export 一些小知识。


我们可以使用，export，到处一些变量方法，也可以，export，设置默认导出的方法。

[![xTjEVg.jpg](https://s1.ax1x.com/2022/11/01/xTjEVg.jpg)](https://imgse.com/i/xTjEVg)




接收默认到处的值


[![xTjiKf.png](https://s1.ax1x.com/2022/11/01/xTjiKf.png)](https://imgse.com/i/xTjiKf)


接收默认导出的值



[![xTjmPs.png](https://s1.ax1x.com/2022/11/01/xTjmPs.png)](https://imgse.com/i/xTjmPs)


**as 关键字，修改默认导出的值**

export **as关键字修改 变量名**

[![xTj8ZF.png](https://s1.ax1x.com/2022/11/01/xTj8ZF.png)](https://imgse.com/i/xTj8ZF)


[![xTjGa4.png](https://s1.ax1x.com/2022/11/01/xTjGa4.png)](https://imgse.com/i/xTjGa4)
import **as修改接收参数的变量名**




##### export 导出的并不是一个对象 import 引入的也不是个对象的解构。


```
let num = 1;
export {
    num
}


```
虽然export后面跟着 {} 看起来很像对象， { name },看起来很像es6，字面量的写法。

import 在这里 **{}**，就像使用对象字面量解构一样，
```
import { num } from './test.js'

```

**export {}** 和 **import {}** 是 es modulc的固定语法。

export 导出的只是，内存地址。
export 导出的，是常量。只能在 export 内部修改。

**例子如下**

导出num

[![xTjCxP.png](https://s1.ax1x.com/2022/11/01/xTjCxP.png)](https://imgse.com/i/xTjCxP)


[![xTjNGR.png](https://s1.ax1x.com/2022/11/01/xTjNGR.png)](https://imgse.com/i/xTjNGR)


控制台报错，index.js:4 Uncaught TypeError: Assignment to constant variable.
    at index.js:4:4
    
    
因为，我们import引入的，**num** 是个常量。无法在外部，对 import 引入的 num进行修改。



**那么，怎么样导入，一个字面量对象呢？**

使用 **export default**

[![xTjCxP.png](https://s1.ax1x.com/2022/11/01/xTjCxP.png)](https://imgse.com/i/xTjCxP)





##### import 全部导入和import 动态导入模块和import导出，url，以及import导出，默认成员和命名成员。



如果export 导入了很多属性。我们可以使用import * 把所有的导出全部接收。

```
let num = 1;
let name = '张三';
let age = 12;
let sigin = '为什么'
export {
    num,
    name,
    age,
    sigin
}

import * as module from './test.js'
console.log(module);
```

import * as module 导入全部的要导出的模块。


试想，我们有一个这样的需求，根据判断条件，来决定要导入，那个模块。

import 必须要在最外层，最顶层的作用域当中。不能嵌套在if，或者funtion当中。

es modulc，提供了一个，**import**函数，来帮助我们动态的导入模块。而且，import(),本身是一个promise函数。

[![xTjFr8.png](https://s1.ax1x.com/2022/11/01/xTjFr8.png)](https://imgse.com/i/xTjFr8)

这样通过，then,那么就能读取到模块了。





import 可以导入一个，url链接模块
[![xTju2q.png](https://s1.ax1x.com/2022/11/01/xTju2q.png)](https://imgse.com/i/xTju2q)



import 导出默认成员与，命名成员
[![xTjkqS.png](https://s1.ax1x.com/2022/11/01/xTjkqS.png)](https://imgse.com/i/xTjkqS)




总结，es module，

1. 在原生js当中使用，script标签，type应该使用，module。module默认就在严格模式环境下，this不可能指向全局。
2. 每个模块都拥有了独立的，私有的作用域。
3. module加载，模块，会存在cors问题，需要服务端专门设置，本地必须开启，web sever
4. type = module后，会存在延迟效果，等页面资源加载完毕后，再去加载。


总结，import的特性

1. import {} 并非对象的解构，而是语法就是这样的。
2. import，导入的属性，只可以读取。import导入的是常量，无法修改。
3. import * model from 可以把，所有导出的属性，全部导入到一个对象里面。
4. import，可以导入url模块，
5. import必须在顶部，不可以在函数，条件语句下面。
6. import()，可以动态导入，**import**默认本身就是一个promise方法。
7. import as 可以更换导入的属性别名。
8. import num，{age,age1} from '../../'可以导入，默认的成员与命名的成员。


总结，export的特性

1. export {} 这是语法，抛出的不是一个，字面量对象，export default是抛出对象。
2. export 抛出去的值是内存地址的引用，值，只能在export模块里面修改。
3. as 可以修改默认要导出的值的别名。

