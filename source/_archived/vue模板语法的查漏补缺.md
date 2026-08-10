---
title: "vue模板语法的查漏补缺"
date: 2021年6月22日，21点39分
categories: "vue"
description: "模板使用三元表达式，v-on绑定事件下面的修饰符，以及[key]动态参数。"
tags: "Vue"
copyright : ture
---


#### 一直以来，都没有认真的看过vue的文档。所以把一些细节性的东西给过一遍。查漏补缺。

##### 1.关于vue的模板语法，表达式。我使用的很少很少。

```
    status是0
    <view class="">
        {{status ? '是':'否'}}//否
    </view>
    <view class="">
        {{status ? '已激活':'已冻结'}}//已冻结
    </view>
    
    在模板里面使用 三元表达式，我们可以省下一个过滤器。
```

##### 1.1 关于使用，我们都知道 vue的v-bind可以绑定参数。如果他是一个动态参数呢？

```

<a :[type]="url">百度</a>

data() {
	return {
		url:'https://www.baidu.com/',
		type:'href'
	}
},

```

##### 1.2 v-on的修饰符。

v-on是用来 给vue的元素，绑定事件的。


例子如下，
```
我们绑定了一个touch的事件。
<button type="default" v-on:tap="touch()">点击</button>
```

但是，如果碰到了问题呢，比如我一个元素上面绑定了2个事件，大家都知道事件冒泡，和事件捕获。这个时候，v-on绑定事件的时候的的修饰符，就非常有必要了。

v-on的修饰符，用.来表示。


再看一个例子。

```
	<view type="default" v-on:tap="touch()">
		<text @tap="test()">你好</text>
		<text>世界</text>
	</view>
			
	touch(){
		console.log('11')
	},
	test(){
		console.log('22')
	},
	//触发test（）,打印结果，11，22
			

```

首先有2点，v-on：绑定事件的时候 可以简写为@。其次我们遇到了事件冒泡问题。



```
	<view type="default" v-on:tap="touch()">
		<text @tap.stop="test()">你好</text>
		<text>世界</text>
	</view>
			
	touch(){
		console.log('11')
	},
	test(){
		console.log('22')
	},
	//v-on.stop修饰符 替我们阻止了事件的冒泡。

```




v-on的修饰符还有很多。



v-on的修饰符 |作用
---|---
stop | 阻止事件冒泡
once | 事件只执行一次
prevent | 阻止默认事件
capture | 事件捕获
:keyup.enter | 键盘事件，enter是回车




---
#### 总结知识点
- 模板的三元表达式
- 指令的动态参数。[type]='text';
- v-on绑定事件的修饰符。
---
