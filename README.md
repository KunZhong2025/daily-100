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
| 已完成 | **7 / 100** 篇 |
| 草稿 | 0 篇 |
| 当前连续 | 5 天 |
| 起始日期 | 2026-10-08 |
| 最近更新 | 2026-10-15 |
| 累计字数 | 约 18,739 字 |

`██░░░░░░░░░░░░░░░░░░░░░░░` 7%
<!-- PROGRESS:END -->

## 文章索引

<!-- POSTS:START -->
**2026 年 10 月**

- **15** [Donkey's Tail：只有一句 Look at the...，剩下的全在图里](posts/2026/2026-10-15-donkey-s-tail-只有一句-look-at-the-剩下的全在图里/index.md) — 原文只有一句 Look at the... 的绘本怎么讲？看图说话三个问题，附逐页讲稿和照读版。 `亲子英语` `红火箭` `绘本` · 公众号已发 · 2179 字
- **14** [1086 句亲子口语，从小程序到本地 Markdown，只用了一小时](posts/2026/2026-10-14-1086-句亲子口语-从小程序到本地-markdown-只用了一小时/index.md) — 想把「快乐掌上学」小程序里的亲子口语句子搬出来，我先用老经验想到抓包，被 AI 劝退；最后走的是一条我没想过的路——电脑微信的辅助功能树。98 个 Day、1086 对句子，一小时落袋。 `AI` `Codex` `Windows` `自动化` `亲子英语` · 公众号已发 · 2131 字
- **13** [亲子英语打卡 01：教娃堆沙堡，一句 Hey presto 翻了车](posts/2026/2026-10-13-亲子英语打卡-01-教娃堆沙堡-一句-hey-presto-翻了车/index.md) — 7 句堆沙堡亲子口语，外加一句英式咒语的翻车现场。 `亲子英语` `英语启蒙` `打卡` · 公众号已发 · 1081 字
- **12** [打卡 30 天然后崩了，Claude 点破了原因](posts/2026/2026-10-12-打卡-30-天然后崩了-claude-点破了原因/index.md) — 8 月打卡满 30 天后彻底断掉。Claude 把原因拆成四根柱子：不是懒，是监督闭环塌了。 `ClaudeCode` `英语启蒙` `习惯养成` · 2535 字
- **11** [第一次用 Claude Code 做产品：新手真正常用的斜杠命令](posts/2026/2026-10-11-第一次用-claude-code-做产品-新手真正常用的斜杠命令/index.md) — 第一次用 Claude Code 做产品，常用的斜杠命令就这几个：从 /init 到收工 `Claude Code` `commands` `效率` · 公众号已发 · 3449 字
- **09** [5 块钱，用上 Opus 5.5](posts/2026/2026-10-09-几块钱也能使用上opus/index.md) — 闲鱼 5 块开 18 个月 Gemini Pro，Antigravity CLI 里直接用 Opus 5.5。 `Opus` `Antigravity` `省钱` · 公众号已发 · 2807 字
- **08** [在 Windows 上用 Claude Code：用 cc-switch 接中转站，把订阅阻力降到最低](posts/2026/2026-10-08-在-windows-上用-claude-code-省订阅费-cc-switch-接中转站/index.md) — 不折腾海外支付和网络，用 cc-switch 一键切供应商，先花小钱跑起来再说。 `Claude Code` `工具` `中转站` · 公众号已发 · 4557 字
<!-- POSTS:END -->

## 授权

文字版权归作者所有，转载请注明出处并附原文链接。
