---
title: "ES6 模板字符串与字符串增强：模板字面量、标签模板、新增字符串方法"
date: 2026-06-25
categories: "ES6"
description: "全面解析 ES6+ 的字符串增强：模板字面量（插值、多行）、标签模板、新增字符串方法（includes/startsWith/padStart/trimStart），以及 Unicode 增强"
tags: ["ES6", "JavaScript"]
copyright: true
---

## 前言

ES6 对字符串做了两大增强：

1. **模板字面量（Template Literals）** — 字符串插值、多行字符串、标签模板
2. **新增字符串方法** — includes、startsWith、repeat、padStart 等

---

## 一、模板字面量

### 1.1 字符串插值

```javascript
const name = 'LC'
const age = 25

// ES5
const str1 = '我叫 ' + name + '，今年 ' + age + ' 岁。'

// ES6
const str2 = `我叫 ${name}，今年 ${age} 岁。`

// 模板中可以放任何表达式
const str3 = `2 + 3 = ${2 + 3}`     // '2 + 3 = 5'
const str4 = `大写: ${name.toUpperCase()}` // '大写: LC'
const str5 = `${age > 18 ? '成年' : '未成年'}` // '成年'

// 可以嵌套
const isLoggedIn = true
const html = `<div>${isLoggedIn ? `<span>欢迎，${name}</span>` : '<a href="/login">登录</a>'}</div>`
```

### 1.2 多行字符串

```javascript
// ES5 —— 需要用 \n 和 + 拼接
const htmlES5 = '<div>' +
  '<h1>标题</h1>' +
  '<p>内容</p>' +
'</div>'

// ES6 —— 直接换行
const htmlES6 = `
<div>
  <h1>标题</h1>
  <p>内容</p>
</div>`
```

**注意缩进**：模板字面量会保留所有空格和换行

```javascript
// 多余的缩进
const code = `
  function hello() {
    console.log('hello')
  }
`
// 输出会包含前面的缩进空格

// 配合 trim() 去除首尾空行
const code = `
  function hello() {
    console.log('hello')
  }
`.trim()
```

### 1.3 标签模板（Tagged Templates）

标签模板让你能**自定义模板字符串的处理函数**：

```javascript
// 定义一个"标签"函数
function highlight(strings, ...values) {
  // strings: 模板中的文字部分（数组）
  // values: 模板中的插值部分
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] ? `<strong>${values[i]}</strong>` : '')
  }, '')
}

const name = 'LC'
const action = '登录'

const result = highlight`用户 ${name} 在 ${new Date().toLocaleString()} 执行了 ${action} 操作`
// 输出：用户 <strong>LC</strong> 在 <strong>2026/6/25 15:58</strong> 执行了 <strong>登录</strong> 操作
```

**实用场景：安全转义**

```javascript
function escape(strings, ...values) {
  const escaped = values.map(v =>
    String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  )

  return strings.reduce((result, str, i) => {
    return result + str + (escaped[i] || '')
  }, '')
}

const userInput = '<script>alert("xss")</script>'
const safe = escape`用户输入: ${userInput}`
// 输出：用户输入: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

### 1.4 String.raw — 原始字符串

```javascript
// 普通字符串中 \n 被解释为换行
console.log('第一行\n第二行')
// 第一行
// 第二行

// String.raw 保留原始字符
console.log(String.raw`第一行\n第二行`)
// 第一行\n第二行（\n 是两个字面字符）

// 常见场景：文件路径
const path = String.raw`C:\Users\LC\Documents`
// 不会把 \U、\L、\D 解释为转义字符
```

---

## 二、新增字符串方法

### 2.1 includes — 是否包含子串

```javascript
const str = 'hello world'

str.includes('world')   // true
str.includes('hello')   // true
str.includes('xyz')     // false

// 第二个参数：起始搜索位置
str.includes('world', 6)  // true（从索引 6 开始）
str.includes('world', 7)  // false

// 替代 indexOf 的写法
if (str.indexOf('world') !== -1) {}  // ES5
if (str.includes('world')) {}        // ES6（更直观）
```

### 2.2 startsWith / endsWith

```javascript
const url = 'https://example.com/api/users'

url.startsWith('https')     // true
url.startsWith('http')      // true
url.startsWith('https://')  // true

url.endsWith('/users')      // true
url.endsWith('users')       // true
url.endsWith('api')         // false

// 第二个参数
url.startsWith('example', 8)  // true（从索引 8 开始）
url.endsWith('api', 22)       // true（取前 22 个字符）
```

### 2.3 repeat

```javascript
'x'.repeat(3)     // 'xxx'
'hello '.repeat(2) // 'hello hello'
'abc'.repeat(0)   // ''

