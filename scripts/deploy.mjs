#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { target: 'public/js', tests: 'public/tests', guards: 'public/guards', dryRun: false };
  for (let i=0;i<args.length;i++) {
    const a = args[i];
    if (a === '--target') out.target = args[++i];
    else if (a === '--tests') out.tests = args[++i];
    else if (a === '--guards') out.guards = args[++i];
    else if (a === '--dry-run') out.dryRun = true;
  }
  return out;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest, dryRun) {
  if (dryRun) return console.log(`[dry-run] copy ${src} -> ${dest}`);
  fs.copyFileSync(src, dest);
  console.log(`copied ${src} -> ${dest}`);
}

function main() {
  const { target, tests, guards, dryRun } = parseArgs();
  const guardCfgPath = path.join(ROOT, 'src', 'guards', 'guardrails.config.json');
  const guardCfg = readJSON(guardCfgPath);

  // Check that target locations are allowed
  const allowed = new Set(guardCfg.allowedTargets.map(p=>path.resolve(p)));

  const targetAbs = path.resolve(target);
  const testsAbs = path.resolve(tests);
  const guardsAbs = path.resolve(guards);

  for (const loc of [targetAbs, testsAbs, guardsAbs]) {
    if (![...allowed].some(a => loc.startsWith(a))) {
      console.error(`ERROR: Target ${loc} is not within an allowedTargets path.`);
      process.exit(2);
    }
  }

  // Refuse to overwrite protected files anywhere
  const protectedSet = new Set(guardCfg.protectedFiles.map(p=>path.resolve(p)));

  // Map of source -> destination subfolders
  const plan = [
    { srcDir: path.join(ROOT, 'src', 'js'), destDir: targetAbs },
    { srcDir: path.join(ROOT, 'src', 'guards'), destDir: guardsAbs },
    { srcDir: path.join(ROOT, 'tests', 'playwright'), destDir: path.join(testsAbs, 'playwright') },
  ];

  for (const step of plan) {
    ensureDir(step.destDir);
    const files = fs.readdirSync(step.srcDir);
    for (const file of files) {
      const src = path.join(step.srcDir, file);
      const dest = path.join(step.destDir, file);

      // Never overwrite existing files unless explicitly allowed
      if (fs.existsSync(dest)) {
        console.error(`ERROR: Destination exists and overwrite is not allowed: ${dest}`);
        process.exit(3);
      }

      // Guard: ensure we are not targeting a protected file path (paranoid check)
      if ([...protectedSet].some(p => dest === p)) {
        console.error(`ERROR: Attempt to overwrite protected file: ${dest}`);
        process.exit(4);
      }

      copyFile(src, dest, dryRun);
    }
  }

  console.log('✅ Deploy completed.');
}
main();
