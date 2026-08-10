---
title: "JavaScript 数组方法大全与实战"
date: 2025-06-07 16:47:00
updated: 2025-06-22
categories: "JavaScript"
description: "系统梳理 JS 数组全部常用方法（map/filter/reduce/find/some 等），含 reduce 高阶用法（SKU 计算、分组、去重）"
tags: "JavaScript"
copyright: true
---

## 前言

数组是 JavaScript 中最常用的数据结构之一。掌握数组方法不仅能写出更简洁的代码，还能提升对函数式编程的理解。

本文**系统梳理全部常用数组方法**，按功能分类对比，并提供 reduce 高阶实战。

---

## 一、遍历方法

### 1.1 forEach vs map

```javascript
const arr = [1, 2, 3];

// forEach：遍历，无返回值（适合有副作用的操作）
arr.forEach((item, index) => {
  console.log(item); // 适合：操作 DOM、写入外部变量
});

// map：遍历并返回新数组（无副作用）
const doubled = arr.map((item) => item * 2); // [2, 4, 6]
```

| 特性 | forEach | map |
|------|---------|-----|
| 返回值 | undefined | **新数组**（长度与原数组相同） |
| 链式调用 | ❌ | ✅ `arr.map().filter().reduce()` |
| 副作用 | 适合（操作 DOM、修改变量） | **不适合**（应保持纯函数） |
| 性能 | 相近 | 相近 |

```javascript
// ❌ 错误：map 用于副作用
arr.map((item) => {
  document.body.append(item); // 不推荐
});

// ✅ 正确：map 用于转换
const items = arr.map((item) => `<li>${item}</li>`);
```

### 1.2 filter——过滤

返回满足条件的元素组成的新数组：

```javascript
const users = [
  { name: '李华', age: 18 },
  { name: '小明', age: 20 },
  { name: '张三', age: 16 },
];

const adults = users.filter((user) => user.age >= 18);
// [{ name: '李华', age: 18 }, { name: '小明', age: 20 }]
```

### 1.3 find vs findIndex——查找

```javascript
const users = [
  { name: '李华', age: 18 },
  { name: '小明', age: 20 },
];

const found = users.find((user) => user.age > 16);      // { name: '李华', age: 18 }
const index = users.findIndex((user) => user.age > 16);  // 0

// 区别：find 返回元素，findIndex 返回下标
// 区别：只返回第一个匹配项（与 filter 不同）
```

### 1.4 some vs every——条件判断

```javascript
const ages = [18, 20, 16];

// some：有一个满足即 true
const hasMinor = ages.some((age) => age < 18); // true

// every：全部满足才 true
const allAdult = ages.every((age) => age >= 18); // false
```

**some vs includes：**

```javascript
// includes：适合简单类型
[1, 2, 3].includes(2); // true

// some：适合复杂条件
users.some((u) => u.age > 18 && u.name.startsWith('张'));
```

---

## 二、增删改方法

### 2.1 操作方法

| 方法 | 作用 | 是否改变原数组 | 返回值 |
|------|------|--------------|--------|
| `push` | 尾部添加 | ✅ | 新长度 |
| `pop` | 尾部删除 | ✅ | 删除的元素 |
| `shift` | 头部删除 | ✅ | 删除的元素 |
| `unshift` | 头部添加 | ✅ | 新长度 |
| `splice` | 指定位置增/删/改 | ✅ | 删除的元素数组 |
| `slice` | 切片（截取） | ❌ | 新数组 |
| `concat` | 合并数组 | ❌ | 新数组 |

### 2.2 splice vs slice

```javascript
const arr1 = [1, 2, 3, 4, 5];

// slice：不修改原数组
const sliced = arr1.slice(1, 3); // [2, 3]
console.log(arr1); // [1, 2, 3, 4, 5]（不变）

// splice：修改原数组
const spliced = arr1.splice(1, 2, 'a', 'b'); // 从下标1删2个，插入'a','b'
console.log(arr1); // [1, 'a', 'b', 4, 5]（已修改）
```

---

## 三、转换方法

### 3.1 flat / flatMap——数组扁平化

```javascript
const nested = [1, [2, [3, [4]]]];

// flat：指定拍平层数
nested.flat(2);     // [1, 2, 3, [4]]
nested.flat(Infinity); // [1, 2, 3, 4]

// flatMap：先 map 再 flat(1)
const arr = ['hello world', 'foo bar'];
arr.flatMap((str) => str.split(' '));
// ['hello', 'world', 'foo', 'bar']

// 等价于：
arr.map((str) => str.split(' ')).flat();
```

### 3.2 join / split

```javascript
// 数组 → 字符串
[1, 2, 3].join(','); // '1,2,3'
['a', 'b', 'c'].join(' '); // 'a b c'

// 字符串 → 数组
'1,2,3'.split(','); // ['1', '2', '3']
```

### 3.3 sort——排序

```javascript
const nums = [3, 11, 2, 21];

// ❌ 默认按字符串 Unicode 排序
nums.sort(); // [11, 2, 21, 3]

// ✅ 必须传比较函数
nums.sort((a, b) => a - b);   // 升序：[2, 3, 11, 21]
nums.sort((a, b) => b - a);   // 降序：[21, 11, 3, 2]

// 对象排序
users.sort((a, b) => a.age - b.age);
```

### 3.4 reverse

```javascript
[1, 2, 3].reverse(); // [3, 2, 1]（会修改原数组）
```

### 3.5 fill——填充

```javascript
new Array(5).fill(0);          // [0, 0, 0, 0, 0]
new Array(5).fill(0, 1, 3);    // [empty, 0, 0, empty, empty]
```

---

## 四、reduce 高阶实战

