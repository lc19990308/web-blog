---
title: "Git 工作流实战：从团队规范到自动化流水线"
date: 2026-06-25
categories: "git"
description: "系统讲解 Git 团队协作的最佳实践，涵盖分支策略、Commit 规范、Git Hooks 自动化、Code Review 流程和 Changesets 版本发布"
tags: ["git", "工程化"]
copyright: true
---

## 前言

Git 不只是 `add`、`commit`、`push` 三板斧。在团队协作中，一套规范的 Git 工作流能解决很多痛点：

- 分支管理混乱，不知道哪个分支是稳定的
- Commit 信息随意，无法生成有用的 Changelog
- 代码合并冲突不断，Review 流程缺失
- 版本发布靠手动，容易出纰漏

本文从**分支策略 → Commit 规范 → 自动化 → 发布管理**四个层次，搭建完整的 Git 工作流。

---

## 一、分支策略

### 1.1 Git Flow 与 GitHub Flow 对比

| 特性 | Git Flow | GitHub Flow（推荐） |
|------|---------|-------------------|
| **适用团队** | 大型团队、版本周期长 | 中小团队、持续交付 |
| **常驻分支** | master + develop + release + hotfix | main + feature |
| **复杂度** | 高（5+ 种分支） | 低（2-3 种分支） |
| **发布频率** | 周期性发布 | 持续部署 |

**推荐：简化的 GitHub Flow**

```
main（稳定版，受保护，不可直接推送）
  └── feature/xxx（从 main 拉出，开发完成后 PR → main）
```

### 1.2 分支命名规范

```bash
feature/xxx    # 新功能：  feature/user-login
fix/xxx        # 修复 bug： fix/header-styling
chore/xxx      # 杂项：    chore/update-deps
refactor/xxx   # 重构：    refactor/api-layer
docs/xxx       # 文档：    docs/api-readme
```

### 1.3 分支保护规则

在 GitHub/GitLab 中设置：

```
- 禁止直接推送到 main
- PR 必须至少 1 人 Review 通过
- 通过 CI 检查后才能合并
- 合并方式选择 Squash merge（保持历史整洁）
```

---

## 二、Commit 规范

### 2.1 Conventional Commits

推荐的提交信息格式：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**type 类型**：

| type | 说明 | 是否出现在 Changelog |
|------|------|-------------------|
| `feat` | 新功能 | ✅ |
| `fix` | Bug 修复 | ✅ |
| `perf` | 性能优化 | ✅ |
| `refactor` | 代码重构 | ❌ |
| `style` | 样式/格式修改 | ❌ |
| `docs` | 文档更新 | ❌ |
| `test` | 测试相关 | ❌ |
| `chore` | 构建/依赖 | ❌ |
| `types` | 类型定义修改 | ❌ |

### 2.2 良好的示例

```bash
# ✅ 好的 commit
feat(user): 添加用户登录功能
fix(header): 修复导航栏在移动端不显示的问题
perf(list): 优化虚拟滚动渲染性能，减少 50% 重排
docs(readme): 更新安装步骤

# ❌ 差的 commit
fix bug
update
wip
asdf
```

### 2.3 Commitizen 交互式提交

```bash
# 安装
npm install -g commitizen cz-conventional-changelog

# 配置 package.json
{
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  }
}

# 使用交互式提交
git cz
# 会提示选择 type、写 description、body、footer
```

---

## 三、Commit 规范自动化

### 3.1 Husky + commitlint

```bash
npm install -D husky @commitlint/cli @commitlint/config-conventional
```

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'chore', 'types',
    ]],
    'subject-case': [0], // 不限制大小写
    'subject-max-length': [2, 'always', 72],
  },
}
```

```bash
# 配置 Husky 钩子
npx husky init
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit $1'
```

### 3.2 lint-staged — 提交前自动检查和格式化

```bash
npm install -D lint-staged
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,ts,vue}": ["eslint --fix", "prettier --write"],
    "*.{css,scss}": ["stylelint --fix", "prettier --write"],
    "*.md": ["prettier --write"]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

**工作流程**：`git commit` 前自动检查并修复代码，检查不通过则提交失败。

---

## 四、Commit 信息与 Changelog

### 4.1 从 Commit 生成 Changelog

```bash
npm install -D conventional-changelog-cli
```

```json
// package.json
{
  "scripts": {
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s -r 0"
  }
}
```

运行 `npm run changelog` 自动生成或更新 `CHANGELOG.md`：

```markdown
# Changelog

## [1.2.0] - 2026-06-25

### Features
- 添加用户登录功能 (abc1234)
- 新增文章搜索功能 (def5678)

### Bug Fixes
- 修复导航栏在移动端不显示 (ghi9012)

### Performance Improvements
- 优化虚拟滚动渲染性能 (jkl3456)
```

---

