#!/usr/bin/env node
/**
 * 将已生成的公众号 HTML 上传为草稿。
 *
 * 默认和 --check 只验证 API 凭证；只有明确传 --draft 才会上传素材、创建草稿。
 *
 * 用法：
 *   node scripts/wechat-draft.mjs --check
 *   node scripts/wechat-draft.mjs <post-dir> --cover assets/cover.png --draft
 *   node scripts/wechat-draft.mjs <post-dir> --draft  # 使用 frontmatter 的 cover
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const API_BASE = 'https://api.weixin.qq.com/cgi-bin'
const argv = process.argv.slice(2)
const flags = new Set(argv.filter((item) => item.startsWith('--')))
const positional = argv.filter((item) => !item.startsWith('--'))

function option (name) {
  const index = argv.indexOf(name)
  return index === -1 ? undefined : argv[index + 1]
}

function fail (message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function loadEnv () {
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) fail('找不到 .env。请复制 .env.example 为 .env 后填写凭证。')

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2]
  }

  const appId = process.env.WECHAT_APP_ID
  const appSecret = process.env.WECHAT_APP_SECRET
  if (!appId || !appSecret) fail('.env 需要同时设置 WECHAT_APP_ID 和 WECHAT_APP_SECRET。')
  return { appId, appSecret }
}

async function wechatJson (url, options) {
  const response = await fetch(url, options)
  let body
  try {
    body = await response.json()
  } catch {
    fail(`微信接口返回了无法解析的响应（HTTP ${response.status}）。`)
  }
  if (!response.ok || body.errcode) {
    const extra = body.errcode === 40164
      ? ' 请到公众号后台「设置与开发 → 基本配置 → IP 白名单」添加本机的公网出口 IP。'
      : ''
    fail(`微信接口失败：${body.errcode ?? response.status} ${body.errmsg ?? '未知错误'}。${extra}`)
  }
  return body
}

async function getAccessToken (credentials) {
  const query = new URLSearchParams({
    grant_type: 'client_credential',
    appid: credentials.appId,
    secret: credentials.appSecret
  })
  const result = await wechatJson(`${API_BASE}/token?${query}`)
  if (!result.access_token) fail('微信接口没有返回 access_token。')
  return result.access_token
}

function parseFrontmatter (raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const meta = {}
  if (!match) return meta
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
    if (!pair) continue
    meta[pair[1]] = pair[2].trim().replace(/^"(.*)"$/, '$1')
  }
  return meta
}

function mimeType (filePath) {
  const extension = path.extname(filePath).toLowerCase()
  return ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' })[extension] || 'application/octet-stream'
}

async function uploadFile (token, endpoint, filePath, query = {}) {
  if (!fs.existsSync(filePath)) fail(`找不到图片：${filePath}`)
  const params = new URLSearchParams({ access_token: token, ...query })
  const form = new FormData()
  const bytes = fs.readFileSync(filePath)
  form.set('media', new Blob([bytes], { type: mimeType(filePath) }), path.basename(filePath))
  return wechatJson(`${API_BASE}${endpoint}?${params}`, { method: 'POST', body: form })
}

async function uploadContentImages (token, html, postDir) {
  const imagePattern = /(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi
  const matches = [...html.matchAll(imagePattern)]
  let offset = 0
  for (const match of matches) {
    const originalSrc = match[2]
    if (/^https?:\/\//i.test(originalSrc) || originalSrc.startsWith('data:')) continue
    const imagePath = path.resolve(postDir, originalSrc)
    const uploaded = await uploadFile(token, '/media/uploadimg', imagePath)
    if (!uploaded.url) fail(`正文图片上传成功，但微信没有返回 URL：${originalSrc}`)
    const start = match.index + match[1].length + offset
    html = html.slice(0, start) + uploaded.url + html.slice(start + originalSrc.length)
    offset += uploaded.url.length - originalSrc.length
    console.log(`   正文图片已上传：${originalSrc}`)
  }
  return html
}

async function main () {
  const credentials = loadEnv()
  const token = await getAccessToken(credentials)

  if (flags.has('--check')) {
    console.log('✅ 微信公众号 API 凭证有效；已成功获取 access_token。')
    return
  }

  const postArgument = positional[0]
  if (!postArgument) fail('用法：node scripts/wechat-draft.mjs <post-dir> --draft [--cover <图片路径>]')
  if (!flags.has('--draft')) fail('授权有效。创建草稿是外部操作，请确认后重新执行并明确加上 --draft。')

  const postDir = path.resolve(ROOT, postArgument)
  const markdownPath = path.join(postDir, 'index.md')
  const fragmentPath = path.join(postDir, 'wechat.fragment.html')
  if (!fs.existsSync(markdownPath)) fail(`找不到文章：${markdownPath}`)
  if (!fs.existsSync(fragmentPath)) fail('找不到 wechat.fragment.html。请先运行 node scripts/md2wechat.mjs <post-dir>。')

  const meta = parseFrontmatter(fs.readFileSync(markdownPath, 'utf8'))
  if (!meta.title) fail('文章 frontmatter 缺少 title。')
  const coverOption = option('--cover') || meta.cover
  if (!coverOption) fail('缺少封面。请在 frontmatter 填 cover，或传 --cover assets/cover.png。')
  const coverPath = path.resolve(postDir, coverOption)
  const cover = await uploadFile(token, '/material/add_material', coverPath, { type: 'image' })
  if (!cover.media_id) fail('封面上传成功，但微信没有返回 media_id。')
  console.log(`   封面已上传：${coverOption}`)

  const content = await uploadContentImages(token, fs.readFileSync(fragmentPath, 'utf8'), postDir)
  const article = {
    title: meta.title,
    author: option('--author') || '',
    digest: meta.wechat_summary || meta.summary || '',
    content,
    content_source_url: option('--source-url') || '',
    thumb_media_id: cover.media_id,
    need_open_comment: 0,
    only_fans_can_comment: 0
  }
  const draft = await wechatJson(`${API_BASE}/draft/add?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ articles: [article] })
  })
  console.log('✅ 已创建公众号草稿。')
  console.log(`   media_id: ${draft.media_id}`)
  console.log('   请到公众号后台「内容与互动 → 草稿箱」检查标题、图片与排版，再手动群发。')
}

main().catch((error) => fail(error.message || String(error)))
