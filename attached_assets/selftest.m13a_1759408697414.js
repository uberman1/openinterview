import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
const PORT=String(process.env.PORT||5050)
const base=`http://127.0.0.1:${PORT}/api/v1`
const logsDir=path.resolve(process.cwd(),'logs'); if(!fs.existsSync(logsDir)) fs.mkdirSync(logsDir,{recursive:true})
const logPath=path.join(logsDir,'mod-13a.log'); const jsonPath=path.join(logsDir,'selftest.mod-13a.json')
const log=(s)=>fs.appendFileSync(logPath,s+'\n'); const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
async function req(url,init){ const r=await fetch(url,init); let body=null; try{ body=await r.clone().json(); }catch{} return { r, body }; }
async function start(){ log('[selftest m13a] starting server...'); const dist=path.resolve(process.cwd(),'dist','index.js'); if(!fs.existsSync(dist)){ await new Promise(res=> spawn('npm',['run','build'],{stdio:'inherit'}).on('close',res)); } const env={...process.env, PORT, NODE_ENV:'test', USE_MOCK_AUTH:'true'}; const srv=spawn('node',['dist/index.js'],{env}); srv.stdout.on('data',d=>log(String(d).trim())); srv.stderr.on('data',d=>log(String(d).trim())); await wait(1000); return srv; }
async function main(){ const result={checks:[], passed:false, ts:new Date().toISOString(), module:'13a'}; const srv=await start(); const email=`ui_${Date.now()}@example.com`; await req(`${base}/auth/signup`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:'x'})}); const login=await req(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:'x'})}); result.checks.push({name:'api.login', ok:login.r.status===200 && !!login.body?.token, status:login.r.status}); const b=spawn('npm',['run','build']); await new Promise(res=>b.on('close',res)); result.checks.push({name:'client.build', ok:b.exitCode===0}); srv.kill('SIGINT'); result.passed=result.checks.every(c=>c.ok); fs.writeFileSync(jsonPath, JSON.stringify(result,null,2)); console.log(result.passed?'ALL CHECKS PASSED':'CHECKS FAILED, see logs/selftest.*'); process.exit(result.passed?0:1); }
main();
