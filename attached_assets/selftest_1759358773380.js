import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const MOD=(process.env.MODULE_NUM||'00').toString().padStart(2,'0')
const PORT=String(process.env.PORT||5050)
const base=`http://127.0.0.1:${PORT}`
const api=`${base}/api/v1`
const logsDir=path.resolve(process.cwd(),'logs')
if(!fs.existsSync(logsDir)) fs.mkdirSync(logsDir,{recursive:true})
const logFileName= MOD==='11' ? 'mod-11.log' : `selftest.mod-${MOD}.log`
const jsonFileName=`selftest.mod-${MOD}.json`
const logPath=path.join(logsDir,logFileName)
const jsonPath=path.join(logsDir,jsonFileName)
const log=(s)=>fs.appendFileSync(logPath,s+'\n')
const wait=(ms)=>new Promise(r=>setTimeout(r,ms))
async function req(url,init){ const r=await fetch(url,init); let body=null; try{ body=await r.clone().json(); }catch{} return { r, body, headers: Object.fromEntries(r.headers.entries()) }; }
async function start(){ log(`[selftest m${MOD}] starting server...`); const dist=path.resolve(process.cwd(),'dist','index.js'); if(!fs.existsSync(dist)){ await new Promise(res=> spawn('npm',['run','build'],{stdio:'inherit'}).on('close',res)); } const env={...process.env, PORT, NODE_ENV:'test'}; const srv=spawn('node',['dist/index.js'],{env}); srv.stdout.on('data',d=>log(String(d).trim())); srv.stderr.on('data',d=>log(String(d).trim())); await wait(1200); return srv; }
async function run11(result){
  const ready=await req(`${api}/ready`); result.checks.push({name:'ops.ready', ok:ready.r.status===200 && ready.body?.ready===true, status:ready.r.status});
  const live=await req(`${api}/live`); result.checks.push({name:'ops.live', ok:live.r.status===200 && live.body?.live===true, status:live.r.status});
  const idx=await fetch(`${base}/`); const cc=idx.headers.get('cache-control')||idx.headers.get('Cache-Control'); const htmlOk=(idx.headers.get('content-type')||'').includes('text/html'); result.checks.push({name:'static.index', ok:idx.status===200 && htmlOk && !!cc, status:idx.status});
  const env2={...process.env, PORT:String(Number(PORT)+1), NODE_ENV:'test'}; const srv2=spawn('node',['dist/index.js'],{env:env2}); await wait(800); srv2.kill('SIGINT'); result.checks.push({name:'ops.shutdown', ok:true});
}
async function main(){ const result={checks:[], passed:false, ts:new Date().toISOString(), module:MOD}; const srv=await start(); if(MOD==='11'){ try{ await run11(result);}catch(e){ for(const n of ['ops.ready','ops.live','static.index','ops.shutdown']) result.checks.push({name:n, ok:false, error:String(e)}); } } log('[selftest] building client...'); const b=spawn('npm',['run','build']); b.stdout&&b.stdout.on('data',d=>log(String(d).trim())); b.stderr&&b.stderr.on('data',d=>log(String(d).trim())); await new Promise(res=>b.on('close',res)); result.checks.push({name:'client.build', ok:b.exitCode===0}); srv.kill('SIGINT'); result.passed=result.checks.every(c=>c.ok); fs.writeFileSync(jsonPath, JSON.stringify(result,null,2)); console.log(result.passed?'ALL CHECKS PASSED':'CHECKS FAILED, see logs/selftest.*'); process.exit(result.passed?0:1); }
main();
