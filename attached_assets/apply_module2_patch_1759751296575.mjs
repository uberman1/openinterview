#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = process.cwd();

function read(p){ return fs.readFileSync(p,'utf8'); }
function write(p,s){ fs.writeFileSync(p,s); }
function exists(p){ try{ fs.accessSync(p); return true; }catch{ return false; } }
function ensureDir(p){ fs.mkdirSync(p,{recursive:true}); }

const indexPath = path.join(root,'index.js');
if (!exists(indexPath)) { console.error('index.js not found'); process.exit(1); }

ensureDir(path.join(root,'public'));
ensureDir(path.join(root,'public','js'));
fs.copyFileSync(path.join(__dirname,'..','public','public_profile.html'), path.join(root,'public','public_profile.html'));
fs.copyFileSync(path.join(__dirname,'..','public','js','enhance_profile_edit.js'), path.join(root,'public','js','enhance_profile_edit.js'));
console.log('✔ Wrote public files');

let idx = read(indexPath);
if (!idx.includes('app.get("/u/:handle"')) {
  const marker = 'app.use(express.static(path.join(__dirname, "public")));';
  const snippet = `

/** Public shareable profile page */
app.get("/u/:handle", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "public_profile.html"));
});`;
  const pos = idx.indexOf(marker);
  if (pos !== -1) idx = idx.slice(0, pos + marker.length) + snippet + idx.slice(pos + marker.length);
  else idx += snippet;
  write(indexPath, idx);
  console.log('✔ Added /u/:handle route');
} else {
  console.log('• /u/:handle route present');
}

idx = read(indexPath);
if (!idx.includes('import multer from "multer";')) {
  idx = idx.replace(/^/, 'import fs from "fs";\nimport multer from "multer";\nimport { fileTypeFromBuffer } from "file-type";\n');
}
if (!idx.includes('app.post("/api/upload/:kind')) {
  const endpoint = `
// Upload directly to a profile (resume | attachment)
const MAX_RESUME = (+process.env.MAX_RESUME_MB || 5) * 1024 * 1024;
const MAX_ATTACHMENT = (+process.env.MAX_ATTACHMENT_MB || 25) * 1024 * 1024;
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: Math.max(MAX_ATTACHMENT, MAX_RESUME) } });

function saveFile(buf, original, mime, userId) {
  const ext = (original || "").includes(".") ? "." + original.split(".").pop() : "";
  const fname = \`\${Date.now()}_\${Math.random().toString(36).slice(2)}\${ext}\`;
  const outDir = path.join(__dirname, "public", "uploads");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, fname), buf);
  const sizeMB = Math.round((buf.length / 1048576) * 10) / 10;
  return { id: "f_" + fname, userId, name: original || "file" + ext, mime, sizeLabel: \`\${sizeMB}MB\`, url: "/uploads/" + fname, uploadedAt: new Date().toISOString().slice(0,10) };
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
    if (buf.length > max) return res.status(413).send(\`File too large (max \${Math.round(max/1048576)} MB)\`);

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
`;
  idx += endpoint;
  write(indexPath, idx);
  console.log('✔ Upload endpoint added');
} else {
  console.log('• Upload endpoint present');
}

const editPath = path.join(root,'public','profile_edit.html');
if (fs.existsSync(editPath)) {
  let html = read(editPath);
  if (!html.includes('/js/enhance_profile_edit.js')) {
    html = html.replace('</body>','<script type="module" src="/js/enhance_profile_edit.js"></script>\n</body>');
    write(editPath, html);
    console.log('✔ Injected enhance_profile_edit.js into profile_edit.html');
  } else {
    console.log('• enhance script already referenced');
  }
} else {
  console.log('• public/profile_edit.html not found — ensure Module 2 base exists');
}

console.log('\nPatch complete. Set env: MAX_RESUME_MB=5, MAX_ATTACHMENT_MB=25. Restart server.');
