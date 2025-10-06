#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repo = process.cwd();

const read = p => fs.readFileSync(p,'utf8');
const write = (p,s) => fs.writeFileSync(p,s);
const exists = p => { try{ fs.accessSync(p); return true; }catch{ return false; } };
const ensureDir = p => fs.mkdirSync(p,{recursive:true});

// Backup legacy page if present
const legacySrc = path.join(repo, 'public', 'availability.html');
if (exists(legacySrc)) {
  const legacyDst = path.join(repo, 'public', 'availability_legacy.html');
  fs.copyFileSync(legacySrc, legacyDst);
  console.log('• Backed up existing availability.html → availability_legacy.html');
}

// Install new UI files
ensureDir(path.join(repo,'public'));
ensureDir(path.join(repo,'public','js'));
fs.copyFileSync(path.join(__dirname,'..','public','availability.html'), path.join(repo,'public','availability.html'));
fs.copyFileSync(path.join(__dirname,'..','public','js','availability.js'), path.join(repo,'public','js','availability.js'));
console.log('✔ Installed new availability UI');

// Patch index.js with APIs if missing
const idxPath = path.join(repo,'index.js');
if (!exists(idxPath)) { console.error('index.js not found'); process.exit(1); }
let idx = read(idxPath);

if (!idx.includes('db.availability')) {
  idx = idx.replace(/(const db *= *{[^}]*)/, (m)=> m.includes('availability') ? m : m.replace(/}$/, ', availability: [], bookings: [] }'));
}

if (!idx.includes('function toMin(')) {
  idx += `

// ---- Availability helpers ----
function toMin(t){ const [H,M]=t.split(':').map(Number); return H*60+M; }
function fromMin(m){ const H=String(Math.floor(m/60)).padStart(2,'0'); const Mi=String(m%60).padStart(2,'0'); return H+':'+Mi; }
function addMinutes(dateStr, timeStr, mins){
  const [y,m,d] = dateStr.split('-').map(Number);
  const [H,Mi] = timeStr.split(':').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d, H, Mi, 0));
  return new Date(dt.getTime() + mins*60000);
}
`;
}

if (!idx.includes('app.get("/api/availability"')) {
  idx += `

// Return availability for userId
app.get("/api/availability", (req,res) => {
  const userId = req.query.userId || "u1";
  const found = db.availability.find(a=>a.userId===userId);
  if (!found) {
    return res.json({
      userId,
      timezone: "America/Los_Angeles",
      weekly: { Mon:[], Tue:[], Wed:[], Thu:[], Fri:[], Sat:[], Sun:[] },
      rules: { minNoticeMinutes:120, windowDays:30, incrementsMinutes:30, bufferBeforeMinutes:30, bufferAfterMinutes:10, maxPerDay:5, durations:[15,30,45], defaultDuration:30 },
      exceptions: []
    });
  }
  res.json(found);
});
`;
}

if (!idx.includes('app.post("/api/availability"')) {
  idx += `

app.post("/api/availability", (req,res) => {
  const body = req.body || {};
  const userId = body.userId || "u1";
  const i = db.availability.findIndex(a=>a.userId===userId);
  if (i === -1) db.availability.push(body);
  else db.availability[i] = body;
  res.json({ ok:true, userId });
});
`;
}

if (!idx.includes('app.get("/api/slots"')) {
  idx += `

// Generate bookable start times
app.get("/api/slots", (req,res) => {
  const userId = req.query.userId || "u1";
  const date = req.query.date; // YYYY-MM-DD
  const duration = parseInt(req.query.duration||"30",10);
  if (!date) return res.status(400).json({error:"date required"});

  const av = db.availability.find(a=>a.userId===userId);
  if (!av) return res.json({ slots: [] });

  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const d = new Date(date+"T00:00:00Z");
  const dayKey = dayNames[d.getUTCDay()];
  let blocks = av.weekly?.[dayKey] || [];

  const ex = (av.exceptions||[]).find(x=>x.date===date);
  if (ex) blocks = ex.type === "block" ? [] : (ex.blocks || []);

  const inc = av.rules?.incrementsMinutes || 30;
  const starts = [];
  for (const [s,e] of blocks) {
    let t = toMin(s), end = toMin(e);
    while (t + duration <= end) { starts.push(t); t += inc; }
  }

  const today = new Date();
  const daysOut = Math.floor((new Date(date+"T00:00:00Z") - new Date(today.toDateString()+"T00:00:00Z"))/86400000);
  const windowDays = av.rules?.windowDays ?? 30;
  const minNotice = av.rules?.minNoticeMinutes ?? 120;

  const visible = starts.filter(m => {
    if (daysOut < 0 || daysOut > windowDays) return false;
    const startISO = addMinutes(date, fromMin(m), 0);
    const diffMin = Math.floor((startISO - today)/60000);
    if (diffMin < minNotice) return false;
    return true;
  });

  const maxPerDay = av.rules?.maxPerDay || 999;
  const limited = visible.slice(0, maxPerDay);
  res.json({ slots: limited.map(fromMin) });
});
`;
}

write(idxPath, idx);
console.log('✔ Patched index.js APIs');
console.log('\\nDone. Restart your server and open /availability.html');
