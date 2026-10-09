---
description: 收尾今天 —— 刷新索引、提交、推送
argument-hint: "[留空即可]"
allowed-tools: Read, Edit, Glob, Grep, Bash(node:*), Bash(git:*)
---

# /wrap — 今天收尾

## 步骤

### 1. 确认今天的文章写完没有

`git status` 看有哪些改动。如果有 `posts/` 下的 `index.md` 还是 `status: draft`：

- 问用户 **「今天这篇写完了吗？」**
- 写完了 → 把 `status` 改成 `done`
- 没写完 → **不要改状态，也不要提交**。草稿留在工作区，等明天继续

### 2. 刷新 README

```bash
node scripts/build-index.mjs
```

它会重写进度表和文章索引。如果提示「还有 N 篇是草稿」，提醒用户。

### 3. 看一眼 README 的 git diff

确认进度条和索引更新正确，没把别的手写内容冲掉。有异常就修。

### 4. 提交

提交信息格式：`post: <日期> <标题>`，一篇多个文件也要分开写清楚。

```bash
git add -A
git commit -m "post: 2026-10-08 在 Windows 上用 Claude Code 省订阅费"
```

如果同一天提交了别的东西（改脚本、改模板），单独一个 commit：

```bash
git commit -m "chore: 调整公众号配色的引用块底色"
```

**提交信息末尾加上**：

```
Co-Authored-By: Claude Code <noreply@anthropic.com>
```

### 5. 推送

```bash
git push
```

如果还没配 remote，告诉用户先创建 GitHub 仓库，然后：

```bash
git remote add origin https://github.com/<用户名>/daily-100.git
git branch -M main
git push -u origin main
```

### 6. 报一下今天的结果

简短，三五行：

```
今天这篇：<标题>
字数：约 XXXX 字
进度：X / 100 天，连续 X 天
文章：<GitHub 链接，如果推成功了>
公众号：<已发 / 待发>
```

然后一句：明天想写什么？顺手提醒可以往 `docs/topic-bank.md` 里记一笔。

## 注意

- **没写完就不要提交。** 半成品推上去会打击积极性，也污染索引
- 有未解决的冲突或者推送失败，**如实说明**，不要报「已完成」
- 断更了就在 README 里如实写，不要偷偷删日期或补一堆假日期
- 一天写了两篇也没关系，两篇都提交，进度按篇数算
