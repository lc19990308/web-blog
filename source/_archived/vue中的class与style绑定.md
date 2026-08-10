---
title: "vue中class与style绑定"
date: 2021年6月22日，21点39分
categories: "vue"
description: "关于vue v-bind，绑定class与style的用法"
tags: "Vue"
copyright : ture
---

##### class的绑定
1.通过v-bind：对象语法绑定class

```
    <input type="text" class="b-b-w-1" :class="{active:isactive,error:isactive}" value="" />
```
class中的 active 的绑定完全依赖于 isactive的布尔值。  
class 绑定的静态类型与v-bind绑定动态类型，class最终还是会汇聚到一起。也就是这个样子。

class='b-b-w-1 active error';

绑定class的对象不一定非要在，模板里面。

```
	<input type="text" class="b-b-w-1" :class="objclass" value="" />
	
    data() {
		return {
		    objclass:{
			active:true,
			error:true,
		    }
	    }
	 },

```
class='b-b-w-1 active error';


2.给class绑定一个数组，

```
<input type="text" class="b-b-w-1" :class="['active','isactive']" value="" />

```
甚至我们还能使用三元运算符 来绑定class。

```

<input type="text" value="" v-bind:class="[isActive ? activeClass : '', 'errorClass']" />
<input type="text" value="" :class="activeClass == isActive ? '':'errorClass'" />

```
3.给组件绑定class

class会将被添加到组件的根元素上。

简单写个例子


```
<myElement class='test test1' ></myElement>

```

如果组件添加一个class，组件上本身就已经有一个class了。那么就不会覆盖。而是，共存。

例子如下

```
<myElement class='test test' ></myElement>

```


4.v-bind绑定 内联样式，强烈不推荐内联的写法。
但是必要的时候还是离不开，因为只有pc有hover效果，移动端需要active来模拟。
    
so，
看例子把。

```
<input type="text" value="" :style="{color:'red',backgroundColor:size}" />

```
写样式最好使用 驼峰命名，第二个单词首字母大写。


内联样式绑定对象。


```
	<input type="text" value="" :style="objStyle" />
	
	objStyle:{
		backgroundColor:'red',
		color:'#ffffff'
	}

```

内联样式 同样也可以绑定，数组语法。数组里面的对象是样式的集合。但是却没有class名。

优点就是我们省下来一个class名，确定就是权重贼高。

数组语法和对象语法，阅读起来更舒服。


```
    <input type="text" value="" :style="[objStyle,objStyle1]" />

    objStyle: {
		backgroundColor: 'red',
		color: '#ffffff'
	},
	objStyle1: {
		color: '#ffffff'
	}
```