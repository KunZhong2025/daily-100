# daily-100 配图规范

一套模板出两种图：**内容卡片**（1080×1440，正文内嵌）和**文章封面**（1080×460，2.35:1）。日常通过 `/illustrate` 使用，不要手写新样式。

## 设计 token

色彩只有两个语义强调色，别加第三种：

| token | 值 | 语义 |
| --- | --- | --- |
| `--midnight` | `#0b1020` | 底色（永远在照片遮罩下面兜底） |
| `--violet` | `#a89bff` | 结构：徽章、序号、金句强调、边框 |
| `--teal` | `#86e8d8` | 「你敲的东西」：命令、`<b>` 副题重点 |
| `--ok` | `#85ec8b` | 终端绿，**只许出现在终端窗口内** |
| `--ink` / `--body` | `#f2f4fb` / `#aab2c5` | 主文字 / 次级文字 |

字体零 webfont 依赖：中文 `Microsoft YaHei`，代码 `Consolas`。截图机器和读者看到的都一样。

## 签名元素

**每张卡片必带一个 Claude Code 终端窗口**（红黄绿圆点 + `Claude Code` 标签 + 真实命令 + `✓` 输出行）。这是 100 天系列的视觉记忆点，也是真假 AI 图的分水岭 —— 背景可以换，这个窗口不摘。

## 三条硬规则

1. **文字必须来自正文。** 命令、描述、金句都从定稿的 `index.md` 里取，不编造、不改写成「更顺口」的版本
2. **序号只给真序列。** `.num` 圆圈编号只用于文章里真实分步骤的内容；并列关系就用并列排版，别装饰
3. **克制减法。** 不加 CSS 网格纹理、不加 `backdrop-filter`、不加第三种强调色、不堆阴影。模板已按此审过，改的时候别加回去

## 背景图层

`bg-card.png`（竖）和 `bg-cover.png`（横）是 ChatGPT 一次性生成的**系列资产**：

- 无文字（AI 生成中文必乱码，文字一律由模板叠上去）
- 不随文章重生成。哪天想换风格，重新生成一对、同名替换即可，模板不用动
- 用户可随时手动替换这两个文件

## 模板 token 参考

### card.html（1080×1440，截 `#card`）

`{{BADGE}}` `{{TITLE_HTML}}` `{{SUB}}` `{{ROWS_HTML}}` `{{TERM_CMD}}` `{{TERM_LINES_HTML}}` `{{TIP_HTML}}` `{{BG_POS}}` —— 含义见模板头部注释。`ROWS_HTML` 每行是 `.row`（`.num` 序号 + `.cmd` 命令 + `.name`/`.desc`），2–4 行，多了截断。

### cover.html（1080×460，截 `#cover`）

`{{L1_HTML}}`（引导语）`{{L1_SIZE}}`（默认 60px）`{{L2_HTML}}`（核心词，2–4 字）`{{L2_SIZE}}`（2–3 字用 100px，4 字降到 80px）`{{L3_HTML}}`（副题）`{{TEXT_LEFT}}`（默认 430px，按背景主体位置调）`{{BG_POS}}`。

## 截图流程（/illustrate 自动做，手改时照此）

```bash
node scripts/serve.mjs                # 仓库根起静态服务，端口 8741
# 填好的 HTML 放 tmp/illustrate/<slug>/，浏览器访问：
#   http://localhost:8741/tmp/illustrate/<slug>/card-01.html
# Playwright: browser_resize 到画布尺寸 → 截 #card / #cover 选择器
# 产物 mv 到文章 assets/，然后关掉服务器
```

画布尺寸：卡片 1080×1440，封面 1080×460。
