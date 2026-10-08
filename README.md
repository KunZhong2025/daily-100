# daily-100

> 每天写一点，连续 100 天。写工作里的手感，也写生活里的碎念。

## 这是什么

一个写作仓库，不是教程合集。

- **源文件在这里** — 每篇文章是 `posts/` 下的一个 Markdown 文件夹，README 里的索引由脚本生成
- **发布到两处** — GitHub（原文，可检索、有版本记录） + 微信公众号（成品排版）
- **内容分两类** — 解决具体问题的**小教程**，和当天真实的**感悟**
- **图片和原稿都在仓库里** — 公众号只是出口之一，不是唯一归宿

## 目录结构

```
daily-100/
├── posts/                     # 文章正文，按年归档
│   └── 2026/
│       └── 2026-10-08-标题/
│           ├── index.md       # 正文（唯一的源）
│           ├── assets/        # 这篇用到的图片
│           ├── wechat.html    # 生成物：公众号预览页（已 gitignore）
│           └── wechat.fragment.html
├── templates/
│   └── post-template.md       # 新文章模板
├── scripts/
│   ├── new-post.mjs           # 建当天文件夹
│   ├── md2wechat.mjs          # Markdown → 公众号可粘贴 HTML
│   └── build-index.mjs        # 扫全仓库，重写下面的进度表和索引
├── docs/
│   ├── workflow.md            # 每日操作手册（第一次看这个）
│   └── topic-bank.md          # 选题库，没灵感时翻它
├── .claude/commands/          # 每天用的斜杠命令
├── CLAUDE.md                  # 给 Claude Code 的项目约定
└── package.json
```

## 每天四步

```bash
/daily 今天想写的题目     # 建当天文件夹 + 套模板 + 列大纲
# ……把正文写完……
/publish                 # 生成公众号预览页，一键复制
/wrap                    # 更新索引 + 提交 + 推送
```

不想用命令也行，三个脚本直接跑：

```bash
node scripts/new-post.mjs "文章标题"
node scripts/md2wechat.mjs posts/2026/2026-10-08-文章标题
node scripts/build-index.mjs
```

完整说明见 [`docs/workflow.md`](docs/workflow.md)。

## 进度

<!-- PROGRESS:START -->
| 指标 | 数值 |
| --- | --- |
| 已完成 | **0 / 100** 篇 |
| 草稿 | 1 篇 |
| 当前连续 | 0 天 |
| 起始日期 | 2026-10-08 |
| 最近更新 | — |
| 累计字数 | 约 3,402 字 |

`░░░░░░░░░░░░░░░░░░░░░░░░░` 0%
<!-- PROGRESS:END -->

## 文章索引

<!-- POSTS:START -->
**2026 年 10 月**

- **08** [在 Windows 上用 Claude Code：用 cc-switch 接中转站，把订阅阻力降到最低](posts/2026/2026-10-08-在-windows-上用-claude-code-省订阅费-cc-switch-接中转站/index.md) _(草稿)_ — 不折腾海外支付和网络，用 cc-switch 一键切供应商，先花小钱跑起来再说。 `Claude Code` `工具` `中转站` · 3402 字
<!-- POSTS:END -->

## 授权

文字版权归作者所有，转载请注明出处并附原文链接。
