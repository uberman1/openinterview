import fs from "fs";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import cors from "cors";
import { v4 as uuid } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

let db = JSON.parse(readFileSync(path.join(__dirname, "seed.json"), "utf8"));

// ---- Inject client binder for uploads.html (no file changes) ----
/* UPLOADS_BIND_INJECT_BEFORE_STATIC */
app.get('/uploads.html', (req,res) => {
  const p = path.join(__dirname, 'public', 'uploads.html');
  try{
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/uploads.bind.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/topmenu.unify.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){
    res.status(500).send('Failed to load uploads.html');
  }
});

// ---- Serve /home.html with binder; alias /profile(.html) -> /home.html
/* HOME_BIND_INJECT */
function serveHome(req,res){
  const p = path.join(__dirname, 'public', 'home.html');
  try{
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/home.bind.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/topmenu.unify.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(500).send('Failed to load home.html'); }
}
app.get('/home.html', serveHome);
app.get('/profile.html', (req,res)=> res.redirect(302,'/home.html'));
app.get('/profile', (req,res)=> res.redirect(302,'/home.html'));

// ---- Serve /subscription(.html) with binder
/* SUBSCRIPTION_BIND_INJECT */
function serveSubscription(req,res){
  const p = path.join(__dirname, 'public', 'subscription.html');
  try{
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/subscription.bind.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/topmenu.unify.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(500).send('Failed to load subscription.html'); }
}
app.get('/subscription.html', serveSubscription);
app.get('/subscription', serveSubscription);
app.get('/billing', (req,res)=> res.redirect(302, '/subscription.html'));

// ---- Serve /password(.html) with binder
/* PASSWORD_BIND_INJECT */
function servePassword(req,res){
  const p = path.join(__dirname, 'public', 'password.html');
  try{
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/password.bind.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/topmenu.unify.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(500).send('Failed to load password.html'); }
}
app.get('/password.html', servePassword);
app.get('/password', servePassword);
app.get('/settings/password', servePassword);

