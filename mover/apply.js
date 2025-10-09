/**
 * OpenInterview v4.1 Mover & Versions Updater (Modified for Sections Structure)
 * - Moves profile_v4_1_package under /public
 * - Updates public/data/versions.json (preserves sections structure)
 * - Installs and runs tests in the moved package
 *
 * Zero code changes to v4.1 files. Safe to run multiple times.
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const log = (...args) => console.log('[v4.1-mover]', ...args);
const warn = (...args) => console.warn('[v4.1-mover]', ...args);
const err = (...args) => console.error('[v4.1-mover]', ...args);

const cwd = process.cwd();
const publicDir = path.join(cwd, 'public');
const srcRoot = path.join(cwd, 'profile_v4_1_package');
const dstRoot = path.join(publicDir, 'profile_v4_1_package');
const versionsJsonPath = path.join(publicDir, 'data', 'versions.json');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const item of fs.readdirSync(src)) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    const stat = fs.lstatSync(s);
    if (stat.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function moveOrCopySrc() {
  if (fs.existsSync(dstRoot)) {
    log('Destination already exists:', path.relative(cwd, dstRoot));
    return 'already-in-public';
  }
  if (!fs.existsSync(srcRoot)) {
    // Maybe it already lives under public?
    if (fs.existsSync(dstRoot)) return 'already-in-public';
    err('Could not find profile_v4_1_package at repo root.');
    err('Expected:', path.relative(cwd, srcRoot));
    process.exit(1);
  }

  // Prefer rename, fallback to copy+delete (cross-device safety)
  try {
    ensureDir(publicDir);
    fs.renameSync(srcRoot, dstRoot);
    log('Moved folder to', path.relative(cwd, dstRoot));
    return 'moved';
  } catch (e) {
    warn('rename failed, attempting copy+delete:', e.message);
    copyDir(srcRoot, dstRoot);
    fs.rmSync(srcRoot, { recursive: true, force: true });
    log('Copied folder to', path.relative(cwd, dstRoot));
    return 'copied';
  }
}

function updateVersionsJson() {
  const dataDir = path.dirname(versionsJsonPath);
  ensureDir(dataDir);

  const entry = {
    version: '4.1',
    description: 'Self-deploying Express server; PDF.js resume pagination; functional calendar ICS generation; attachment downloads; guardrails UI protection system; Jest unit tests with JSDOM.',
    page: 'profile_v4_1_package/public/index.html',
    code: 'profile_v4_1_package/',
    timestamp: '2025-10-09'
  };

  let obj = null;
  if (fs.existsSync(versionsJsonPath)) {
    try {
      const txt = fs.readFileSync(versionsJsonPath, 'utf8');
      obj = JSON.parse(txt);
    } catch (e) {
      warn('versions.json parse failed; creating new structure.');
    }
  }

  // Handle sections-based structure
  if (obj && obj.sections && Array.isArray(obj.sections)) {
    let section4 = obj.sections.find(s => s.major === 4);
    
    if (section4) {
      // Update existing v4.1 entry or add it
      const v41Index = section4.rows.findIndex(r => r.version === '4.1');
      if (v41Index >= 0) {
        section4.rows[v41Index] = entry;
        log('Updated existing v4.1 entry in sections');
      } else {
        section4.rows.push(entry);
        log('Added v4.1 to existing section 4');
      }
    } else {
      // Create section 4
      obj.sections.unshift({
        major: 4,
        rows: [entry]
      });
      obj.latest_major = 4;
      log('Created new section 4 with v4.1 entry');
    }
    
    fs.writeFileSync(versionsJsonPath, JSON.stringify(obj, null, 2));
    log('Updated', path.relative(cwd, versionsJsonPath));
  } else {
    // Create new sections structure
    const newObj = {
      sections: [
        {
          major: 4,
          rows: [entry]
        }
      ],
      latest_major: 4
    };
    fs.writeFileSync(versionsJsonPath, JSON.stringify(newObj, null, 2));
    log('Created new sections-based', path.relative(cwd, versionsJsonPath));
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
    p.on('close', (code) => resolve(code));
  });
}

async function runTestsInPackage() {
  if (!fs.existsSync(dstRoot)) {
    warn('Package not found at', dstRoot);
    return 1;
  }
  log('Installing dependencies in', path.relative(cwd, dstRoot));
  let code = await run('npm', ['i'], { cwd: dstRoot });
  if (code !== 0) {
    err('npm i failed in v4.1 package.');
    return code;
  }
  log('Running tests (guardrails + unit tests)...');
  code = await run('npm', ['test'], { cwd: dstRoot });
  if (code !== 0) {
    err('Tests failed — see output above for remediation suggestions.');
    return code;
  }
  log('✅ Tests passed.');
  return 0;
}

(async function main() {
  log('Starting v4.1 mover (preserves sections structure)...');

  const action = moveOrCopySrc();
  updateVersionsJson();
  const testCode = await runTestsInPackage();

  log('--- Summary ---');
  if (action === 'already-in-public') {
    log('• Package already under /public — no move needed.');
  } else {
    log(`• Package ${action === 'moved' ? 'moved' : action === 'copied' ? 'copied' : action}.`);
  }
  log('• versions.json updated to point to static page (sections structure preserved).');
  if (testCode === 0) {
    log('• Tests: PASSED ✅');
  } else {
    log('• Tests: FAILED ❌ (see output above)');
  }

  log('\nNext steps:');
  log('1) Server will auto-restart (or manually restart if needed).');
  log('2) Open http://localhost:5000/profiles_v2.html');
  log('3) Click "page" link for v4.1 to view profile.');
  log('4) Verify: attachments download, resume pagination, calendar .ics.');
})();
