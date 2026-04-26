
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
app.get("/api/profiles/default", (req,res)=>{
  const { userId } = req.query;
  const list = db.profiles.filter(p=>p.userId===userId);
  const def = list.find(p=>p.isDefault) || list[0] || null;
  if(!def) return res.status(404).send("no profiles");
  res.json(def);
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
app.get("/api/availability", (req,res)=>{
  const { userId } = req.query;
  res.json(db.availability[userId] || { weekly:{}, overrides:[] });
});
app.post("/api/availability", (req,res)=>{
  const { userId, weekly, overrides } = req.body || {};
  db.availability[userId] = { weekly: weekly||{}, overrides: overrides||[] };
  res.json({ ok:true });
});

// Public profile assembly
app.get("/api/public/profile/:handle", (req,res)=>{
  const p = db.profiles.find(x=>x.handle===req.params.handle);
  if(!p) return res.status(404).end();
  const fileById = id => db.files.find(f=>f.id===id);
  const resume = p.resumeFileId ? fileById(p.resumeFileId) : null;
  const attachments = (p.attachmentFileIds||[]).map(fileById).filter(Boolean);
  res.json({ ...p, resume, attachments });
});

export default app;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, ()=> console.log("Server running on", PORT));
}