## 五、Code Review 流程

### 5.1 PR 模板

在仓库创建 `.github/PULL_REQUEST_TEMPLATE.md`：

```markdown
## 描述

请简要描述本次 PR 所做的改动。

## 关联 Issue

Fixes #123

## 改动类型

- [ ] 新功能 (feat)
- [ ] Bug 修复 (fix)
- [ ] 性能优化 (perf)
- [ ] 重构 (refactor)
- [ ] 文档更新 (docs)

## 检查清单

- [ ] 代码通过 ESLint 检查
- [ ] 新增/修改的组件有单元测试
- [ ] 本地运行通过
- [ ] 更新了相关文档

## 截图（如有）

## 备注
```

### 5.2 Review 检查要点

```
功能逻辑
   ├── 边界情况是否处理（空值、超长、特殊字符）
   ├── 错误处理是否完善
   └── 状态变更是否符合预期

代码质量
   ├── 是否有重复代码
   ├── 命名是否清晰
   ├── 函数/组件是否过长（建议 < 100 行）
   └── 类型定义是否完整

性能
   ├── 是否有不必要的渲染/计算
   ├── 循环内是否有耗时操作
   └── 大型 list 是否使用虚拟滚动

安全
   ├── 用户输入是否有校验/过滤
   ├── 敏感信息是否写死在代码中
   └── API 权限检查是否到位
```

---

## 六、版本发布管理

### 6.1 语义化版本

```
主版本号.次版本号.修订号
  ↑       ↑       ↑
 不兼容API 新功能   Bug 修复

示例：1.2.3 → 主版本 1，次版本 2，修订号 3
```

### 6.2 Changesets 自动化版本

```bash
npm install -D @changesets/cli
npx changeset init
```

**工作流**：

```bash
# 1. 开发完成，选择变更类型
npx changeset
# 交互式选择 major / minor / patch

# 2. 更新版本号
npx changeset version
# 自动根据 commit 和 changeset 更新版本

# 3. 生成 Changelog
npx changeset changelog

# 4. 发布
npx changeset publish
```

### 6.3 自动发布 CI

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: pnpm install

      - name: Create Release Pull Request
        uses: changesets/action@v1
        with:
          publish: pnpm publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 七、常用 Git 技巧

### 7.1 修改历史

```bash
# 修改上一次 commit 信息
git commit --amend -m "新信息"

# 修改最近 3 个 commit（交互式）
git rebase -i HEAD~3

# 合并多个 commit
# 在 rebase 交互界面中将 pick 改为 squash
```

### 7.2 暂存工作

```bash
# 临时保存当前修改
git stash save "wip: 登录功能开发中"

# 查看 stash 列表
git stash list

# 恢复最近一次 stash
git stash pop

# 恢复指定 stash
git stash apply stash@{2}
```

### 7.3 撤销操作

```bash
# 撤销工作区的修改
git checkout -- file.txt

# 撤销暂存区的修改
git restore --staged file.txt

# 回退到某个 commit（保留修改）
git reset --soft HEAD~1

# 强制回退（丢弃修改，慎用）
git reset --hard HEAD~1

# 撤销某个历史 commit 的影响
git revert <commit-hash>
```

### 7.4 查找 bug 的二分查找

```bash
# 从当前到 2 周前之间二分查找
git bisect start
git bisect bad HEAD
git bisect good HEAD~14

# Git 会 checkout 中间的 commit
# 如果这个 commit 有 bug → git bisect bad
# 如果这个 commit 正常 → git bisect good
# 重复几次后就能精确定位到引入 bug 的 commit

# 结束二分查找
git bisect reset
```

---

## 八、Git 配置最佳实践

```bash
# 全局配置
git config --global user.name "LC"
git config --global user.email "lc@example.com"

# 推荐配置
git config --global init.defaultBranch main
git config --global pull.rebase true        # pull 使用 rebase 而非 merge
git config --global fetch.prune true        # 自动删除远程不存在的分支
git config --global rebase.autostash true   # rebase 前自动暂存

# 别名
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.lg "log --graph --oneline --all --decorate"
```

### .gitignore 通用模板

```gitignore
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.temp/
.cache/
```

---

## 总结

| 环节 | 工具/规范 | 作用 |
|------|----------|------|
| **分支策略** | GitHub Flow | 简化分支管理，main + feature 为主 |
| **Commit** | Conventional Commits | 统一格式，支持自动化 |
| **提交检查** | Husky + lint-staged | 提交前自动检查，守住质量 |
| **Code Review** | PR 模板 + Checklist | 结构化的 Review 流程 |
| **版本管理** | Changesets | 自动化版本号 + Changelog |
| **发布** | GitHub Actions | CI/CD 自动发布 |

> 流程是工具，不是枷锁。团队先跑通最简流程（PR + Commit 规范），再逐步加自动化。
