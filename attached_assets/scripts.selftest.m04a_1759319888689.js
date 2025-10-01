// /scripts/selftest.js — m04a: force USE_MOCK_AUTH=false in spawned server env
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const MOD = (process.env.MODULE_NUM || '00').toString().padStart(2, '0')
const PORT = '5050'
const base = `http://127.0.0.1:${PORT}/api/v1`

const logsDir = path.resolve(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

const logFileName = MOD === '04' ? 'mod-04.log' : `selftest.mod-${MOD}.log`
const jsonFileName = `selftest.mod-${MOD}.json`
const logPath  = path.join(logsDir, logFileName)
const jsonPath = path.join(logsDir, jsonFileName)

const log = (line)=> fs.appendFileSync(logPath, line + '\n')
function wait(ms){ return new Promise(r=>setTimeout(r, ms)) }

async function run(){
  const result = { checks: [], passed: false, ts: new Date().toISOString(), module: MOD }
  log(`[selftest m${MOD}] starting server...`)

  const distIndex = path.resolve(process.cwd(), 'dist', 'index.js')
  if (!fs.existsSync(distIndex)){
    log('[selftest] dist/index.js not found. Running build first...')
    await new Promise((resolve)=> {
      const build = spawn('npm', ['run', 'build'], { stdio: 'inherit' })
      build.on('close', resolve)
    })
  }

  const srv = spawn('node', ['dist/index.js'], {
    env: { ...process.env, PORT, NODE_ENV: 'test', USE_MOCK_AUTH: 'false' }
  })
  srv.stdout.on('data', d=> log(String(d).trim()))
  srv.stderr.on('data', d=> log(String(d).trim()))
  await wait(1200)

  // Health
  try {
    const r = await fetch(`${base}/health`)
    const j = await r.json()
    const ok = r.status === 200 && j?.status === 'ok'
    result.checks.push({ name: 'api.health', ok })
  } catch (e){ result.checks.push({ name: 'api.health', ok: false, error: String(e) }) }

  // Module 4: signup -> login -> me
  let token = null
  const email = `u_${Date.now()}@example.com`
  const password = 'Passw0rd!'
  try {
    const r = await fetch(`${base}/auth/signup`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const ok = r.status === 201
    result.checks.push({ name: 'auth.signup', ok, status: r.status })
  } catch (e){ result.checks.push({ name: 'auth.signup', ok: false, error: String(e) }) }

  try {
    const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })
    const j = await r.json().catch(()=> ({}))
    token = j?.token
    const ok = r.status === 200 && !!token
    result.checks.push({ name: 'auth.login', ok, status: r.status })
  } catch (e){ result.checks.push({ name: 'auth.login', ok: false, error: String(e) }) }

  try {
    const r = await fetch(`${base}/auth/me`, { headers: token ? { authorization: 'Bearer ' + token } : {} })
    const ok = token ? r.status === 200 : (r.status === 401 || r.status === 404)
    result.checks.push({ name: 'auth.me', ok, status: r.status })
  } catch (e){ result.checks.push({ name: 'auth.me', ok: false, error: String(e) }) }

  // Protected routes
  try {
    const r = await fetch(`${base}/protected/ping`)
    const ok = r.status === 401 || r.status === 404
    result.checks.push({ name: 'protected.unauth', ok, status: r.status })
  } catch (e){ result.checks.push({ name: 'protected.unauth', ok: false, error: String(e) }) }

  try {
    const r = await fetch(`${base}/protected/ping`, { headers: token ? { authorization: 'Bearer ' + token } : {} })
    const ok = token ? r.status === 200 : (r.status === 401 || r.status === 404)
    result.checks.push({ name: 'protected.auth', ok, status: r.status })
  } catch (e){ result.checks.push({ name: 'protected.auth', ok: false, error: String(e) }) }

  // Client build (root-level)
  log('[selftest] building client...')
  const bld = spawn('npm', ['run', 'build'])
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