// ---- Serve /profiles(.html) with binder
/* PROFILES_BIND_INJECT */
function serveProfiles(req,res){
  const p = path.join(__dirname, 'public', 'profiles.html');
  try{
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/profiles.bind.js" defer></script></body>');
    html = html.replace('</body>', '<script src="/js/topmenu.unify.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(500).send('Failed to load profiles.html'); }
}
app.get('/profiles.html', serveProfiles);
app.get('/profiles', serveProfiles);

// ---- Serve public profile with booking binder
/* PUBLIC_PROFILE_BOOK_BIND */
function servePublicProfile(req,res){
  const p = path.join(__dirname, 'public', 'public_profile.html');
  try{
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/public_profile.book.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(404).send('profile_public.html not found'); }
}
app.get('/u/:handle', servePublicProfile);
app.get('/profile_public.html', servePublicProfile);

// ---- Serve booking manage page with binder
/* BOOKING_MANAGE_BIND */
function serveBookingManage(req,res){
  const p = path.join(__dirname, 'public', 'booking_manage.html');
  try{
    let html = fs.readFileSync(p, 'utf8');
    html = html.replace('</body>', '<script src="/js/booking_manage.bind.js" defer></script></body>');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.send(html);
  }catch(e){ res.status(500).send('Failed to load booking_manage.html'); }
}
app.get('/booking_manage.html', serveBookingManage);
app.get('/booking/manage/:token', serveBookingManage);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => res.redirect("/login.html"));

// Auth
app.post("/api/auth/login", (req, res) => {
  const { email } = req.body || {};
  if(!email) return res.status(400).send("email required");
  let user = db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if(!user){
    const isAdmin = /admin@/i.test(email);
    user = { id: uuid(), email, name: email.split("@")[0], role: isAdmin?'admin':'user', handle: email.split("@")[0] };
    db.users.push(user);
  }
  res.json({ token: "dev-token", user });
});

// Metrics
app.get("/api/metrics", (req,res)=>{
  const userId = req.query.userId;
  const totalInterviews = db.interviews.filter(i=>i.userId===userId).length;
  const myProfiles = db.profiles.filter(p=>p.userId===userId);
  const totalViews = 450 + myProfiles.length;
  const totalShares = 23 + myProfiles.length;
  res.json({ totalInterviews, totalViews, totalShares });
});

// Interviews
app.get("/api/interviews", (req,res)=>{
  const { scope, userId } = req.query;
  let rows = db.interviews.filter(i=>i.userId===userId);
  const now = new Date();
  if(scope==="upcoming") rows = rows.filter(i=> new Date(i.when) > now);
  res.json(rows);
});
app.delete("/api/interviews/:id", (req,res)=>{
  db.interviews = db.interviews.filter(i=>i.id !== req.params.id);
  res.status(204).end();
});

// Files (library)
app.get("/api/files", (req,res)=>{
  const { userId } = req.query;
  res.json(db.files.filter(f=>f.userId===userId));
});
app.post("/api/files", (req,res)=>{
  const { userId, name, mime } = req.body || {};
  const f = { id: uuid(), userId, name: name||("file_"+uuid().slice(0,6)+".pdf"), mime: mime||"application/pdf", sizeLabel:"1MB", url:"#", uploadedAt: new Date().toISOString().slice(0,10) };
  db.files.push(f);
  res.json(f);
});
app.patch("/api/files/:id", (req,res)=>{
  const f = db.files.find(x=>x.id===req.params.id);
  if(!f) return res.status(404).end();
  Object.assign(f, req.body||{});
  res.json(f);
});
app.delete("/api/files/:id", (req,res)=>{
  const id = req.params.id;
  db.files = db.files.filter(f=>f.id!==id);
  db.profiles.forEach(p=>{
    p.attachmentFileIds = (p.attachmentFileIds||[]).filter(fid=>fid!==id);
    if(p.resumeFileId===id) p.resumeFileId = null;
  });
  res.status(204).end();
});

// Profiles (package owns resume, links, attachments)
app.get("/api/profiles", (req,res)=>{
  const { userId } = req.query;
  res.json(db.profiles.filter(p=>p.userId===userId));
});
app.get("/api/profiles/default", (req,res)=>{
  const { userId } = req.query;
  const list = db.profiles.filter(p=>p.userId===userId);
  const def = list.find(p=>p.isDefault) || list[0] || null;
  if(!def) return res.status(404).send("no profiles");
  res.json(def);
});
app.get("/api/profiles/:id", (req,res)=>{
  const p = db.profiles.find(x=>x.id===req.params.id);
  if(!p) return res.status(404).end();
  res.json(p);
});
app.patch("/api/profiles/:id", (req,res)=>{
  const p = db.profiles.find(x=>x.id===req.params.id);
  if(!p) return res.status(404).end();
  const { title, city, about, video, links, highlights, resumeFileId, attachmentFileIds } = req.body || {};
  if(title!==undefined) p.title = title;
  if(city!==undefined) p.city = city;
  if(about!==undefined) p.about = about;
  if(video!==undefined) p.video = video;
  if(links!==undefined) p.links = links;
  if(highlights!==undefined) p.highlights = highlights;
  if(resumeFileId!==undefined) p.resumeFileId = resumeFileId;
  if(attachmentFileIds!==undefined) p.attachmentFileIds = attachmentFileIds;
  res.json(p);
});
app.patch("/api/profiles/:id/default", (req,res)=>{
  const id = req.params.id;
  const p = db.profiles.find(x=>x.id===id);
  if(!p) return res.status(404).end();
  db.profiles.forEach(x=>{ if(x.userId===p.userId) x.isDefault = false; });
  p.isDefault = true;
  res.json(p);
});
app.post("/api/profiles/:id/attachments", (req,res)=>{
  const p = db.profiles.find(x=>x.id===req.params.id);
  if(!p) return res.status(404).end();
  const { fileId } = req.body || {};
  if(!p.attachmentFileIds.includes(fileId)) p.attachmentFileIds.push(fileId);
  res.json(p);
});
app.delete("/api/profiles/:id/attachments/:fileId", (req,res)=>{
  const p = db.profiles.find(x=>x.id===req.params.id);
  if(!p) return res.status(404).end();
  p.attachmentFileIds = (p.attachmentFileIds||[]).filter(fid=>fid!==req.params.fileId);
  res.json(p);
});
app.patch("/api/profiles/:id/resume", (req,res)=>{
  const p = db.profiles.find(x=>x.id===req.params.id);
  if(!p) return res.status(404).end();
  p.resumeFileId = req.body?.fileId || null;
  res.json(p);
});

// Availability

// Public profile assembly
app.get("/api/public/profile/:handle", (req,res)=>{
  const p = db.profiles.find(x=>x.handle===req.params.handle);
  if(!p) return res.status(404).end();
  const fileById = id => db.files.find(f=>f.id===id);
  const resume = p.resumeFileId ? fileById(p.resumeFileId) : null;
  const attachments = (p.attachmentFileIds||[]).map(fileById).filter(Boolean);
  res.json({ ...p, resume, attachments });
});

// Upload directly to a profile (resume | attachment)
const MAX_RESUME = (+process.env.MAX_RESUME_MB || 5) * 1024 * 1024;
const MAX_ATTACHMENT = (+process.env.MAX_ATTACHMENT_MB || 25) * 1024 * 1024;
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: Math.max(MAX_ATTACHMENT, MAX_RESUME) } });

