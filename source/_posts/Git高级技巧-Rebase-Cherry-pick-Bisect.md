---
title: "Git 高级技巧：Rebase、Cherry-pick 与 Bisect"
date: 2024-12-06
categories: "Git"
description: "Git 不只有 add/commit/push。本文深入 Rebase 交互式变基、Cherry-pick 精选提交、Bisect 二分查找 Bug 等高级操作，提升你的 Git 能力"
tags: "Git"
copyright: true
---

## 前言

大部分开发者用 Git 只用了 20% 的功能：`add` → `commit` → `push` → `pull`。

而剩下 80% 的功能——**rebase、cherry-pick、bisect、stash**——才是真正提升效率的关键。

---

## 一、交互式 Rebase（变基）

```bash
# 整理最近 3 个 commit
git rebase -i HEAD~3
```

进入交互界面，你可以：

```markdown
pick abc123 feat: 添加登录功能
squash def456 修复登录 Bug          # 合并到上一个 commit
fixup 789ghi 删掉调试代码            # 合并并丢弃 commit message
reword abc123 feat: 添加登录功能      # 修改 commit message
edit   abc123 feat: 添加登录功能      # 暂停编辑修改内容
drop   abc123 feat: 添加登录功能      # 删除这个 commit
```

**最常用场景：** 开发中 commit 了 N 次，PR 前合并为 1 个干净的 commit。

```bash
# 合并为 1 个 commit 后再推送到远程
git rebase -i HEAD~3
# 把第二、第三个 pick 改为 squash
# 保存退出后写新的 commit message
git push --force-with-lease
```

---

## 二、Cherry-pick——精选提交

```bash
# 把某个分支的特定 commit 应用到当前分支
git cherry-pick abc123

# 多个 commit
git cherry-pick abc123 def456

# 不自动提交（只应用变更）
git cherry-pick abc123 --no-commit
```

**场景：** 开发分支上修了一个 Bug，main 也需要这个修复，但不想合并整个分支。

```bash
# 从 feature 分支挑出 Bug 修复的 commit
git checkout main
git cherry-pick abc123  # 只应用这个 commit 到 main
```

---

## 三、Bisect——二分查找 Bug

```bash
# 当你知道"之前是好的，现在坏了"，但不知道哪个 commit 引入的 Bug
git bisect start
git bisect good v1.0      # 标记已知的正常版本
git bisect bad HEAD        # 标记当前的坏版本

# Git 会 checkout 中间的一个 commit
# 测试这个版本：有 Bug → git bisect bad，没有 → git bisect good
# 重复 5-7 次后，Git 会定位到第一个引入 Bug 的 commit

git bisect bad
git bisect good
# ... 重复几次后：
# abc123 is the first bad commit

git bisect reset  # 结束 bisect
```

---

## 四、Stash——暂存工作

```bash
# 临时保存当前工作（切换到其他分支处理紧急事）
git stash save "正在开发登录功能"

# 查看 stash 列表
git stash list
# stash@{0}: On feat/login: 正在开发登录功能

# 恢复最近一次 stash
git stash pop

# 恢复指定 stash
git stash apply stash@{1}

# 创建一个分支从 stash 恢复（解决冲突更直观）
git stash branch feat/hotfix stash@{0}
```

---

## 五、git log 高级用法

```bash
# 图形化历史
git log --graph --oneline --all

# 搜索 commit 信息
git log --grep="fix:" --oneline

# 搜索修改的文件
git log --oneline --name-only

# 查看某个文件的修改历史
git log --follow --oneline src/App.vue

# 查看某个作者的所有 commit
git log --author="LC" --oneline
```

---

## 六、实用配置

```bash
# 别名（大幅提速）
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.graph 'log --graph --oneline --all'

# pull 时用 rebase 避免多余的 merge commit
git config --global pull.rebase true
```

---

**推荐阅读：** [Pro Git Book](https://git-scm.com/book/zh/v2)
