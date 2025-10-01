// scripts/selftest.js — unified runner (adds Module 09 checks)
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const MOD = (process.env.MODULE_NUM || '00').toString().padStart(2, '0')
const PORT = String(process.env.PORT || 5050)
const base = `http://127.0.0.1:${PORT}/api/v1`

const logsDir = path.resolve(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

const logFileName = MOD === '09' ? 'mod-09.log' : `selftest.mod-${MOD}.log`
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

async function runM09(result){
  // create profile
  const email = `m09_${Date.now()}@example.com`
  const p = await req(`${base}/profiles`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ name:'User 09', email }) })
  result.checks.push({ name:'profiles.create', ok: p.r.status===201, status: p.r.status })
  const profileId = p.body?.profile?.id

  // create interview with scheduledAt and status scheduled
  const inAt = new Date(Date.now() + 3600_000).toISOString()
  let iv = await req(`${base}/interviews`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ profileId, title:'Phone Screen', scheduledAt: inAt, status:'scheduled' }) })
  result.checks.push({ name:'interviews.create.scheduled', ok: iv.r.status===201, status: iv.r.status })
  const interviewId = iv.body?.interview?.id

  // update to completed
  let up = await req(`${base}/interviews/${interviewId}`, { method:'PATCH', headers:{'content-type':'application/json'}, body: JSON.stringify({ status: 'completed' }) })
  result.checks.push({ name:'interviews.update.completed', ok: up.r.status===200 && up.body?.interview?.status==='completed', status: up.r.status })

  // invalid transition: completed -> scheduled
  let bad = await req(`${base}/interviews/${interviewId}`, { method:'PATCH', headers:{'content-type':'application/json'}, body: JSON.stringify({ status: 'scheduled' }) })
  result.checks.push({ name:'interviews.update.invalid', ok: bad.r.status===400, status: bad.r.status })

  // reminder
  let rm = await req(`${base}/interviews/${interviewId}/remind`, { method:'POST' })
  result.checks.push({ name:'interviews.remind', ok: rm.r.status===204, status: rm.r.status })

  // filters
  const from = new Date(Date.now() - 24*3600_000).toISOString()
  const to = new Date(Date.now() + 24*3600_000).toISOString()
  let flt = await req(`${base}/interviews?status=completed&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
  const contains = Array.isArray(flt.body?.items) ? flt.body.items.some(x=>x.id===interviewId) : Array.isArray(flt.body) ? flt.body.some(x=>x.id===interviewId) : false
  result.checks.push({ name:'interviews.filter.window', ok: flt.r.status===200 && contains, status: flt.r.status })
}

async function run(){
  const result = { checks: [], passed: false, ts: new Date().toISOString(), module: MOD }
  const srv = await startServer()

  if (MOD === '09') {
    try { await runM09(result) }
    catch(e) {
      for (const n of ['profiles.create','interviews.create.scheduled','interviews.update.completed','interviews.update.invalid','interviews.remind','interviews.filter.window']) {
        result.checks.push({ name: n, ok: false, error: String(e) })
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
