// /scripts/selftest.js (Module 1 extension)
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const logsDir = path.resolve(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })
const logPath = path.join(logsDir, 'selftest.log')
const jsonPath = path.join(logsDir, 'selftest.json')

const log = (line)=> fs.appendFileSync(logPath, line + '\n')
function wait(ms){ return new Promise(r=>setTimeout(r, ms)) }

async function run(){
  const result = { checks: [], passed: false, ts: new Date().toISOString() }
  log('[selftest] starting server...')
  const srv = spawn('node', ['server/server.js'], { env: { ...process.env, PORT: '5050', NODE_ENV: 'test' } })
  srv.stdout.on('data', d=> log(String(d).trim()))
  srv.stderr.on('data', d=> log(String(d).trim()))
  await wait(800)

  // 1) Health
  try {
    const r = await fetch('http://127.0.0.1:5050/api/v1/health')
    const j = await r.json()
    const ok = j && j.status === 'ok'
    result.checks.push({ name: 'api.health', ok, detail: j })
  } catch (e){ result.checks.push({ name: 'api.health', ok: false, error: String(e) }) }

  // 2) Create Profile
  let profileId = null
  try {
    const r = await fetch('http://127.0.0.1:5050/api/v1/profiles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'test@example.com' })
    })
    const j = await r.json()
    const ok = r.status === 201 && j?.profile?.email === 'test@example.com'
    if (ok) profileId = j.profile.id
    result.checks.push({ name: 'profiles.create', ok, detail: j })
  } catch (e){ result.checks.push({ name: 'profiles.create', ok: false, error: String(e) }) }

  // 3) List Profiles
  try {
    const r = await fetch('http://127.0.0.1:5050/api/v1/profiles?q=test')
    const j = await r.json()
    const ok = Array.isArray(j.items) && j.items.length >= 1
    result.checks.push({ name: 'profiles.list', ok, count: j.items?.length })
  } catch (e){ result.checks.push({ name: 'profiles.list', ok: false, error: String(e) }) }

  // 4) Create Interview
  try {
    const r = await fetch('http://127.0.0.1:5050/api/v1/interviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profileId, title: 'Intro Interview' })
    })
    const j = await r.json()
    const ok = r.status === 201 && j?.interview?.profileId === profileId
    result.checks.push({ name: 'interviews.create', ok })
  } catch (e){ result.checks.push({ name: 'interviews.create', ok: false, error: String(e) }) }

  // 5) Client Build
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
