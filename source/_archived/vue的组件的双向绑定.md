---
title: "vue组件的双向绑定"
date: 2021年6月21日-15点36分
categories: "vue"
description: "input组件的v-model实现，emit。v-on：input，sync修饰符的使用。"
tags: "Vue"
copyright : ture
---


#### vue组件的双向绑定。

一直以来vue自定义组件，都有个问题困惑我。prop，好像是一个单向数据流，父组件的数据可以传向子组件，可是子组件。无法修改父组件的值。

输入框的v-model也只是一个语法糖，实际上。还是把要传进来的值接受到之后再去通过$emit
自定义事件和值给抛了出去。

例子如下，我使用的是 uniapp
```
<template>
	<view>
		<input type="text" :value="value" @input='updata' />
	</view>
</template>

<script>
	export default {
		name: "inputfield",
		props: {
			value: {
				
			}
		},
		data() {
			return {

			}
		},
		methods: {
		    //输入框输入触发，input事件的时候，我们使用emit()，把值给抛出去。value得到了更新。
			updata(e){
				this.$emit('input',e.detail.value);
			}
		}
	}
</script>

<style>


```
##### .sync是vue的修饰符，可以帮助props，实现双向绑定。


例子如下
``` 
//sync绑定了value，
<inputfield :value.sync="value" />
{{value}}


我们看看组件内部是如何实现的
<template>
	<view>
		<view class="">
			{{value}}
			<button type="default" @tap='run'>run</button>
		</view>
	</view>
</template>

<script>
	export default {
		name: "inputfield",
		props: {
			value: {
				type: Boolean,
				default: false,
			}
		},
		data() {
			return {

			}
		},
		methods: {
			run() {
				//使用 emit触发一个update事件，然后:value，是我们子组件要改变的属性。
				if (this.value) {
					this.$emit('update:value', false);
				} else {
					this.$emit('update:value', true);
				}
			},
		}
	}
</script>

<style>

</style>

```


