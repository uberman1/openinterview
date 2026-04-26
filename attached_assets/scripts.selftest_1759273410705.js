// /scripts/selftest.js — Module-aware + Node 20 compatible (runs compiled dist/index.js)
// Module 3 writes text log to logs/mod-03a.log

import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const MOD = (process.env.MODULE_NUM || '00').toString().padStart(2, '0')
const PORT = process.env.PORT || '5050'
const base = `http://127.0.0.1:${PORT}/api/v1`

const logsDir = path.resolve(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

// Custom text log filename for Module 03
const logFileName = MOD === '03' ? 'mod-03a.log' : `selftest.mod-${MOD}.log`
const jsonFileName = `selftest.mod-${MOD}.json`

const logPath  = path.join(logsDir, logFileName)
const jsonPath = path.join(logsDir, jsonFileName)

const log = (line)=> fs.appendFileSync(logPath, line + '\n')
function wait(ms){ return new Promise(r=>setTimeout(r, ms)) }

async function run(){
  const result = { checks: [], passed: false, ts: new Date().toISOString(), module: MOD }
  log(`[selftest m${MOD}] starting server...`)

  // Ensure dist exists (server/index.ts should be built into dist/index.js)
  const distIndex = path.resolve(process.cwd(), 'dist', 'index.js')
  if (!fs.existsSync(distIndex)){
    log('[selftest] dist/index.js not found. Running build first...')
    await new Promise((resolve)=> {
      const build = spawn('npm', ['run', 'build'], { stdio: 'inherit' })
      build.on('close', resolve)
    })
  }

  // Start compiled server (avoid tsx loader issues on Node 20+)
  const srv = spawn('node', ['dist/index.js'], { env: { ...process.env, PORT, NODE_ENV: 'test' } })
  srv.stdout.on('data', d=> log(String(d).trim()))
  srv.stderr.on('data', d=> log(String(d).trim()))
  await wait(1000)

  // 1) Health
  try {
    const r = await fetch(`${base}/health`)
    const j = await r.json()
    const ok = j && j.status === 'ok'
    result.checks.push({ name: 'api.health', ok, detail: j })
  } catch (e){ result.checks.push({ name: 'api.health', ok: false, error: String(e) }) }

  // 2) Auth: login (if present)
  let token = null
  try {
    const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    if (r.ok){
      const j = await r.json()
      token = j.token
      const ok = r.status === 200 && !!token
      result.checks.push({ name: 'auth.login', ok })
    } else {
      result.checks.push({ name: 'auth.login', ok: false, status: r.status })
    }
  } catch (e){ result.checks.push({ name: 'auth.login', ok: false, error: String(e) }) }

  // 3) Auth: me (if token obtained)
  try {
    const headers = token ? { authorization: 'Bearer ' + token } : {}
    const r = await fetch(`${base}/auth/me`, { headers })
    const ok = token ? r.status === 200 : r.status === 401 || r.status === 404
    result.checks.push({ name: 'auth.me', ok, status: r.status })
  } catch (e){ result.checks.push({ name: 'auth.me', ok: false, error: String(e) }) }

  // 4) Protected route: unauth should fail (if present)
  try {
    const r = await fetch(`${base}/protected/ping`)
    const ok = r.status === 401 || r.status === 404
    result.checks.push({ name: 'protected.unauth', ok, status: r.status })
  } catch (e){ result.checks.push({ name: 'protected.unauth', ok: false, error: String(e) }) }

  // 5) Protected route: auth should pass (if present)
  try {
    const headers = token ? { authorization: 'Bearer ' + token } : {}
    const r = await fetch(`${base}/protected/ping`, { headers })
    const ok = token ? r.status === 200 : r.status === 401 || r.status === 404
    result.checks.push({ name: 'protected.auth', ok, status: r.status })
  } catch (e){ result.checks.push({ name: 'protected.auth', ok: false, error: String(e) }) }

  // 6) Client Build (still run to verify UI compiles)
  log('[selftest] building client...')
  const bld = spawn('npm', ['--prefix', 'client', 'run', 'build'])
  bld.stdout && bld.stdout.on('data', d=> log(String(d).trim()))
  bld.stderr && bld.stderr.on('data', d=> log(String(d).trim()))
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
