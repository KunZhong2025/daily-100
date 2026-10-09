#!/usr/bin/env node
/**
 * 扫全仓库的文章，重写 README.md 里的进度块和索引块。
 *
 *   node scripts/build-index.mjs
 *
 * 只动 <!-- PROGRESS:START --> ... <!-- PROGRESS:END --> 之间的内容，
 * 别的手写段落原样保留。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TARGET_DAYS = 100

const p2 = (n) => String(n).padStart(2, '0')
const fmt = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`

/** 简单 frontmatter 解析，够用就行 */
function parseFrontmatter (text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return {}
  const out = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
    if (!kv) continue
    let v = kv[2].trim()
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    }
    out[kv[1]] = v
  }
  return out
}

function walk (dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else if (entry.name === 'index.md') acc.push(full)
  }
  return acc
}

const posts = walk(path.join(ROOT, 'posts')).map((file) => {
  const text = fs.readFileSync(file, 'utf8')
  const meta = parseFrontmatter(text)
  const dir = path.dirname(file)
  const body = text.replace(/^---[\s\S]*?---\r?\n?/, '').replace(/<!--[\s\S]*?-->/g, '')
  return {
    file,
    dir,
    rel: path.relative(ROOT, dir).replaceAll('\\', '/'),
    title: meta.title || path.basename(dir),
    date: meta.date || (path.basename(dir).match(/^\d{4}-\d{2}-\d{2}/) || [''])[0],
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    summary: meta.summary || '',
    status: meta.status || 'draft',
    wechat: meta.wechat || 'pending',
    words: body.replace(/[#*`>\-\s]|!\[.*?\]\(.*?\)/g, '').length
  }
})

posts.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

// ── 统计 ────────────────────────────────────────────────────────────────────
const done = posts.filter((x) => x.status === 'done')
const dates = [...new Set(done.map((x) => x.date).filter(Boolean))].sort()
const startDate = dates[0] || fmt(new Date())
const lastDate = dates[dates.length - 1] || '—'
const totalWords = posts.reduce((s, x) => s + x.words, 0)

// 连续天数：从最近一篇往前数，允许「今天还没写」而不断掉
let streak = 0
if (dates.length) {
  const day = (s) => new Date(s + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const last = day(dates[dates.length - 1])
  const gapToToday = Math.round((today - last) / 86400000)
  if (gapToToday <= 1) {
    streak = 1
    for (let i = dates.length - 1; i > 0; i--) {
      const diff = Math.round((day(dates[i]) - day(dates[i - 1])) / 86400000)
      if (diff === 1) streak++
      else break
    }
  }
}

const pct = Math.min(100, Math.round((done.length / TARGET_DAYS) * 100))
const filled = Math.round(pct / 4) // 25 格

// ── 进度块 ──────────────────────────────────────────────────────────────────
const progress = `| 指标 | 数值 |
| --- | --- |
| 已完成 | **${done.length} / ${TARGET_DAYS}** 篇 |
| 草稿 | ${posts.length - done.length} 篇 |
| 当前连续 | ${streak} 天 |
| 起始日期 | ${startDate} |
| 最近更新 | ${lastDate} |
| 累计字数 | 约 ${totalWords.toLocaleString('en-US')} 字 |

\`${'█'.repeat(filled)}${'░'.repeat(25 - filled)}\` ${pct}%`

// ── 索引块 ──────────────────────────────────────────────────────────────────
let index = ''
if (!posts.length) {
  index = '_还没有文章。第一篇从 `/daily` 开始。_'
} else {
  const groups = new Map()
  for (const post of posts) {
    const key = post.date.slice(0, 7)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(post)
  }
  const blocks = []
  for (const [key, list] of groups) {
    const [y, m] = key.split('-')
    const rows = list.map((post) => {
      const day = post.date.slice(8, 10) || '??'
      const tags = post.tags.length ? ' ' + post.tags.map((t) => `\`${t}\``).join(' ') : ''
      const mark = post.status === 'done' ? '' : ' _(草稿)_'
      const wx = post.wechat === 'published' ? ' · 公众号已发' : ''
      const sum = post.summary ? ` — ${post.summary}` : ''
      const w = post.words ? ` · ${post.words} 字` : ''
      return `- **${day}** [${post.title}](${post.rel}/index.md)${mark}${sum}${tags}${wx}${w}`
    }).join('\n')
    blocks.push(`**${y} 年 ${Number(m)} 月**\n\n${rows}`)
  }
  index = blocks.join('\n\n')
}

// ── 写回 README ─────────────────────────────────────────────────────────────
const readmePath = path.join(ROOT, 'README.md')
if (!fs.existsSync(readmePath)) {
  console.error('找不到 README.md')
  process.exit(1)
}

let readme = fs.readFileSync(readmePath, 'utf8')
const before = readme

readme = readme.replace(
  /(<!-- PROGRESS:START -->)[\s\S]*?(<!-- PROGRESS:END -->)/,
  `$1\n${progress}\n$2`
)
readme = readme.replace(
  /(<!-- POSTS:START -->)[\s\S]*?(<!-- POSTS:END -->)/,
  `$1\n${index}\n$2`
)

if (readme === before) {
  console.log('⚠️  README 里没找到标记块，没做修改')
  console.log('   需要包含：<!-- PROGRESS:START --> ... <!-- PROGRESS:END -->')
  console.log('            <!-- POSTS:START --> ... <!-- POSTS:END -->')
  process.exit(1)
}

fs.writeFileSync(readmePath, readme, 'utf8')

console.log('✅ README 已更新')
console.log('')
console.log(`   文章总数   ${posts.length}（已完成 ${done.length}）`)
console.log(`   连续天数   ${streak}`)
console.log(`   累计字数   约 ${totalWords} 字`)
console.log(`   目标进度   ${done.length} / ${TARGET_DAYS}  (${pct}%)`)

if (posts.length !== done.length) {
  const drafts = posts.filter((x) => x.status !== 'done')
  console.log('')
  console.log(`   ℹ️  还有 ${drafts.length} 篇是草稿，写完记得把 index.md 里的 status 改成 done：`)
  for (const d of drafts.slice(0, 5)) console.log('     · ' + d.rel)
  if (drafts.length > 5) console.log(`     …… 还有 ${drafts.length - 5} 篇`)
}
