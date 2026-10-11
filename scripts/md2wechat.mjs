#!/usr/bin/env node
/**
 * Markdown → 微信公众号可粘贴的 HTML。
 *
 * 公众号编辑器的脾气：
 *   1. 吃掉 <style> 标签和 class —— 所以所有样式必须内联
 *   2. 外部链接不给跳转权限 —— 默认把链接抽出来，文末以纯文本列出
 *   3. 图片要重新上传 —— 这里只生成预览和清单，不假装能替你传
 *
 * 用法:
 *   node scripts/md2wechat.mjs <post-dir> [--keep-links] [--with-title] [--open]
 *
 * 产出:
 *   <post-dir>/wechat.fragment.html   正文片段，给脚本或手工复制用
 *   <post-dir>/wechat.html            预览页，打开后用「复制正文」按钮取富文本
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ── 参数 ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const flags = new Set(argv.filter((a) => a.startsWith('--')))
const positional = argv.filter((a) => !a.startsWith('--'))
const keepLinks = flags.has('--keep-links')
const withTitle = flags.has('--with-title')
const shouldOpen = flags.has('--open')

if (!positional[0]) {
  console.error('用法: node scripts/md2wechat.mjs <post-dir> [--keep-links] [--with-title] [--open]')
  process.exit(1)
}

const postDir = path.resolve(ROOT, positional[0])
const mdPath = fs.existsSync(path.join(postDir, 'index.md'))
  ? path.join(postDir, 'index.md')
  : postDir

if (!fs.existsSync(mdPath)) {
  console.error(`找不到文件: ${mdPath}`)
  process.exit(1)
}

// ── frontmatter ─────────────────────────────────────────────────────────────
const raw = fs.readFileSync(mdPath, 'utf8')
let meta = {}
let content = raw

const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
if (fmMatch) {
  content = raw.slice(fmMatch[0].length)
  for (const line of fmMatch[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    }
    meta[m[1]] = v
  }
}

// 去掉模板里的 HTML 注释块
content = content.replace(/<!--[\s\S]*?-->/g, '').trim()

// ── 主题：公众号里能用得住的一套色 ──────────────────────────────────────────
const T = {
  text: '#3f3f3f',
  heading: '#1a1a1a',
  accent: '#0f766e',
  muted: '#8c8c8c',
  border: '#e8e8e8',
  quoteBg: '#f7f8f8',
  codeBg: '#f6f8fa',
  // 字体栈一律用单引号：整个 style 值是用双引号包起来的，
  // 里面再出现双引号会把属性提前截断，公众号解析出来就是坏样式。
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
  mono: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"
}

const p = `margin: 0 0 1.1em; font-size: 16px; line-height: 1.9; color: ${T.text}; letter-spacing: 0.03em; text-align: justify; word-break: break-word;`
const pQuote = `margin: 0 0 0.7em; font-size: 15px; line-height: 1.85; color: #575757; text-align: justify;`
const pList = `margin: 0 0 0.4em; font-size: 16px; line-height: 1.85; color: ${T.text}; text-align: justify;`

// 渲染期状态。渲染是同步的，模块级变量够用，每次 render 前重置。
// 需要它是因为：引用块内的段落、列表内的段落，样式和正文段落不一样。
const S = { quote: 0, list: 0 }

// ── markdown-it ─────────────────────────────────────────────────────────────
const md = new MarkdownIt({
  html: true,
  linkify: false,
  breaks: false,
  highlight (code, lang) {
    let out
    try {
      out = lang && hljs.getLanguage(lang)
        ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
        : hljs.highlightAuto(code).value
    } catch {
      out = escapeHtml(code)
    }
    return `<pre style="margin: 0 0 1.4em; padding: 14px 16px; background: ${T.codeBg}; border: 1px solid ${T.border}; border-radius: 6px; overflow-x: auto; font-size: 13px; line-height: 1.7;"><code style="font-family: ${T.mono}; font-size: 13px; color: ${T.text}; background: none; padding: 0;">${out}</code></pre>`
  }
})

function escapeHtml (s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
}

// 收集被抽出来的外链
const collectedLinks = []
const seen = new Set()

// 外链处理：默认抽出来放文末，公众号点不开，留着反而像坏掉的链接
if (!keepLinks) {
  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    const href = tokens[idx].attrGet('href') || ''
    if (/^https?:\/\//i.test(href) && !seen.has(href)) {
      seen.add(href)
      collectedLinks.push(href)
    }
    return ''
  }
  md.renderer.rules.link_close = () => ''
}

// 标题
// 坑：renderer.rules.inline 对 render() 顶层是死代码 —— markdown-it 直接调
// renderInline(children)，不走规则表。所以只能用 open/close 一对来包裹。
const headingStyle = (level) => {
  if (level === 1) return `margin: 0 0 1em; font-size: 21px; font-weight: 700; line-height: 1.5; color: ${T.heading};`
  // 二级标题段前必须为 0：公众号里 h2 自带上间距会显得断层，每次都要手动归零
  if (level === 2) return `margin: 0 0 0.9em; padding-left: 11px; border-left: 4px solid ${T.accent}; font-size: 19px; font-weight: 600; line-height: 1.5; color: ${T.heading};`
  return `margin: 1.8em 0 0.8em; font-size: 17px; font-weight: 600; line-height: 1.5; color: ${T.heading};`
}
md.renderer.rules.heading_open = (tokens, idx) => {
  const level = Number(tokens[idx].tag.slice(1))
  return `<h${level} style="${headingStyle(level)}">`
}
md.renderer.rules.heading_close = (tokens, idx) =>
  `</${tokens[idx].tag}>`

// 段落 —— 引用块内和列表内要换一套样式，否则字号和间距会打架
const paraStyle = () => (S.quote ? pQuote : S.list ? pList : p)

// 引用
md.renderer.rules.blockquote_open = () => {
  S.quote++
  return `<blockquote style="margin: 0 0 1.4em; padding: 12px 16px; background: ${T.quoteBg}; border-left: 3px solid ${T.accent}; border-radius: 0 4px 4px 0;">`
}
md.renderer.rules.blockquote_close = () => { S.quote--; return '</blockquote>' }

// 列表
md.renderer.rules.bullet_list_open = () => {
  S.list++
  return `<ul style="margin: 0 0 1.2em; padding-left: 1.4em; list-style-type: disc;">`
}
md.renderer.rules.bullet_list_close = () => { S.list--; return '</ul>' }
md.renderer.rules.ordered_list_open = (tokens, idx) => {
  S.list++
  const start = tokens[idx].attrGet('start')
  const attr = start && start !== '1' ? ` start="${escapeHtml(start)}"` : ''
  return `<ol${attr} style="margin: 0 0 1.2em; padding-left: 1.4em; list-style-type: decimal;">`
}
md.renderer.rules.ordered_list_close = () => { S.list--; return '</ol>' }
md.renderer.rules.list_item_open = () =>
  `<li style="margin: 0 0 0.5em; font-size: 16px; line-height: 1.85; color: ${T.text};">`
md.renderer.rules.list_item_close = () => '</li>'

// 紧凑列表：markdown-it 会标 tight=true，此时段落记号不产生 <p>，直接是纯文本。
// 如果这里不拦，紧凑列表项会被套上带下边距的 <p>，行距变得很松。
md.renderer.rules.paragraph_open = (tokens, idx) => {
  if (tokens[idx].hidden) return ''
  return `<p style="${paraStyle()}">`
}
md.renderer.rules.paragraph_close = (tokens, idx) =>
  tokens[idx].hidden ? '' : '</p>'

// 行内代码
md.renderer.rules.code_inline = (t, i) =>
  `<code style="padding: 2px 5px; background: ${T.codeBg}; border: 1px solid ${T.border}; border-radius: 3px; font-family: ${T.mono}; font-size: 14px; color: #c7254e; word-break: break-all;">${escapeHtml(t[i].content)}</code>`

// 分割线
md.renderer.rules.hr = () =>
  `<hr style="margin: 2.4em 0; border: none; border-top: 1px solid ${T.border};">`

// 加粗 / 斜体 / 删除线
md.renderer.rules.strong_open = () => `<strong style="font-weight: 600; color: ${T.heading};">`
md.renderer.rules.strong_close = () => '</strong>'
md.renderer.rules.em_open = () => '<em style="font-style: italic;">'
md.renderer.rules.em_close = () => '</em>'
md.renderer.rules.s_open = () => `<s style="color: ${T.muted};">`
md.renderer.rules.s_close = () => '</s>'

// 图片：公众号要重传，这里只保证预览能看
const images = []
md.renderer.rules.image = (t, i) => {
  const src = t[i].attrGet('src') || ''
  const alt = t[i].content || ''
  if (!/^https?:\/\//i.test(src)) images.push(src)
  return `<img src="${src}" alt="${escapeHtml(alt)}" style="display: block; max-width: 100%; height: auto; margin: 1.4em auto; border-radius: 4px;">`
}

// 表格
// markdown-it 会在 table_open/close 之间自己吐 thead/tbody/tr，
// 所以包裹层必须在 open/close 里一次写完，不能只写 <table> 了事。
const cellBase = `padding: 8px 10px; border: 1px solid ${T.border};`
md.renderer.rules.table_open = () =>
  `<section style="margin: 0 0 1.4em; overflow-x: auto;"><table style="width: 100%; border-collapse: collapse; font-size: 14px;">`
md.renderer.rules.table_close = () => '</table></section>'
md.renderer.rules.thead_open = () => '<thead>'
md.renderer.rules.thead_close = () => '</thead>'
md.renderer.rules.tbody_open = () => '<tbody>'
md.renderer.rules.tbody_close = () => '</tbody>'
md.renderer.rules.tr_open = () => '<tr>'
md.renderer.rules.tr_close = () => '</tr>'
md.renderer.rules.th_open = () =>
  `<th style="${cellBase} background: ${T.quoteBg}; text-align: left; font-weight: 600; color: ${T.heading};">`
md.renderer.rules.th_close = () => '</th>'
md.renderer.rules.td_open = () =>
  `<td style="${cellBase} color: ${T.text};">`
md.renderer.rules.td_close = () => '</td>'

// 渲染前重置状态，避免二次调用时残留
S.quote = 0
S.list = 0

let html = md.render(content)

// highlight.js 的 class 会被公众号剥掉，转成内联色
const HL = [
  [/#7f848e|comment|quote/, '#7f848e', 'font-style: italic;'],
  [/keyword|built_in|type|tag|selector-tag/, '#c678dd', ''],
  [/string|regexp|addition|meta-string/, '#98c379', ''],
  [/number|literal|symbol/, '#d19a66', ''],
  [/title|section|name|selector-id|selector-class/, '#61afef', ''],
  [/attr|attribute|variable|template-variable|property/, '#e06c75', ''],
  [/meta|doctag|bullet|link/, '#56b6c2', ''],
  [/deletion/, '#e06c75', 'text-decoration: line-through;'],
  [/emphasis/, '', 'font-style: italic;'],
  [/strong/, '', 'font-weight: 600;']
]
html = html.replace(/<span class="([^"]*hljs-[^"]*)">/g, (full, classes) => {
  for (const [re, color, extra] of HL) {
    if (re.test(classes)) {
      const style = `${color ? `color: ${color};` : ''}${extra}`
      return style ? `<span style="${style}">` : '<span>'
    }
  }
  return '<span>'
})

// 抽出来的外链，文末补一节（正文里已经手写了「参考链接」就不重复添）
if (collectedLinks.length && !/参考链接|参考资源|References/i.test(content)) {
  html += `\n<hr style="margin: 2.4em 0; border: none; border-top: 1px solid ${T.border};">\n`
  html += `<p style="margin: 0 0 0.8em; font-size: 16px; font-weight: 600; color: ${T.heading};">参考链接</p>\n`
  html += `<p style="margin: 0 0 1.1em; font-size: 14px; line-height: 2; color: ${T.muted};">`
  html += collectedLinks.map((u, i) => `${i + 1}. ${escapeHtml(u)}`).join('<br>')
  html += '</p>'
}

// 标题可选前置
if (withTitle && meta.title) {
  html = `<h1 style="margin: 0 0 0.6em; font-size: 22px; font-weight: 700; line-height: 1.4; color: ${T.heading};">${escapeHtml(meta.title)}</h1>\n` + html
}

// ── 输出片段 ────────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(postDir, 'wechat.fragment.html'), html, 'utf8')

// ── 输出预览页 ──────────────────────────────────────────────────────────────
const title = meta.title || path.basename(postDir)
const tagList = Array.isArray(meta.tags) ? meta.tags : []
// 后台摘要：wechat_summary 优先（定稿时给的 120 字版），没填就退回 frontmatter 的 summary
const summaryText = typeof meta.summary === 'string' ? meta.summary.trim() : ''
const wechatSummary = typeof meta.wechat_summary === 'string' ? meta.wechat_summary.trim() : ''
const imgList = [...new Set(images)]

const preview = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>公众号预览 · ${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #eef0f2; font-family: ${T.font}; }
  .bar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: 12px;
         padding: 12px 20px; background: #fff; border-bottom: 1px solid #e2e5e8; flex-wrap: wrap; }
  .bar h1 { margin: 0; font-size: 15px; font-weight: 600; color: #1a1a1a; flex: 1; min-width: 200px; }
  .bar .meta { font-size: 12px; color: #8c8c8c; }
  button { padding: 8px 16px; font-size: 13px; font-family: inherit; cursor: pointer;
           border: 1px solid #d0d5da; border-radius: 6px; background: #fff; color: #1a1a1a; }
  button:hover { background: #f5f7f9; }
  button.primary { background: ${T.accent}; border-color: ${T.accent}; color: #fff; }
  button.primary:hover { background: #0d6660; }
  .wrap { max-width: 700px; margin: 24px auto 64px; padding: 0 16px; }
  .panel { background: #fff; border: 1px solid #e2e5e8; border-radius: 10px; padding: 16px 20px;
           margin-bottom: 16px; font-size: 13px; line-height: 1.8; color: #4a4a4a; }
  .panel h2 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #1a1a1a; }
  .panel ol { margin: 0; padding-left: 1.4em; }
  .panel code { background: #f2f4f6; padding: 1px 5px; border-radius: 3px;
                font-family: ${T.mono}; font-size: 12px; }
  .phone { background: #fff; border-radius: 10px; padding: 32px 24px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .tags { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
  .tags span { display: inline-block; margin: 0 6px 0 0; padding: 2px 9px; font-size: 12px;
               color: ${T.accent}; background: #f0faf9; border-radius: 3px; }
  .tags time { font-size: 12px; color: #9aa0a6; margin-left: 8px; }
</style>
</head>
<body>
<div class="bar">
  <h1>公众号预览 · ${escapeHtml(title)}</h1>
  <span class="meta">${meta.date || ''}</span>
  <button class="primary" id="copy">复制正文</button>
  <button id="copy-md">复制 Markdown</button>
</div>
<div class="wrap">
  ${imgList.length ? `<div class="panel">
    <h2>⚠️ 有 ${imgList.length} 张本地图片需要重新上传</h2>
    <ol>${imgList.map((i) => `<li><code>${escapeHtml(i)}</code>（绝对路径：<code>${escapeHtml(path.resolve(postDir, i))}</code>）</li>`).join('')}</ol>
    <p style="margin:8px 0 0">公众号不会去读本地文件。预览里能看见是因为同目录，粘贴过去是空图。</p>
  </div>` : ''}
  <div class="panel">
    <h2>发布步骤</h2>
    <ol>
      <li>点上面的「复制正文」</li>
      <li>公众号后台 → 图文消息 → 正文区 <code>Ctrl+V</code></li>
      <li>检查代码块有没有换行错位，图片按上面清单手动上传</li>
      <li>标题、封面在公众号侧单独填；摘要在下方「后台摘要栏」卡片一键复制</li>
    </ol>
  </div>
  ${(wechatSummary || summaryText) ? `<div class="panel">
    <h2>后台摘要栏 · <span id="sum-count"></span> 字 <button id="copy-summary">复制摘要</button></h2>
    <p style="margin: 8px 0 0;" id="summary-text">${escapeHtml(wechatSummary || summaryText)}</p>
    <p style="margin: 6px 0 0; color: #8c8c8c;">来源：frontmatter 的 <code>wechat_summary</code>${wechatSummary ? '' : '（未填，暂用 <code>summary</code>）'}</p>
  </div>` : ''}
  <div class="tags">${tagList.map((t) => `<span>${escapeHtml(t)}</span>`).join('')}<time>${meta.date || ''}</time></div>
  <div class="phone" id="article">
    ${html}
  </div>
</div>
<script>
const fragment = document.getElementById('article');
document.getElementById('copy').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  try {
    const html = fragment.innerHTML;
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([fragment.innerText], { type: 'text/plain' })
    })]);
    btn.textContent = '✅ 已复制，去粘贴';
  } catch (err) {
    // 剪贴板 API 被拒时，退回到选区复制
    const r = document.createRange();
    r.selectNodeContents(fragment);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    const ok = document.execCommand('copy');
    s.removeAllRanges();
    btn.textContent = ok ? '✅ 已复制（选区模式）' : '❌ 复制失败，手动选中吧';
  }
  setTimeout(() => { btn.textContent = '复制正文'; }, 2200);
});
const sumText = document.getElementById('summary-text');
if (sumText) {
  document.getElementById('sum-count').textContent = sumText.textContent.length;
  document.getElementById('copy-summary').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(sumText.textContent);
      btn.textContent = '✅ 已复制，去粘贴';
    } catch { btn.textContent = '❌ 失败'; }
    setTimeout(() => { btn.textContent = '复制摘要'; }, 2200);
  });
}
document.getElementById('copy-md').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  try {
    await navigator.clipboard.writeText(${JSON.stringify(content)});
    btn.textContent = '✅ Markdown 已复制';
  } catch { btn.textContent = '❌ 失败'; }
  setTimeout(() => { btn.textContent = '复制 Markdown'; }, 2200);
});
</script>
</body>
</html>`

fs.writeFileSync(path.join(postDir, 'wechat.html'), preview, 'utf8')

// ── 控制台反馈 ──────────────────────────────────────────────────────────────
const words = content.replace(/<!--[\s\S]*?-->/g, '').replace(/[#*`>\-\s]/g, '').length
const codeBlocks = (content.match(/^```/gm) || []).length / 2

console.log('✅ 已生成')
console.log(`   预览页    ${path.relative(ROOT, path.join(postDir, 'wechat.html')).replaceAll('\\', '/')}`)
console.log(`   正文片段  ${path.relative(ROOT, path.join(postDir, 'wechat.fragment.html')).replaceAll('\\', '/')}`)
console.log('')
console.log(`   正文约 ${words} 字 · 代码块 ${codeBlocks} 个`)

if (words < 800) console.log('   ⚠️  不到 800 字，公众号上会显得很薄')
if (words > 4000) console.log('   ⚠️  超过 4000 字，建议拆成两篇')
if (codeBlocks > 4) console.log('   ⚠️  代码块超过 4 个，读者容易划走')

if (collectedLinks.length) {
  console.log('')
  console.log(`   抽出了 ${collectedLinks.length} 个外链（公众号点不开），已放到文末纯文本区：`)
  for (const l of collectedLinks) console.log('     · ' + l)
}

if (imgList.length) {
  console.log('')
  console.log(`   ⚠️  ${imgList.length} 张本地图片需要手动上传到公众号：`)
  for (const i of imgList) console.log('     · ' + i)
}

console.log('')
console.log('打开预览：')
console.log(`   start "" "${path.relative(ROOT, path.join(postDir, 'wechat.html')).replaceAll('\\', '/')}"`)

if (shouldOpen) {
  const { exec } = await import('node:child_process')
  exec(`start "" "${path.join(postDir, 'wechat.html')}"`)
}
