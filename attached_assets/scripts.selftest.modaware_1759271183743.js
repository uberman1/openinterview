// /scripts/selftest.js (Module 3) — module-aware logging + auth checks
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const MOD = (process.env.MODULE_NUM || '03').toString().padStart(2, '0')
const PORT = process.env.PORT || '5050'
const base = `http://127.0.0.1:${PORT}/api/v1`

const logsDir = path.resolve(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
const logPath  = path.join(logsDir, `selftest.mod-${MOD}.log`)
const jsonPath = path.join(logsDir, `selftest.mod-${MOD}.json`)

const log = (line)=> fs.appendFileSync(logPath, line + '\n')
function wait(ms){ return new Promise(r=>setTimeout(r, ms)) }

async function run(){
  const result = { checks: [], passed: false, ts: new Date().toISOString(), module: MOD }
  log(`[selftest m${MOD}] starting server...`)
  const srv = spawn('node', ['server/server.js'], { env: { ...process.env, PORT, NODE_ENV: 'test' } })
  srv.stdout.on('data', d=> log(String(d).trim()))
  srv.stderr.on('data', d=> log(String(d).trim()))
  await wait(800)

  // 1) Health
  try {
    const r = await fetch(`${base}/health`)
    const j = await r.json()
    const ok = j && j.status === 'ok'
    result.checks.push({ name: 'api.health', ok, detail: j })
  } catch (e){ result.checks.push({ name: 'api.health', ok: false, error: String(e) }) }

  // 2) Auth: login
  let token = null
  try {
    const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    const j = await r.json()
    token = j.token
    const ok = r.status === 200 && !!token && j.user?.id === 'demo-user'
    result.checks.push({ name: 'auth.login', ok })
  } catch (e){ result.checks.push({ name: 'auth.login', ok: false, error: String(e) }) }

  // 3) Auth: me
  try {
    const r = await fetch(`${base}/auth/me`, { headers: { authorization: 'Bearer ' + token } })
    const j = await r.json()
    const ok = r.status === 200 && j?.user?.id === 'demo-user'
    result.checks.push({ name: 'auth.me', ok })
  } catch (e){ result.checks.push({ name: 'auth.me', ok: false, error: String(e) }) }

  // 4) Protected route: unauth should fail
  try {
    const r = await fetch(`${base}/protected/ping`)
    const ok = r.status === 401
    result.checks.push({ name: 'protected.unauth', ok, status: r.status })
  } catch (e){ result.checks.push({ name: 'protected.unauth', ok: false, error: String(e) }) }

  // 5) Protected route: auth should pass
  try {
    const r = await fetch(`${base}/protected/ping`, { headers: { authorization: 'Bearer ' + token } })
    const j = await r.json()
    const ok = r.status === 200 && j?.ok === true
    result.checks.push({ name: 'protected.auth', ok })
  } catch (e){ result.checks.push({ name: 'protected.auth', ok: false, error: String(e) }) }

  // 6) Client Build
  log('[selftest] building client...')
  const bld = spawn('npm', ['--prefix', 'client', 'run', 'build'])
  bld.stdout.on('data', d=> log(String(d).trim()))
  bld.stderr.on('data', d=> log(String(d).trim()))
  await new Promise((resolve)=> bld.on('close', resolve))
  const buildOk = bld.exitCode === 0
  result.checks.push({ name: 'client.build', ok: buildOk })

  srv.kill('SIGINT')
  result.passed = result.checks.every(c=>c.ok)
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2))
  console.log(result.passed ? 'ALL CHECKS PASSED' : 'CHECKS FAILED, see logs/selftest.*')
  process.exit(result.passed ? 0 : 1)
}

run()
