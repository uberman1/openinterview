import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
const MOD=(process.env.MODULE_NUM||'00').toString().padStart(2,'0')
const PORT=String(process.env.PORT||5050)
const base=`http://127.0.0.1:${PORT}/api/v1`
const logsDir=path.resolve(process.cwd(),'logs')
if(!fs.existsSync(logsDir)) fs.mkdirSync(logsDir,{recursive:true})
const logFileName= MOD==='08' ? 'mod-08.log' : `selftest.mod-${MOD}.log`
const jsonFileName=`selftest.mod-${MOD}.json`
const logPath=path.join(logsDir,logFileName)
const jsonPath=path.join(logsDir,jsonFileName)
const log=(s)=>fs.appendFileSync(logPath,s+'\n')
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
async function req(url,init){ const r=await fetch(url,init); let body=null; try{ body=await r.clone().json(); }catch{} return { r, body }; }
async function start(){ log(`[selftest m${MOD}] starting server...`); const dist=path.resolve(process.cwd(),'dist','index.js'); if(!fs.existsSync(dist)){ await new Promise(res=> spawn('npm',['run','build'],{stdio:'inherit'}).on('close',res)); } const env={...process.env, PORT, NODE_ENV:'test'}; const srv=spawn('node',['dist/index.js'],{env}); srv.stdout.on('data',d=>log(String(d).trim())); srv.stderr.on('data',d=>log(String(d).trim())); await wait(1200); return srv; }
async function run08(result){
  const email=`m08_${Date.now()}@example.com`, password='Passw0rd!';
  let s=await req(`${base}/auth/signup`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})})
  const okSignup=(s.r.status>=200&&s.r.status<300)||s.r.status===409; result.checks.push({name:'auth.signup', ok:okSignup, status:s.r.status});
  let l=await req(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})})
  const token=l.body?.token; result.checks.push({name:'auth.login', ok:l.r.status===200 && !!token, status:l.r.status});
  let u=await req(`${base}/dashboard`); result.checks.push({name:'dashboard.auth.required', ok:u.r.status===401, status:u.r.status});
  let d=await req(`${base}/dashboard`,{headers:{authorization:'Bearer '+token}})
  const ok = d.r.status===200 && d.body?.user && Array.isArray(d.body?.profiles) && Array.isArray(d.body?.interviews) && typeof d.body?.plan==='string';
  result.checks.push({name:'dashboard.fetch', ok, status:d.r.status});
}
async function main(){ const result={checks:[], passed:false, ts:new Date().toISOString(), module:MOD}; const srv=await start(); if(MOD==='08'){ try{ await run08(result);}catch(e){ for(const n of ['auth.signup','auth.login','dashboard.auth.required','dashboard.fetch']) result.checks.push({name:n, ok:false, error:String(e)}); } } log('[selftest] building client...'); const b=spawn('npm',['run','build']); b.stdout&&b.stdout.on('data',d=>log(String(d).trim())); b.stderr&&b.stderr.on('data',d=>log(String(d).trim())); await new Promise(res=>b.on('close',res)); result.checks.push({name:'client.build', ok:b.exitCode===0}); srv.kill('SIGINT'); result.passed=result.checks.every(c=>c.ok); fs.writeFileSync(jsonPath, JSON.stringify(result,null,2)); console.log(result.passed?'ALL CHECKS PASSED':'CHECKS FAILED, see logs/selftest.*'); process.exit(result.passed?0:1); }
main();
