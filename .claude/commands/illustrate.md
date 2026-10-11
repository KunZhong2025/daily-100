---
description: 给定稿文章生成公众号配图（1 封面 + 每章 1 卡片），HTML 模板 + Playwright 截图
argument-hint: [文章目录，留空用最新一篇]
allowed-tools: Bash(node:*), Bash(netstat:*), Bash(taskkill:*), Bash(mv:*), Bash(cp:*), Bash(mkdir:*), Bash(rm:*), mcp__playwright__*
---

# /illustrate — 生成公众号配图

配套模板：`templates/illustrate/`（含 README.md 设计规范，先读它再动手）。

## 步骤

### 1. 定位文章

- 给了目录 → 用它
- 没给 → `posts/` 下日期最新的一篇

读 `index.md`，通读正文后再往下。

### 2. 规划配图清单，先给用户确认

按文章章节列一张表：每张卡片对应哪一节、徽章文字（如「03 · 质量关」）、放哪几条命令、终端窗口里放哪条命令。封面给三行文案的草案（引导语 / 核心词 2–4 字 / 副题）。

**等用户确认再生成。** 命令必须是正文里真实出现过的，规划时就要核对，发现正文没写的命令就退回去问。

### 3. 填模板

```bash
mkdir -p tmp/illustrate/<slug>
cp templates/illustrate/card.html tmp/illustrate/<slug>/card-01.html
cp templates/illustrate/cover.html tmp/illustrate/<slug>/cover.html
```

然后对副本做字符串替换填 token（每张卡一个文件）。填的时候：

- 文字全部取自正文原句，不编造、不注水
- 多张卡片轮换 `{{BG_POS}}`（如 `center 62%` / `center 40%` / `center 75%`），避免每张构图雷同
- 封面字号按标题长度调（`{{L1_SIZE}}`/`{{L2_SIZE}}`），`{{TEXT_LEFT}}` 按背景主体位置调

### 4. 截图

```bash
node scripts/serve.mjs
```

后台起服务（端口 8741）。Playwright：`browser_resize` 到画布尺寸 → 访问 `http://localhost:8741/tmp/illustrate/<slug>/xxx.html` → 截选择器：

- 卡片：画布 1080×1440，截 `#card`
- 封面：画布 1080×460，截 `#cover`

**截完看一眼再交付**：文字有没有溢出、终端窗口行数会不会撑爆、对比度够不够。丑就改了重截，不把半成品推给用户。

### 5. 归位并嵌入文章

- 卡片截图 `mv` 到 `<post-dir>/assets/`，编号接着现有图往后排（已有 1–4 就从 5 开始）
- 封面：`assets/1.png` 已存在时先问用户要不要覆盖
- 在 `index.md` 对应章节插入 `![](assets/N.png)`，封面更新 frontmatter 的 `cover`

### 6. 收尾

- `netstat -ano | grep 8741` 找 PID → `taskkill //F //PID <pid>` 关服务器（被 kill 的后台任务报 exit code 1 是正常的，不是失败）
- 提醒用户：配图有改动的话重跑 `node scripts/md2wechat.mjs <post-dir> --open`；公众号后台图片可能要手动重传

## 铁律

- **卡片上的每一条命令、每一句话都必须能在正文里找到出处**，找得到就抄原句，找不到就问用户
- 模板改动只发生在 `templates/illustrate/`，保持 100 天系列视觉一致；单篇文章想要特殊效果，宁可放弃也不要开洞
- 不新增第三种强调色、不加 `backdrop-filter`、不恢复网格纹理（见 README 三条硬规则）
