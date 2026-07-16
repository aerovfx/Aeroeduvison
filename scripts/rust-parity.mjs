#!/usr/bin/env node
/**
 * rust-parity.mjs — Kiểm tra TƯƠNG ĐƯƠNG (parity) giữa backend Node (server.cjs)
 * và backend Rust (aero-backend gateway) trong quá trình di trú sang Rust.
 *
 * Với mỗi route trong manifest, gọi cùng request lên CẢ HAI backend rồi so sánh
 * status code + JSON body (đã chuẩn hoá các field bất định như id/thời gian).
 * Đây là "cổng chấp nhận" cho từng nhóm route: chỉ tắt handler Node khi Rust khớp.
 *
 * Dùng:
 *   NODE_BASE=http://localhost:8090 \
 *   RUST_BASE=http://localhost:8095 \
 *   node scripts/rust-parity.mjs [manifest.json] [--family teacher]
 *
 * Manifest mặc định: scripts/parity-routes.json
 * Mỗi route: { family, method, path, auth?: "teacher"|"student"|"admin"|false,
 *              body?, query?, expectStatus?, ignore?: ["path.to.field", ...] }
 *
 * Tài khoản đăng nhập lấy token (khớp DB local, xem run-local-backend.sh):
 *   teacher@local.test / student@local.test / admin@local.test — Test@1234
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const NODE_BASE = process.env.NODE_BASE || 'http://localhost:8090'
const RUST_BASE = process.env.RUST_BASE || 'http://localhost:8095'
const PASSWORD = process.env.PARITY_PASSWORD || 'Test@1234'
const CREDS = {
  teacher: 'teacher@local.test',
  student: 'student@local.test',
  admin: 'admin@local.test',
}

const args = process.argv.slice(2)
const familyFilter = (() => {
  const i = args.indexOf('--family')
  return i >= 0 ? args[i + 1] : null
})()
const manifestPath = resolve(
  args.find((a) => a.endsWith('.json')) || join(__dirname, 'parity-routes.json')
)

/** Đăng nhập lấy accessToken từ một backend cụ thể. */
async function login(base, email) {
  try {
    const r = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    })
    if (!r.ok) return null
    const j = await r.json()
    return j?.tokens?.accessToken || j?.accessToken || null
  } catch {
    return null
  }
}

/** Chuẩn hoá JSON: xoá field bất định + field trong `ignore` để so sánh ổn định. */
const VOLATILE = new Set([
  'id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'lastLoginAt',
  'accessToken', 'refreshToken', 'token', 'timestamp', 'ts', 'now', 'iat', 'exp',
])
function normalize(v, ignore = [], path = '') {
  if (Array.isArray(v)) return v.map((x, i) => normalize(x, ignore, `${path}[]`))
  if (v && typeof v === 'object') {
    const out = {}
    for (const k of Object.keys(v).sort()) {
      const p = path ? `${path}.${k}` : k
      if (VOLATILE.has(k) || ignore.includes(p)) { out[k] = '<*>'; continue }
      out[k] = normalize(v[k], ignore, p)
    }
    return out
  }
  return v
}

async function callOne(base, token, route) {
  const url = new URL(base + route.path)
  for (const [k, val] of Object.entries(route.query || {})) url.searchParams.set(k, val)
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const init = { method: route.method || 'GET', headers }
  if (route.body !== undefined) init.body = JSON.stringify(route.body)
  try {
    const r = await fetch(url, init)
    const text = await r.text()
    let json
    try { json = JSON.parse(text) } catch { json = { __raw: text.slice(0, 200) } }
    return { status: r.status, json }
  } catch (e) {
    return { status: 0, json: { __error: e.message } }
  }
}

function diffJson(a, b) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b)
  return sa === sb ? null : { node: sa.slice(0, 300), rust: sb.slice(0, 300) }
}

async function main() {
  const routes = JSON.parse(readFileSync(manifestPath, 'utf8'))
    .filter((r) => !familyFilter || r.family === familyFilter)
  if (!routes.length) { console.error('Không có route nào khớp filter.'); process.exit(2) }

  // Lấy token cho mỗi vai trò trên mỗi backend.
  const tokens = { node: {}, rust: {} }
  for (const role of Object.keys(CREDS)) {
    tokens.node[role] = await login(NODE_BASE, CREDS[role])
    tokens.rust[role] = await login(RUST_BASE, CREDS[role])
  }

  console.log(`Parity: NODE=${NODE_BASE}  RUST=${RUST_BASE}  routes=${routes.length}${familyFilter ? ` (family=${familyFilter})` : ''}\n`)

  let pass = 0, fail = 0
  const failures = []
  for (const route of routes) {
    const nTok = route.auth ? tokens.node[route.auth] : null
    const rTok = route.auth ? tokens.rust[route.auth] : null
    const [n, r] = await Promise.all([
      callOne(NODE_BASE, nTok, route),
      callOne(RUST_BASE, rTok, route),
    ])
    const statusOk = n.status === r.status
    const bodyOk = !diffJson(normalize(n.json, route.ignore), normalize(r.json, route.ignore))
    const ok = statusOk && bodyOk
    const tag = `${route.method || 'GET'} ${route.path}`
    if (ok) { pass++; console.log(`  ✅ ${tag}  [${n.status}]`) }
    else {
      fail++
      console.log(`  ❌ ${tag}  node=${n.status} rust=${r.status}${statusOk ? ' (body khác)' : ''}`)
      failures.push({ tag, node: n, rust: r })
    }
  }

  console.log(`\n${pass} khớp · ${fail} lệch`)
  if (fail) {
    console.log('\n─ Chi tiết lệch (rút gọn) ─')
    for (const f of failures.slice(0, 12)) {
      const d = diffJson(normalize(f.node.json, []), normalize(f.rust.json, []))
      console.log(`\n${f.tag}\n  node[${f.node.status}]: ${d ? d.node : JSON.stringify(f.node.json).slice(0,200)}\n  rust[${f.rust.status}]: ${d ? d.rust : JSON.stringify(f.rust.json).slice(0,200)}`)
    }
  }
  process.exit(fail ? 1 : 0)
}

main()
