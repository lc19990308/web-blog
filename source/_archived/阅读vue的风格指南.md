---
title: "阅读vue的风格指南"
date: 2023年2月3日-2点50分
categories: "vue"
description: "阅读vue的风格指南，遵守开发规范"
tags: "Vue"
copyright: ture
---

#### 规则 A

**vue 当中的组件名当为多个单词。**
例子

good

```
order-list.vue
order-list-item.vue
OrderList.vue
OrderListItem.vue
```

bad

```
order.vue
ORDER.vue
```

**data 必须是一个函数**

bad

```
data:{
    name:11,
}
```

good

```
data(){
    return{
        name:11
    }
}

```

**prop 定义尽量详细**

bad

```
prop:['name','value'],

```

good

```
prop:{
    name:{
        type:string,
        default：'2',
    }
}

```

更好的做法

```
prop:{
    name:{
        type:string,
        default:'2',
        required: true,
        validator: function (value) {
        return [
            'syncing',
            'synced',
            'version-conflict',
            'error'
        ].indexOf(value) !== -1
    }
    }
}

```

**避免 v-for 与 v-if 用在一起**

v-for 的优先级要高于 v-for。
最好使用计算属性，返回过滤后的列表

**为组件样式设置私有的作用域**
good

```
<style scoped>
.box{

}
</style>
```

bad

```
<style>
.box{

}
</style>
```

#### 规则 B

**只要有拼接组件的构建系统，就把每个组件单独分成文件。**

bad

```
vue.component('TodoList');
vue.component('TodoListItem');

```

good

```
components/
|- TodoList.js
|- TodoItem.js
|- TodoList.vue
|- TodoListItem.vue

```

**单文件组件文件名大小写**
要么，单文件组件的文件名，始终首字母大写，要么全部小写，下划线分割。

bad

```
components/
|- todolistitem.vue
|- todolistItem.vue

```

good

```
components/
|- todo-list-item.vue
|- TodoListItem.vue
```

**基础组件名**

应用特定样式和约定的基础组件 (也就是展示类的、无逻辑的或无状态的组件) 应该全部以一个特定的前缀开头，比如 Base、App 或 V

bad

```
components/
|- list.vue
```

good

```
components/
|- v-list.vue
|- VList.vue
|- BaseList.vue
|- base-list.vue
```

**紧耦合的组件名**
和父组件紧密耦合的组件，需要以父组件的前缀来命名。。

bad

```
components/
|- TodoList.vue
|- ItemTodoList.vue

```

good

```
components/
|- TodoList.vue
|- TodoListItem.vue
|- todo-list.vue
|- todo-list-item.vue

```

**组件名中的单词顺序**

组件名应该以高级别的 (通常是一般化描述的) 单词开头，以描述性的修饰词结尾。

bod

```
components/
|- ClearSearchInput.vue
|- WarpSearchBOX.vue
|- RunSearchButton.vue

```

good

```
components/
|- SearchInput.vue
|- SearchInputButton.vue
|- SearchButtonClaer.vue
```

**自闭合组件**

在单文件组件、字符串模板和 JSX 中没有内容的组件应该是自闭合的——但在 DOM 模板里永远不要这样做。

bod

```
//dom模版

<my-components />

//单页面，字符串模版，jsx中

<my-components></my-components>
```

good

```
//dom模版
<my-components><my-components/>

//单页面，字符串模版，jsx中
<my-components/>

```

**模板中的组件名大小写**

对于绝大多数项目来说，在单文件组件和字符串模板中组件名应该总是 PascalCase 的——但是在 DOM 模板中总是 kebab-case 的。

bad

```
//在dom模版里

<mycomponetns></mycomponetns>

在单文件，jsx，字符串模版里面

<myComponent/>


```

good

```
<my-component />
<MyComponent />
```

**完整单词的组件名**
组件名应该倾向于完整单词而不是缩写。
bad

```
components/
|- UCheckbox.vue
|- UCheckboxItem.vue
```

good

```
components/
|- UserCheckbox.vue
|- UserCheckboxItem.vue
```

**Prop 名大小写**
组件 prop 命名，小驼峰，在模版，jsx 里面，kebab-case 命名。
bod

```
prop:{
    'greeting-text':String
}
<WelcomeMessage greetingText="hi"/>

```

good

```
prop:{
    greetingText:
}
<WelcomeMessage greetingText="hi"/>


```

**多个 attribute 的元素**

多个 attribute 的元素应该分多行撰写，每个 attribute 一行。

bad

```
<img src='../../xxx/xxx' alit='xxxx'>
<MyComponent foo="a" bar="b" baz="c" />
```

good

```
<img src='../../xxx/xxx'
    alit='xxxx'
>
<MyComponent
  foo="a"
  bar="b"
  baz="c"
/>
```

**模板中简单的表达式**

bad

```
{{
  fullName.split(' ').map(function (word) {
    return word[0].toUpperCase() + word.slice(1)
  }).join(' ')
}}

```

good

```
{{ normalizedFullName }}

```

复杂的表达式移到计算属性上面

```
computed: {
  normalizedFullName: function () {
    return this.fullName.split(' ').map(function (word) {
      return word[0].toUpperCase() + word.slice(1)
    }).join(' ')
  }
}

```

**简单的计算属性**

bad

```
computed: {
  price: function () {
    var basePrice = this.manufactureCost / (1 - this.profitMargin)
    return (
      basePrice -
      basePrice * (this.discountPercent || 0)
    )
  }
}

```

good

```
computed: {
  basePrice: function () {
    return this.manufactureCost / (1 - this.profitMargin)
  },
  discount: function () {
    return this.basePrice * (this.discountPercent || 0)
  },
  finalPrice: function () {
    return this.basePrice - this.discount
  }
}

```

**带引号的 attribute 值**

bad

```
<input type=text>
<input :style={width:inputWidth+'px'}>

```

good

```
<input type='text'>
<input :style='{width:inputWidth+'px'}'>

```

**指令缩写**

**:** 来表示:v-bind
**@** 来表示:v-on
**#** 来表示:v-slot

good

```
<button @click='sumbit'
       :width='100px'>
提交</button>
```

总结下来大概是。

prop 必须写全。
prop 的属性，必须要 buttonText。组件使用的时候 :button-text

组件必须是多个单词。
组件文件命名，要么遵守大驼峰，要么遵守短横线。
组件名在 dom 里面，要写闭合标签，在 jsx，模版里面，自闭合就行了。

组件在模版里面，要么短横线使用，要么大驼峰。
紧密耦合性组件，前缀必须带父组件。
模版里面不要放复杂表达式。
scoped 样式，不要对标签使用。要用 class，速度快。
组件 attribute，必须分行。
