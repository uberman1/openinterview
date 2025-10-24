// patches/apply.mjs
// Self-deploying patcher for OpenInterview Cloudinary video + thumbnail support
// Run with: node patches/apply.mjs
// This version will also ensure `cloudinary` (and `express`) are installed via npm if missing.

import fs from 'fs';
import path from 'path';
import url from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = process.cwd();
const srcRoot = path.join(__dirname, 'files');

function copyIfMissing(relPath) {
  const src = path.join(srcRoot, relPath);
  const dst = path.join(projectRoot, relPath.replace(/^patches\/files\//, ''));
  const dstDir = path.dirname(dst);
  fs.mkdirSync(dstDir, { recursive: true });
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
    console.log('Added', relPath.replace(/^patches\/files\//, ''));
  } else {
    fs.copyFileSync(src, dst);
    console.log('Updated', relPath.replace(/^patches\/files\//, ''));
  }
}

function injectServerRoute(serverFile) {
  let code = fs.readFileSync(serverFile, 'utf8');
  if (!code.includes("import uploadSign from './routes/upload-sign.js'")) {
    code = code.replace(/(import .*?;\s*)$/m, `$1\nimport uploadSign from './routes/upload-sign.js';\n`);
  }
  if (!code.includes("import './server/cloudinary.js'")) {
    code = code.replace(/(import .*?;\s*)$/m, `$1\nimport './server/cloudinary.js';\n`);
  }
  if (!code.includes('app.use(uploadSign)')) {
    code = code.replace(/(const app = .*?;)/, `$1\napp.use(uploadSign);`);
  }
  fs.writeFileSync(serverFile, code, 'utf8');
  console.log('Patched server file:', serverFile);
}

function findFile(candidates) {
  for (const c of candidates) {
    const p = path.join(projectRoot, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function injectEditorButtons(htmlFile) {
  let html = fs.readFileSync(htmlFile, 'utf8');
  if (!html.includes('id="btnUploadVideo"')) {
    html = html.replace(/(<body[^>]*>)/i, `$1\n<!-- Video & Thumbnail Upload Buttons (patch) -->\n<div class="oi-video-thumb flex gap-3 p-4">\n  <label class="btn"><input id="btnUploadVideo" type="file" accept="video/*" hidden />Upload Video</label>\n  <label class="btn"><input id="btnUploadThumb" type="file" accept="image/*" hidden />Upload Thumbnail</label>\n</div>\n`);
  }
  if (!html.includes('profile-editor.video-thumb.bind.js')) {
    html = html.replace(/(<\/body>)/i, `  <script type="module" src="/js/cloudinary-helpers.js"></script>\n  <script type="module" src="/js/uploader.js"></script>\n  <script type="module" src="/js/profile-editor.video-thumb.bind.js"></script>\n$1`);
  }
  fs.writeFileSync(htmlFile, html, 'utf8');
  console.log('Patched editor HTML:', htmlFile);
}

function injectPublicBinder(htmlFile) {
  let html = fs.readFileSync(htmlFile, 'utf8');
  if (!html.includes('public-video.bind.js')) {
    if (!html.includes('hls.min.js')) {
      html = html.replace(/(<\/body>)/i, `  <script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>\n$1`);
    }
    html = html.replace(/(<\/body>)/i, `  <script type="module" src="/js/public-video.bind.js"></script>\n$1`);
  }
  fs.writeFileSync(htmlFile, html, 'utf8');
  console.log('Patched public HTML:', htmlFile);
}

function mergePackageJson() {
  const pkgFile = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgFile)) {
    console.warn('package.json not found, skipping dependency merge.');
    return false;
  }
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  pkg.dependencies = pkg.dependencies || {};
  const before = JSON.stringify(pkg.dependencies);
  if (!pkg.dependencies['cloudinary']) pkg.dependencies['cloudinary'] = '^2.5.1';
  if (!pkg.dependencies['express']) pkg.dependencies['express'] = '^4.19.2';
  const after = JSON.stringify(pkg.dependencies);
  if (before !== after) {
    fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2), 'utf8');
    console.log('Merged dependencies into package.json (cloudinary, express).');
  }
  return true;
}

function ensureInstalled(pkgName) {
  try {
    // resolve from project root
    const modPath = require.resolve(pkgName, { paths: [projectRoot] });
    if (modPath) {
      console.log(`✓ ${pkgName} already installed.`);
      return;
    }
  } catch {}
  console.log(`Installing ${pkgName}...`);
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['i', pkgName, '--save'], {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  if (r.status !== 0) {
    console.warn(`Warning: automatic install of ${pkgName} failed. Please run: npm i ${pkgName} --save`);
  }
}

// Copy files
copyIfMissing('patches/files/server/cloudinary.js');
copyIfMissing('patches/files/routes/upload-sign.js');
copyIfMissing('patches/files/js/cloudinary-helpers.js');
copyIfMissing('patches/files/js/uploader.js');
copyIfMissing('patches/files/js/profile-editor.video-thumb.bind.js');
copyIfMissing('patches/files/js/public-video.bind.js');

// Inject server route into common server entry names
const serverCandidate = findFile(['server.js','app.js','index.js','src/server.js']);
if (serverCandidate) injectServerRoute(serverCandidate);
else console.warn('No server entry file found to patch (looked for server.js/app.js/index.js/src/server.js).');

// Patch editor HTML
const editorHtmlCandidate = findFile(['profile_edit_enhanced.html','public/profile_edit_enhanced.html','views/profile_edit_enhanced.html']);
if (editorHtmlCandidate) injectEditorButtons(editorHtmlCandidate);
else console.warn('profile_edit_enhanced.html not found to patch buttons.');

// Patch public index
const publicHtmlCandidate = findFile(['index.html','public/index.html','views/index.html']);
if (publicHtmlCandidate) injectPublicBinder(publicHtmlCandidate);
else console.warn('index.html not found to patch public binder.');

// Merge package.json and auto-install cloudinary (and ensure express)
const merged = mergePackageJson();
if (merged) {
  ensureInstalled('cloudinary');
  ensureInstalled('express');
}

console.log('\nPatch complete. Next steps:');
console.log('1) Set ENV vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_UPLOAD_PRESET');
console.log('2) Restart your server to pick up the new route and modules.');
