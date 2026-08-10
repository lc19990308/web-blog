---
title: "reduce解决商品sku算法问题"
date: 2022-01-10 19点15分
categories: "JavaScript"
description: "商品规格sku算法问题"
tags: "ES6"
copyright : ture
---



#### sku问题。


找到了一个数组方法 特别适合计算sku。

就是js中的reduce方法。

关于reduce方法的四个参数。
Accumulator (acc) (累计器)
Current Value (cur) (当前值)
Current Index (idx) (当前索引)
Source Array (src) (源数组)
initialValue（初始值）

属性  | 描述
---|---
accmulator | 累加器（如果设置有初始值的话，第一次是初始值的参数，没有初始值，返回上次回调函数的结果）
Current Value  | 当前的值
Current Index  | 当前下标
Source Array | 源数组
initialValue | 默认值



```

var arr = [['s', 'm', 'x', 'l', 'xl'], [' T恤', '裤子', '裙子'], ['蓝色', '白色'], ['nike', '安踏', '李宁']];
console.log(...arr.reduce((pre, cur) => {
    let res = [];
    pre.forEach(item => {
        cur.forEach(items => {
            res.push(item.concat(items));
        })
    })

    return res
}, [[]]));

```
这段代码需要理解的地方在于，第一遍的时候因为设置了默认值，[[]],所以第一次遍历到的是一个空数组。第二次再去遍历的时候 **此时**，当前值已经T恤xxx什么的了，所以第二次，我们遍历pre数组，合并cur数组就可以了。



reduce方法。。

这样sku问题就解决了








##### reduce其他妙用。


###### 数组求和
```
let arr = [12, 3, 31, 21, 21, , 31, 31];

console.log(arr.reduce((per, cur) => {
    return per + cur
}));//150

```

##### reduce 计算数组中每个元素出现的次数


```

var names = ['Alice', 'Bob', 'Tiff', 'Bruce', 'Alice'];

function test() {
    return names.reduce((allNames, name) => {
        if (name in allNames) {
            allNames[name]++;
        }
        else {
            allNames[name] = 1;
        }
        return allNames;
    }, {})
}
console.log(test(names));

```