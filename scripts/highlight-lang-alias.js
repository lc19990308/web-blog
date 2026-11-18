'use strict'

/**
 * 给 Hexo 内置 highlighter 补一条 `tsx` 语言别名。
 *
 * `node_modules/hexo-util/highlight_alias.json` 的别名表里没有 `tsx`，
 * 未命中的 fence 会被 `lib/highlight.js` 直接降级成 plaintext：
 * 没有任何 token 包装，代码块整块单色，构建也不报错。
 *
 * 这里在启动时往同一份别名对象上补一个键。require 拿到的是缓存实例，
 * hexo-util 渲染时读的就是这个对象，所以不需要改 node_modules 里的文件。
 *
 * 选 typescript 而不是 javascript：tsx 里既有类型标注也有 JSX，
 * 同一段真实代码下 typescript 语法产出的 token 更多，类型关键字能上色。
 */

const ALIAS_MODULE = 'hexo-util/highlight_alias.json'
const TSX_LANGUAGE = 'typescript'

try {
  const aliasTable = require(ALIAS_MODULE)
  aliasTable.aliases.tsx = TSX_LANGUAGE
} catch (error) {
  // hexo-util 若调整内部路径，这里会失败。渲染不该因此中断，
  // 但要让问题可见：tsx 代码块会退回纯文本。
  console.warn(`[highlight-lang-alias] 没能写入 ${ALIAS_MODULE}，tsx 代码块将退回纯文本：${error.message}`)
}
