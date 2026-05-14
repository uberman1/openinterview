import { promises as fs } from 'fs';
import path from 'path';
const DATA_DIR = path.resolve(process.cwd(), 'data');
async function ensureDir(){ await fs.mkdir(DATA_DIR, { recursive: true }); }
export async function load(file, fallback){ await ensureDir(); const p = path.join(DATA_DIR, file); try{ const raw = await fs.readFile(p,'utf8'); return JSON.parse(raw);}catch(e){ if(e && e.code==='ENOENT') return fallback; throw e; } }
export async function save(file, data){ await ensureDir(); const p = path.join(DATA_DIR, file); const tmp = p+'.tmp'; await fs.writeFile(tmp, JSON.stringify(data,null,2),'utf8'); await fs.rename(tmp,p); }
export function paginate(items, limit=20, cursor){ const LIM=Math.min(Math.max(1,limit),50); let start=0; if(cursor){ const idx=items.findIndex(x=>x.id===cursor); start = idx>=0? idx+1:0;} const slice=items.slice(start,start+LIM); const next=(start+LIM)<items.length? slice[slice.length-1]?.id:undefined; return { items:slice, nextCursor:next }; }
