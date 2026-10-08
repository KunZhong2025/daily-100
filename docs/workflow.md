# 每日操作手册

第一次用先读这一页。之后每天只需要：`/daily` → 写 → `/publish` → `/wrap`。

---

## 一、每天的四步

### 1. 开局

```
/daily 今天想写的题目
```

Claude 会：
- 建好 `posts/2026/2026-XX-XX-标题/`，套上模板
- 挑一个选题跟你确认角度（如果题目太宽泛）
- 给出这一篇的大纲和需要你自己补的地方

暂时没想好题目，就只打 `/daily`，它会从 `docs/topic-bank.md` 里挑几个给你选。

### 2. 写

直接在对话里跟 Claude 一起改，或者自己打开 `index.md` 写。

**判断标准**：写完通读一遍，如果删掉所有代码块还剩不下什么东西，那这篇是教程空壳，得补自己的思考和踩坑。

### 3. 看排版

```
/publish
```

生成 `wechat.html` 预览页，双击打开 → 点「复制正文」→ 公众号后台 `Ctrl+V`。

预览页顶部会提醒你有几张本地图要手动上传。

### 4. 收尾

```
/wrap
```

更新 README 的进度和索引 → 提交 → 推送。

---

## 二、不用命令的手动方式

```bash
# 建文件夹
node scripts/new-post.mjs "文章标题"
node scripts/new-post.mjs "文章标题" --date 2026-10-08 --tags 工具,踩坑

# 生成公众号排版
node scripts/md2wechat.mjs posts/2026/2026-10-08-文章标题
node scripts/md2wechat.mjs posts/2026/2026-10-08-文章标题 --open   # 顺便打开浏览器

# 刷新 README
node scripts/build-index.mjs
```

---

## 三、frontmatter 各字段

```yaml
---
title: "在 Windows 上用 Claude Code，我怎么绕开订阅"
date: 2026-10-08
tags: [Claude Code, 工具]
summary: "用 cc-switch 接第三方模型，充值 37 块钱先跑起来。"
cover: ""                 # 封面图，可留空，公众号侧单独上传
status: draft             # draft → done
wechat: pending           # pending → published
---
```

- **`summary`** 会进 README 索引，也适合当公众号摘要。40 字以内
- **`status`** 只有改成 `done` 才会算进进度。草稿不会污染统计数据
- **`wechat`** 用来标记这篇公众号发了没，避免重复发

---

## 四、公众号的坑（提前知道能省很多返工）

| 坑 | 表现 | 怎么办 |
| --- | --- | --- |
| 外链点不开 | 正文里的 `[文字](url)` 变成纯文字，点了没反应 | 脚本默认把外链抽出来放文末纯文本区。要保留原样加 `--keep-links` |
| 样式被剥掉 | 自定义配色、class 全没了 | 脚本把所有样式写成内联 `style=`，符合公众号规则 |
| 代码高亮丢失 | 代码块变成黑白 | 脚本把 highlight.js 的 class 转成内联颜色 |
| 图片要重传 | 粘贴后是空图或裂图 | 预览页顶部列清单，手动上传 |
| 未认证号没链接权限 | 菜单、阅读原文受限 | 把链接写在正文纯文本里，读者手动复制 |

**注意**：未认证订阅号连「原文链接」也不能随便加，所以正文里出现网址时，一定写成可复制的纯文本，别指望超链接。

---

## 五、文件放哪

```
posts/2026/2026-10-08-标题/
├── index.md                 ← 唯一的正文源，改这个
├── assets/
│   └── screenshot.png       ← 正文用 ![](assets/screenshot.png) 引用
├── wechat.fragment.html     ← 生成物，别手改
└── wechat.html              ← 生成物，别手改
```

截图建议：Windows 用 `Win + Shift + S` 截图，存到 `assets/`。文件名用英文，中文文件名在某些 markdown 渲染器里会挂。

---

## 六、选题从哪来

三个来源，按可靠性排序：

1. **当天真的卡住了什么** —— 最值钱。卡住的瞬间记一笔，晚上就能成文
2. **`docs/topic-bank.md`** —— 平时攒的，没灵感时翻
3. **读者/同事问你的问题** —— 有人问说明不只你一个人不会

实在没得写，写「为什么今天写不出来」，那也是真实的。但**不要为了凑数编一篇**，编的东西读起来一眼假。

---

## 七、100 天怎么排

- **第 1–30 天**：找手感。技术上怎么写、多长、什么节奏，允许写得烂
- **第 31–60 天**：攒出两三篇能拿出手的，放进 README 顶部当门面
- **第 61–100 天**：挑几篇合并成系列（比如「Claude Code 在 Windows 上的完整折腾史」）

断一天不算失败，断三天才危险。真断了就在 README 里如实写，别偷偷删日期。

---

## 八、出问题

**脚本报 `Cannot find package 'markdown-it'`**
```bash
cd E:/claudecode_projects/github_wechat_papers && npm install
```

**中文标题生成目录报错**
检查标题里有没有 `? * : " < > |` 这些字符，脚本会清掉，但 `/` 会被当成路径分隔符 —— 标题里别用斜杠。

**`/daily` 命令找不到**
确认 `.claude/commands/daily.md` 存在，且是在本仓库目录下启动的 Claude Code。

**推送到 GitHub 报认证失败**
没装 `gh`。用 Personal Access Token：
```bash
git remote set-url origin https://<token>@github.com/<用户名>/daily-100.git
```
或者装了 `gh` 之后 `gh auth login`。
