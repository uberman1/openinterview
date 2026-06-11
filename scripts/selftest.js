import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
const MOD=(process.env.MODULE_NUM||'00').toString().padStart(2,'0')
const PORT=String(process.env.PORT||5050)
const base=`http://127.0.0.1:${PORT}/api/v1`
const logsDir=path.resolve(process.cwd(),'logs')
if(!fs.existsSync(logsDir)) fs.mkdirSync(logsDir,{recursive:true})
const logFileName= MOD==='12' ? 'mod-12.log' : `selftest.mod-${MOD}.log`
const jsonFileName=`selftest.mod-${MOD}.json`
const logPath=path.join(logsDir,logFileName)
const jsonPath=path.join(logsDir,jsonFileName)
const log=(s)=>fs.appendFileSync(logPath,s+'\n')
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
async function req(url,init){ const r=await fetch(url,init); let body=null; try{ body=await r.clone().json(); }catch{} return { r, body }; }
async function start(){ log(`[selftest m${MOD}] starting server...`); const dist=path.resolve(process.cwd(),'dist','index.js'); if(!fs.existsSync(dist)){ await new Promise(res=> spawn('npm',['run','build'],{stdio:'inherit'}).on('close',res)); } const env={...process.env, PORT, NODE_ENV:'test'}; const srv=spawn('node',['dist/index.js'],{env}); srv.stdout.on('data',d=>log(String(d).trim())); srv.stderr.on('data',d=>log(String(d).trim())); await wait(1200); return srv; }
async function run12(result){
  const password='Passw0rd!'; const emailUser=`m12_${Date.now()}@example.com`; const emailAdmin='admin@example.com';
  await req(`${base}/auth/signup`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:emailUser,password})});
  await req(`${base}/auth/signup`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:emailAdmin,password})});
  const lUser=await req(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:emailUser,password})});
  const lAdmin=await req(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:emailAdmin,password})});
  const tokenUser=lUser.body?.token||null; const tokenAdmin=lAdmin.body?.token||null;
  result.checks.push({name:'admin.console.auth.login', ok:!!tokenUser && !!tokenAdmin});
  const s1=await fetch(`${base}/admin/stats`); result.checks.push({name:'admin.console.unauth.stats', ok:s1.status===401, status:s1.status});
  const f1=await fetch(`${base}/admin/flags`); result.checks.push({name:'admin.console.unauth.flags', ok:f1.status===401, status:f1.status});
  const s2=await fetch(`${base}/admin/stats`,{headers:{authorization:'Bearer '+tokenUser}}); result.checks.push({name:'admin.console.nonadmin.stats', ok:s2.status===403, status:s2.status});
  const f2=await fetch(`${base}/admin/flags`,{headers:{authorization:'Bearer '+tokenUser}}); result.checks.push({name:'admin.console.nonadmin.flags', ok:f2.status===403, status:f2.status});
  const sa=await fetch(`${base}/admin/stats`,{headers:{authorization:'Bearer '+tokenAdmin}}); const saBody=await sa.json(); const saOk=sa.status===200 && saBody?.totals && saBody?.interviewsByStatus; result.checks.push({name:'admin.console.stats', ok:saOk, status:sa.status});
  const ga=await fetch(`${base}/admin/flags`,{headers:{authorization:'Bearer '+tokenAdmin}}); const gaBody=await ga.json(); const gaOk=ga.status===200 && gaBody?.flags && typeof gaBody.flags.enableEmails==='boolean'; result.checks.push({name:'admin.console.flags.list', ok:gaOk, status:ga.status});
  const ua=await fetch(`${base}/admin/users`,{headers:{authorization:'Bearer '+tokenAdmin}}); const uaBody=await ua.json(); const uaOk=ua.status===200 && Array.isArray(uaBody?.users); result.checks.push({name:'admin.console.users', ok:uaOk, status:ua.status});
  const patch=await fetch(`${base}/admin/flags`,{method:'PATCH',headers:{authorization:'Bearer '+tokenAdmin,'content-type':'application/json'},body:JSON.stringify({enableEmails:true})}); const pb=await patch.json(); const patchOk=patch.status===200 && pb?.flags?.enableEmails===true; result.checks.push({name:'admin.console.flags.patch', ok:patchOk, status:patch.status});
  const ga2=await fetch(`${base}/admin/flags`,{headers:{authorization:'Bearer '+tokenAdmin}}); const ga2Body=await ga2.json(); const confirm=ga2.status===200 && ga2Body?.flags?.enableEmails===true; result.checks.push({name:'admin.console.flags.confirm', ok:confirm, status:ga2.status});
}
async function main(){ const result={checks:[], passed:false, ts:new Date().toISOString(), module:MOD}; const srv=await start(); if(MOD==='12'){ try{ await run12(result);}catch(e){ for(const n of ['admin.console.auth.login','admin.console.unauth.stats','admin.console.unauth.flags','admin.console.nonadmin.stats','admin.console.nonadmin.flags','admin.console.stats','admin.console.flags.list','admin.console.users','admin.console.flags.patch','admin.console.flags.confirm']) result.checks.push({name:n, ok:false, error:String(e)}); } } log('[selftest] building client...'); const b=spawn('npm',['run','build']); b.stdout&&b.stdout.on('data',d=>log(String(d).trim())); b.stderr&&b.stderr.on('data',d=>log(String(d).trim())); await new Promise(res=>b.on('close',res)); result.checks.push({name:'client.build', ok:b.exitCode===0}); srv.kill('SIGINT'); result.passed=result.checks.every(c=>c.ok); fs.writeFileSync(jsonPath, JSON.stringify(result,null,2)); console.log(result.passed?'ALL CHECKS PASSED':'CHECKS FAILED, see logs/selftest.*'); process.exit(result.passed?0:1); }
main();
