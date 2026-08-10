---
title: "如何优雅的去console"
date: 2022-06-08 18点52分
categories: "JavaScript"
description: "求求，不要再去console.log一把梭了。"
tags: "JavaScript"
copyright : ture
---

#### 不要再去console一把梭了。

##### 使用console.time,console.timeEnd

可以获取到代码的执行时间

```
console.time(1);
console.timeEnd(1);

```


##### Console.assert()如果结果是true 就不会打印出来。

```
let len = 10;
console.assert(len !== 10, '失败');
```

##### console.trace对栈的追踪

```
function test() {
    console.trace(test)
}
test();

```

##### console.table 打印出来一个表格，比较适合对 引用类型的数据

```
let tableData = [{
    date: '2016-05-02',
    name: '王小虎',
    address: '上海市普陀区金沙江路 1518 弄'
}, {
    date: '2016-05-04',
    name: '王小虎',
    address: '上海市普陀区金沙江路 1517 弄'
}, {
    date: '2016-05-01',
    name: '王小虎',
    address: '上海市普陀区金沙江路 1519 弄'
}, {
    date: '2016-05-03',
    name: '王小虎',
    address: '上海市普陀区金沙江路 1516 弄'
}]
console.table(tableData)

```
数据的展示会更加直观。。



##### 对log进行分级

```
console.log(1);
console.info(1);
console.debug(1);
console.warn(1);
console.error(1);

```

像百度一样骚
```
console.log("每一个星球都有一个驱动核心，\n每一种思想都有影响力的种子。\n感受世界的温度，\n年轻的你也能成为改变世界的动力，\n百度珍惜你所有的潜力。\n你的潜力，是改变世界的动力！\n\n"), console.log("%c百度2022校园招聘简历投递：https://talent.baidu.com/external/baidu/campus.html", "color:red")

```