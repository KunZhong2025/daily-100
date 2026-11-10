---
description: 生成公众号排版；确认后可创建 API 草稿
argument-hint: "[文章目录，留空则用最新一篇]"
allowed-tools: Read, Glob, Grep, Bash(node:*), Bash(git status:*), Bash(ls:*), Bash(start:*)
---

# /publish — 生成公众号排版或 API 草稿

指定目录：**$ARGUMENTS**

## 步骤

### 1. 找到今天要发的文章

- **给了目录** → 用它
- **没给** → 找 `posts/` 下日期最新的一篇（`git status` 里如果只有一篇有未提交改动，优先用那篇）

### 2. 发布前检查

读 `index.md`，逐条检查并在回复里报告：

| 检查项 | 不通过怎么办 |
| --- | --- |
| `title` 有没有填 | 没填就问用户 |
| `summary` 有没有填（≤40 字） | 没填就根据正文拟一个，让用户确认 |
| 正文里还有没有 `<!-- TODO` 没处理 | **必须停下来问用户**，这是没写完 |
| 正文里有没有 `[文字](http://...)` 外链 | 提醒会被抽到文末，要保留原样加 `--keep-links` |
| 正文有多少字 | 少于 800 或超过 4000 要提醒 |
| 代码块数量 | 超过 4 个提醒读者会划走 |
| `assets/` 里有没有图被正文引用 | 有就列出清单，提醒手动上传 |

**只要还剩 `<!-- TODO`，就不要生成发布版**。先告诉用户哪几处没补。

### 3. 生成并预览

```bash
node scripts/md2wechat.mjs <post-dir> --open
```

### 4. 草稿箱发布（可选）

- 默认仍走预览页复制粘贴，避免没有检查过的内容直接进入草稿箱。
- 用户明确要求「创建草稿」后，先确认 `cover` 有值或已有封面图片路径，再执行：

```bash
node scripts/wechat-draft.mjs <post-dir> --cover assets/cover.png --draft
```

- 此命令会上传封面、上传正文中的本地图片，并在公众号草稿箱创建一篇草稿；**不可在用户没明确确认时执行**。
- 成功后仍要到草稿箱检查排版和封面，公众号的群发由用户手动完成。

### 5. 告诉用户接下来做什么

用简短的步骤说明，不要长篇大论：

```
1. 预览页打开了，点「复制正文」
2. 公众号后台 → 图文消息 → 正文区 Ctrl+V
3. 这几张图要手动传：<清单>
4. 标题和摘要：<给出建议值>
```

### 6. 发布后

用户说发出去了之后，把 `index.md` frontmatter 里的 `wechat` 改成 `published`，并跑一次：

```bash
node scripts/build-index.mjs
```

## 注意

- 不要手改 `wechat.html` 和 `wechat.fragment.html`，那是生成物，改了会被覆盖
- 样式要改就改 `scripts/md2wechat.mjs` 顶部的 `T` 配色对象
- 生成失败（比如报 `Cannot find package`）→ 先跑 `npm install`
