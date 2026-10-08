#!/usr/bin/env node
/**
 * 建当天文章的文件夹。
 *
 *   node scripts/new-post.mjs "标题" [--date 2026-10-08] [--tags a,b] [--force]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** 本地日期，不要用 toISOString（那是 UTC，晚上会差一天） */
function localDate (d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * 标题转目录名：只保留中文、字母、数字，其余一律变成连字符。
 * 比「黑名单剔除非法字符」稳，逗号、括号、斜杠都不会漏进来。
 */
function slugify (title) {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{Script=Han}\p{L}\p{N}]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '')
  return s || 'untitled'
}

function parseArgs (argv) {
  const out = { title: '', date: localDate(), tags: '', force: false }
  const rest = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--date') out.date = argv[++i]
    else if (a === '--force') out.force = true
    else if (a === '--tags') {
      // 一直吃到下一个选项为止，这样 --tags Claude Code,工具 也算数
      const vals = []
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) vals.push(argv[++i])
      out.tags = vals.join(' ')
    } else if (!a.startsWith('--')) rest.push(a)
  }
  out.title = rest.join(' ').trim()
  return out
}

const { title, date, tags, force } = parseArgs(process.argv.slice(2))

if (!title) {
  console.error('用法: node scripts/new-post.mjs "文章标题" [--date 2026-10-08] [--tags 工具,折腾]')
  process.exit(1)
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error(`日期格式不对: ${date}，应该是 YYYY-MM-DD`)
  process.exit(1)
}

const year = date.slice(0, 4)
const slug = slugify(title)
const postDir = path.join(ROOT, 'posts', year, `${date}-${slug}`)

if (fs.existsSync(postDir) && !force) {
  console.error(`已经存在: ${path.relative(ROOT, postDir)}`)
  console.error('要覆盖用 --force，或者换个标题。')
  process.exit(1)
}

// 同一天第二篇以上，加 -2 / -3 后缀，避免互相覆盖
let dir = postDir
let n = 2
while (fs.existsSync(path.join(dir, 'index.md')) && !force) {
  dir = `${postDir}-${n++}`
}

fs.mkdirSync(path.join(dir, 'assets'), { recursive: true })

const tpl = fs.readFileSync(path.join(ROOT, 'templates', 'post-template.md'), 'utf8')
const body = tpl
  .replaceAll('{{TITLE}}', title.replace(/"/g, '\\"'))
  .replaceAll('{{DATE}}', date)
  .replaceAll('{{TAGS}}', tags)

fs.writeFileSync(path.join(dir, 'index.md'), body, 'utf8')

const rel = path.relative(ROOT, dir).replaceAll('\\', '/')
console.log('✅ 已创建')
console.log('   ' + rel)
console.log('   ' + rel + '/index.md')
console.log('   ' + rel + '/assets/')
console.log('')
console.log('接下来：')
console.log(`   写正文  →  ${rel}/index.md`)
console.log(`   看排版  →  node scripts/md2wechat.mjs "${rel}"`)
