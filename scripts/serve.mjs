#!/usr/bin/env node
/**
 * 本地静态服务器：给 /illustrate 配图流水线用（Playwright 截图前先起这个）。
 *
 *   node scripts/serve.mjs [--port 8741]
 *
 * 根目录 = 仓库根，这样模板引用背景图写 /templates/illustrate/bg-card.png，
 * 临时填充稿放 tmp/ 下也能被同一台服务器读到。
 */
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.argv[process.argv.indexOf('--port') + 1]) || 8741

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.ico': 'image/x-icon'
}

http.createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '')
  const file = path.normalize(path.join(ROOT, rel || 'index.html'))
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end() }
  try {
    const data = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404); res.end('not found')
  }
}).listen(port, () => console.log(`serving ${ROOT} at http://localhost:${port}`))