// 实用场景
const indent = '  '.repeat(level)  // 缩进
const separator = '-'.repeat(80)   // 分隔线
const loading = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'[i % 10].repeat(1)
```

### 2.4 padStart / padEnd

```javascript
// 补齐到指定长度
'5'.padStart(3, '0')     // '005'（常用：数字编号）
'123'.padStart(5, '*')   // '**123'
'abc'.padStart(5)        // '  abc'（不传填充字符用空格）

'5'.padEnd(3, '0')       // '500'
'hello'.padEnd(10, '-')  // 'hello-----'

// 实用场景
const hour = 6
const min = 5
const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
// '06:05'
```

### 2.5 trimStart / trimEnd

```javascript
const str = '   hello world   '

str.trimStart()  // 'hello world   '
str.trimLeft()   // trimStart 的别名
str.trimEnd()    // '   hello world'
str.trimRight()  // trimEnd 的别名
str.trim()       // 'hello world'
```

---

## 三、Unicode 增强

### 3.1 码点转义

```javascript
// ES5 只能表示 BMP 字符（\u + 4 个十六进制）
'\u0061'  // 'a'

// ES6 可以表示辅助平面字符
'\u{1F600}'  // '😀'
'\u{1F44D}'  // '👍'

console.log('\u{1F600}' === '😀') // true
```

### 3.2 codePointAt / fromCodePoint

```javascript
// ES5 的 charCodeAt 只能处理 BMP
'😀'.charCodeAt(0)    // 55357（高代理项）
'😀'.charCodeAt(1)    // 56832（低代理项）

// ES6 的 codePointAt 可以处理全部 Unicode
'😀'.codePointAt(0)   // 128512（完整的码点）

// 反向转换
String.fromCodePoint(128512)  // '😀'
String.fromCodePoint(0x1F600) // '😀'
```

### 3.3 正确遍历字符串

```javascript
// ❌ for 循环遍历会拆分辅助平面字符
const text = 'hello😀'
for (let i = 0; i < text.length; i++) {
  console.log(text[i]) // h e l l o ? ?（Emoji 被拆成两个乱码）
}

// ✅ for...of 正确遍历
for (const char of text) {
  console.log(char) // h e l l o 😀
}

// ✅ 扩展运算符
const chars = [...'hello😀'] // ['h', 'e', 'l', 'l', 'o', '😀']
```

---

## 四、正则表达式增强

```javascript
// 1. 正则中的 u 标志（Unicode 模式）
/^.$/.test('😀')      // false（. 不匹配辅助平面字符）
/^.$/u.test('😀')    // true（u 标志开启完整 Unicode 匹配）

// 2. y 标志（粘性匹配）
const str = 'hello world'
const regex = /\w+/y

regex.lastIndex = 0
regex.exec(str) // ['hello']

regex.lastIndex = 6
regex.exec(str) // ['world']

// 3. s 标志（dotAll）
/hello.world/.test('hello\nworld')   // false（. 不匹配换行）
/hello.world/s.test('hello\nworld')  // true（s 标志让 . 匹配换行）

// 4. 具名捕获组
const date = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/
const match = date.exec('2026-06-25')
console.log(match.groups.year)  // '2026'
console.log(match.groups.month) // '06'
```

---

## 五、实用模式

```javascript
// 带格式的 SQL 查询
const table = 'users'
const id = 123
const query = `
  SELECT * FROM ${table}
  WHERE id = ${id}
  LIMIT 1
`.trim()

// 国际化模板
function i18n(strings, ...values) {
  const lang = document.documentElement.lang || 'zh'
  const translations = {
    zh: { welcome: '欢迎', login: '登录' },
    en: { welcome: 'Welcome', login: 'Login' },
  }
  return strings.reduce((r, s, i) => {
    return r + s + (values[i] ? translations[lang][values[i]] || values[i] : '')
  }, '')
}

const msg = i18n`<h1>${'welcome'}</h1><button>${'login'}</button>`
```

---

## 总结

| 特性 | ES5 | ES6+ |
|------|-----|------|
| **字符串插值** | `+` 拼接 | `${}` 模板字面量 |
| **多行字符串** | `\n` + 拼接 | 反引号直接换行 |
| **自定义处理** | 无 | 标签模板 |
| **子串判断** | `indexOf !== -1` | `includes()`、`startsWith()` |
| **补齐** | 手写 pad | `padStart()`、`padEnd()` |
| **重复** | `for` 循环 | `repeat()` |
| **Unicode** | 仅 BMP | 完整 Unicode（`\u{}`、`codePointAt`） |
| **正则** | 基础 | `u`、`y`、`s` 标志、具名捕获组 |
