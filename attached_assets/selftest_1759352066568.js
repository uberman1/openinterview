// scripts/selftest.js — unified runner for Modules 00–06 (includes Module 05 & 06 stubs)
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const MOD = (process.env.MODULE_NUM || '00').toString().padStart(2, '0')
const PORT = String(process.env.PORT || 5050)
const base = `http://127.0.0.1:${PORT}/api/v1`

const logsDir = path.resolve(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

const logFileName = MOD === '04' ? 'mod-04.log' : (MOD === '05' ? 'mod-05.log' : (MOD === '06' ? 'mod-06.log' : `selftest.mod-${MOD}.log`))
const jsonFileName = `selftest.mod-${MOD}.json`
const logPath  = path.join(logsDir, logFileName)
const jsonPath = path.join(logsDir, jsonFileName)

const log = (line)=> fs.appendFileSync(logPath, line + '\n')
const wait = (ms)=> new Promise(r=>setTimeout(r, ms))

async function req(url, init){
  const r = await fetch(url, init)
  let body = null
  try { body = await r.clone().json() } catch {}
  return { r, body }
}

async function startServer(){
  log(`[selftest m${MOD}] starting server...`)
  // build if missing
  const distIndex = path.resolve(process.cwd(), 'dist', 'index.js')
  if (!fs.existsSync(distIndex)){
    log('[selftest] dist/index.js not found. Running build first...')
    await new Promise((resolve)=> {
      const build = spawn('npm', ['run', 'build'], { stdio: 'inherit' })
      build.on('close', resolve)
    })
  }
  const env = { ...process.env, PORT, NODE_ENV: 'test' }
  if (MOD === '04') env.USE_MOCK_AUTH = 'false'
  const srv = spawn('node', ['dist/index.js'], { env })
  srv.stdout.on('data', d=> log(String(d).trim()))
  srv.stderr.on('data', d=> log(String(d).trim()))
  await wait(1200)
  return srv
}

async function runM00to04(result){
  // health
  try {
    const { r, body } = await req(`${base}/health`)
    result.checks.push({ name: 'api.health', ok: r.status===200 && body?.status==='ok', status: r.status })
  } catch (e){ result.checks.push({ name: 'api.health', ok: false, error: String(e) }) }

  // auth flow (optional if implemented)
  try {
    const email = `u_${Date.now()}@example.com`, password = 'Passw0rd!'
    let resp = await req(`${base}/auth/signup`, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ email, password }) })
    if (resp?.r) result.checks.push({ name: 'auth.signup', ok: [200,201,409].includes(resp.r.status), status: resp.r.status })
    resp = await req(`${base}/auth/login`, { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ email, password }) })
    const token = resp.body?.token
    result.checks.push({ name: 'auth.login', ok: resp.r.status===200 && !!token, status: resp.r.status })
    let m = await req(`${base}/auth/me`, { headers: token ? { authorization: 'Bearer '+token } : {} })
    result.checks.push({ name: 'auth.me', ok: token ? m.r.status===200 : m.r.status===401, status: m.r.status })
    let p1 = await req(`${base}/protected/ping`)
    result.checks.push({ name: 'protected.unauth', ok: [401,404].includes(p1.r.status), status: p1.r.status })
    let p2 = await req(`${base}/protected/ping`, { headers: { authorization: 'Bearer '+token } })
    result.checks.push({ name: 'protected.auth', ok: p2.r.status===200, status: p2.r.status })
  } catch (e){ ['auth.signup','auth.login','auth.me','protected.unauth','protected.auth'].forEach(n=>result.checks.push({ name:n, ok:false, error:String(e) })) }
}

async function runM05(result){
  // Upload create
  try {
    const fd = new FormData()
    const data = new Blob(["hello world"], { type: 'application/pdf' })
    fd.append('file', data, 'hello.pdf')
    const { r, body } = await req(`${base}/uploads`, { method:'POST', body: fd })
    const id = body?.upload?.id
    result.checks.push({ name: 'upload.create', ok: r.status===201 && !!id, status: r.status })
    // Meta
    const m = await req(`${base}/uploads/${id}/meta`)
    result.checks.push({ name: 'upload.meta', ok: m.r.status===200 && m.body?.upload?.id===id, status: m.r.status })
    // Delete
    const d = await req(`${base}/uploads/${id}`, { method:'DELETE' })
    result.checks.push({ name: 'upload.delete', ok: d.r.status===204, status: d.r.status })
    // Verify 404 after delete
    const v = await req(`${base}/uploads/${id}/meta`)
    result.checks.push({ name: 'upload.delete_verify', ok: v.r.status===404, status: v.r.status })
  } catch(e){
    ['upload.create','upload.meta','upload.delete','upload.delete_verify'].forEach(n=>result.checks.push({ name:n, ok:false, error:String(e) }))
  }
}

async function runM06(result){
  // Payments mock-first flow
  try {
    // checkout
    const userId = 'demo-user', planId = 'pro'
    let resp = await req(`${base}/payments/checkout`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ userId, planId }) })
    const sessionId = resp.body?.sessionId
    result.checks.push({ name: 'payments.checkout', ok: resp.r.status===200 && !!sessionId, status: resp.r.status })
    // session open
    let ses = await req(`${base}/payments/session/${sessionId}`)
    result.checks.push({ name: 'payments.session.open', ok: ses.r.status===200 && ses.body?.status==='open', status: ses.r.status })
    // webhook (simulate payment success)
    let wb = await req(`${base}/payments/webhook`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ sessionId, event:'checkout.session.completed' }) })
    result.checks.push({ name: 'payments.webhook.paid', ok: wb.r.status===204, status: wb.r.status })
    // session paid
    ses = await req(`${base}/payments/session/${sessionId}`)
    result.checks.push({ name: 'payments.session.paid', ok: ses.r.status===200 && ses.body?.status==='paid', status: ses.r.status })
  } catch(e){
    ['payments.checkout','payments.session.open','payments.webhook.paid','payments.session.paid'].forEach(n=>result.checks.push({ name:n, ok:false, error:String(e) }))
  }
}

async function run(){
  const result = { checks: [], passed: false, ts: new Date().toISOString(), module: MOD }
  const srv = await startServer()

  if (MOD <= '04') await runM00to04(result)
  if (MOD === '05') await runM05(result)
  if (MOD === '06') await runM06(result)

  // client build at end so earlier routes can run even if client has warnings
  log('[selftest] building client...')
  const bld = spawn('npm', ['run', 'build'])
  bld.stdout && bld.stdout.on('data', d=> log(String(d).trim()))
  bld.stderr && bld.stderr.on('data', d=> log(String(d).trim()))
  await new Promise((resolve)=> bld.on('close', resolve))
  result.checks.push({ name: 'client.build', ok: bld.exitCode===0 })

  srv.kill('SIGINT')
  result.passed = result.checks.every(c=>c.ok)
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2))
  console.log(result.passed ? 'ALL CHECKS PASSED' : 'CHECKS FAILED, see logs/selftest.*')
  process.exit(result.passed ? 0 : 1)
}

run()