function saveFile(buf, original, mime, userId) {
  const ext = (original || "").includes(".") ? "." + original.split(".").pop() : "";
  const fname = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
  const outDir = path.join(__dirname, "public", "uploads");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, fname), buf);
  const sizeMB = Math.round((buf.length / 1048576) * 10) / 10;
  return { id: "f_" + fname, userId, name: original || "file" + ext, mime, sizeLabel: `${sizeMB}MB`, url: "/uploads/" + fname, uploadedAt: new Date().toISOString().slice(0,10) };
}

app.post("/api/upload/:kind(resume|attachment)/:profileId", upload.single("file"), async (req, res) => {
  try {
    const { kind, profileId } = req.params;
    const p = db.profiles.find((x) => x.id === profileId);
    if (!p) return res.status(404).send("Profile not found");
    const buf = req.file?.buffer;
    if (!buf) return res.status(400).send("No file");

    const ALLOWED_MIME = new Set([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "application/rtf"
    ]);
    const ft = await fileTypeFromBuffer(buf).catch(() => null);
    const mime = ft?.mime || req.file.mimetype;
    if (!ALLOWED_MIME.has(mime)) return res.status(415).send("Unsupported file type");

    const max = kind === "resume" ? MAX_RESUME : MAX_ATTACHMENT;
    if (buf.length > max) return res.status(413).send(`File too large (max ${Math.round(max/1048576)} MB)`);

    const rec = saveFile(buf, req.file.originalname, mime, p.userId);
    db.files.push(rec);

    if (kind === "resume") p.resumeFileId = rec.id;
    else {
      p.attachmentFileIds = p.attachmentFileIds || [];
      if (!p.attachmentFileIds.includes(rec.id)) p.attachmentFileIds.push(rec.id);
    }
    res.json({ file: rec, profile: p });
  } catch { res.status(500).send("Upload failed"); }
});

// Error handler for multer errors
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).send(`File too large (max ${Math.round(err.limit/1048576)} MB)`);
  }
  if (err) return res.status(500).send("Server error");
  next();
});

// ---- Availability helpers ----
function toMin(t){ const [H,M]=t.split(':').map(Number); return H*60+M; }
function fromMin(m){ const H=String(Math.floor(m/60)).padStart(2,'0'); const Mi=String(m%60).padStart(2,'0'); return H+':'+Mi; }
function addMinutes(dateStr, timeStr, mins){
  const [y,m,d] = dateStr.split('-').map(Number);
  const [H,Mi] = timeStr.split(':').map(Number);
  const dt = new Date(Date.UTC(y, m-1, d, H, Mi, 0));
  return new Date(dt.getTime() + mins*60000);
}

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

app.post("/api/availability", (req,res) => {
  const body = req.body || {};
  const userId = body.userId || "u1";
  const i = db.availability.findIndex(a=>a.userId===userId);
  if (i === -1) db.availability.push(body);
  else db.availability[i] = body;
  res.json({ ok:true, userId });
});

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
  const todayMidnight = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const targetMidnight = new Date(date+"T00:00:00Z");
  const daysOut = Math.floor((targetMidnight - todayMidnight) / 86400000);
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

export default app;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', ()=> console.log("Server running on", PORT));
}


// ---- Availability helpers ----