`reduce` 是数组方法中最强大、最灵活的一个，几乎能实现所有其他数组方法的功能。

### 4.1 基本用法

```javascript
const nums = [1, 2, 3, 4, 5];

// 求和（有初始值）
const sum = nums.reduce((acc, cur) => acc + cur, 0); // 15

// 求最大值
const max = nums.reduce((acc, cur) => (cur > acc ? cur : acc), -Infinity);
```

### 4.2 实现 map / filter

```javascript
// 用 reduce 实现 map
const doubled = nums.reduce((acc, cur) => {
  acc.push(cur * 2);
  return acc;
}, []);

// 用 reduce 实现 filter
const evens = nums.reduce((acc, cur) => {
  if (cur % 2 === 0) acc.push(cur);
  return acc;
}, []);
```

### 4.3 统计元素出现次数

```javascript
const names = ['Alice', 'Bob', 'Tiff', 'Bruce', 'Alice'];

const count = names.reduce((acc, name) => {
  acc[name] = (acc[name] || 0) + 1;
  return acc;
}, {});
// { Alice: 2, Bob: 1, Tiff: 1, Bruce: 1 }
```

### 4.4 数组去重

```javascript
const arr = [1, 2, 2, 3, 3, 4];

// 方式一：reduce
const unique = arr.reduce((acc, cur) => {
  if (!acc.includes(cur)) acc.push(cur);
  return acc;
}, []);

// 方式二：Set（更简洁）
const unique2 = [...new Set(arr)];
```

### 4.5 购物车商品汇总

```javascript
const cart = [
  { name: '无线耳机', price: 299, num: 3, selected: true },
  { name: '机械键盘', price: 389, num: 2, selected: false },
  { name: '游戏鼠标', price: 149, num: 6, selected: true },
];

// 计算选中商品的总价和总数量
const summary = cart.reduce(
  (acc, item) => {
    if (item.selected) {
      acc.totalPrice += item.price * item.num;
      acc.totalNum += item.num;
      acc.items.push(item.name);
    }
    return acc;
  },
  { totalPrice: 0, totalNum: 0, items: [] }
);
// { totalPrice: 1791, totalNum: 9, items: ['无线耳机', '游戏鼠标'] }
```

### 4.6 SKU 排列组合（经典实战）

SKU 问题是电商的经典场景：给定多个规格属性，求所有组合。

```javascript
// 规格列表：尺寸、品类、颜色、品牌
const specs = [
  ['S', 'M', 'L', 'XL'],           // 尺寸
  ['T恤', '裤子', '裙子'],          // 品类
  ['蓝色', '白色'],                 // 颜色
  ['Nike', '安踏', '李宁'],          // 品牌
];

// reduce 实现笛卡尔积
const skuList = specs.reduce((acc, cur) => {
  const result = [];
  acc.forEach((prev) => {
    cur.forEach((item) => {
      result.push(prev.concat(item));
    });
  });
  return result;
}, [[]]);

// 输出：['S', 'T恤', '蓝色', 'Nike'] → 共 4×3×2×3 = 72 种组合
console.log(skuList);
// [['S', 'T恤', '蓝色', 'Nike'], ['S', 'T恤', '蓝色', '安踏'], ...]
```

**理解关键：**
1. 初始值 `[[]]`：空组合作为起点
2. 每次遍历：将现有组合与当前规格的每个选项拼接
3. 最终得到所有组合

### 4.7 分组

```javascript
const people = [
  { name: '张三', dept: '前端' },
  { name: '李四', dept: '后端' },
  { name: '王五', dept: '前端' },
];

const grouped = people.reduce((acc, person) => {
  (acc[person.dept] = acc[person.dept] || []).push(person);
  return acc;
}, {});
// { '前端': [{name:'张三'}, {name:'王五'}], '后端': [{name:'李四'}] }
```

---

## 五、方法速查表

### 按功能分类

| 用途 | 方法 | 修改原数组 | 返回值 |
|------|------|-----------|--------|
| **遍历** | forEach | ❌ | undefined |
| **映射** | map | ❌ | 新数组 |
| **过滤** | filter | ❌ | 新数组 |
| **查找** | find | ❌ | 元素/undefined |
| **查找下标** | findIndex | ❌ | 数字 |
| **判断** | some | ❌ | boolean |
| **判断全部** | every | ❌ | boolean |
| **累加** | reduce | ❌ | 任意 |
| **排序** | sort | ✅ | 原数组 |
| **反转** | reverse | ✅ | 原数组 |
| **增删** | push/pop/shift/unshift/splice | ✅ | 按方法 |
| **切片** | slice | ❌ | 新数组 |
| **扁平** | flat/flatMap | ❌ | 新数组 |
| **包含** | includes | ❌ | boolean |
| **转字符串** | join | ❌ | string |

### 是否改变原数组

```javascript
// ✅ 会修改原数组
push, pop, shift, unshift, splice, sort, reverse, fill

// ❌ 不修改，返回新数组
map, filter, slice, concat, flat, flatMap

// ❌ 不修改，返回其他
forEach, reduce, find, findIndex, some, every, includes, join
```

---

## 总结

| 熟練度 | 应该能做什么 |
|--------|------------|
| ✅ Level 1 | 区分 forEach/map、filter/find、some/every |
| ✅ Level 2 | 链式调用：`arr.map().filter().reduce()` |
| ✅ Level 3 | 用 reduce 实现统计、去重、分组 |
| ✅ Level 4 | 用 reduce 实现笛卡尔积（SKU 计算） |
| ✅ Level 5 | 能区分哪些方法有副作用（修改原数组） |

**推荐阅读：**
- [MDN: Array](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array)
- [ECMAScript 规范](https://tc39.es/ecma262/)
