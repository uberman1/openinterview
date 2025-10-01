// scripts/selftest.js — unified with Module 10 checks
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const MOD = (process.env.MODULE_NUM || '00').toString().padStart(2, '0')
const PORT = String(process.env.PORT || 5050)
const base = `http://127.0.0.1:${PORT}/api/v1`

const logsDir = path.resolve(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

const logFileName = MOD === '10' ? 'mod-10.log' : `selftest.mod-${MOD}.log`
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
  const distIndex = path.resolve(process.cwd(), 'dist', 'index.js')
  if (!fs.existsSync(distIndex)){
    log('[selftest] dist/index.js not found. Running build first...')
    await new Promise((resolve)=> spawn('npm', ['run', 'build'], { stdio: 'inherit' }).on('close', resolve))
  }
  const env = { ...process.env, PORT, NODE_ENV: 'test' }
  const srv = spawn('node', ['dist/index.js'], { env })
  srv.stdout.on('data', d=> log(String(d).trim()))
  srv.stderr.on('data', d=> log(String(d).trim()))
  await wait(1200)
  return srv
}

async function runM10(result){
  // Non-admin user
  const emailUser = `m10_${Date.now()}@example.com`, password='Passw0rd!'
  await req(`${base}/auth/signup`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email: emailUser, password }) })
  const lUser = await req(`${base}/auth/login`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email: emailUser, password }) })
  const tokenUser = lUser.body?.token || null

  // Admin user
  const emailAdmin = 'admin@example.com'
  await req(`${base}/auth/signup`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email: emailAdmin, password }) })
  const lAdmin = await req(`${base}/auth/login`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ email: emailAdmin, password }) })
  const tokenAdmin = lAdmin.body?.token || null

  // Create a few entities to make stats non-zero
  for (let i=0;i<3;i++){
    await req(`${base}/profiles`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ name:`AdminP${i}`, email:`adminp${Date.now()}_${i}@example.com` }) })
  }
  // One scheduled and one completed interview
  const p = await req(`${base}/profiles`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ name:`Stat P`, email:`stats_${Date.now()}@example.com` }) })
  const pid = p.body?.profile?.id
  await req(`${base}/interviews`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ profileId: pid, title:'Sched', status:'scheduled', scheduledAt: new Date(Date.now()+3600_000).toISOString() }) })
  const iv = await req(`${base}/interviews`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ profileId: pid, title:'Done', status:'scheduled', scheduledAt: new Date().toISOString() }) })
  const ivId = iv.body?.interview?.id
  await req(`${base}/interviews/${ivId}`, { method:'PATCH', headers:{'content-type':'application/json'}, body: JSON.stringify({ status:'completed' }) })

  // Access checks
  const noAuth = await req(`${base}/admin/stats`)
  result.checks.push({ name:'admin.stats.unauth', ok:noAuth.r.status===401, status:noAuth.r.status })

  const asUser = await req(`${base}/admin/stats`, { headers:{ authorization:'Bearer '+tokenUser } })
  result.checks.push({ name:'admin.stats.nonadmin', ok:asUser.r.status===403, status:asUser.r.status })

  const asAdmin = await req(`${base}/admin/stats`, { headers:{ authorization:'Bearer '+tokenAdmin } })
  const okAdmin = asAdmin.r.status===200 && asAdmin.body?.totals && asAdmin.body?.interviewsByStatus
  result.checks.push({ name:'admin.stats.ok', ok:okAdmin, status:asAdmin.r.status })
}

async function run(){
  const result = { checks: [], passed: false, ts: new Date().toISOString(), module: MOD }
  const srv = await startServer()

  if (MOD === '10') {
    try { await runM10(result) }
    catch(e) {
      for (const n of ['admin.stats.unauth','admin.stats.nonadmin','admin.stats.ok']) {
        result.checks.push({ name:n, ok:false, error:String(e) })
      }
    }
  }

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
