import fs from 'fs';
import path from 'path';

const root = process.cwd();
const htmlPath = path.join(root, 'public', 'index.html');
const snapPath = path.join(root, 'tests', 'snapshots', 'ui.snapshot.html');

function normalize(s) {
  return s.replace(/\s+/g, ' ').trim();
}

// Regions to lock (start/end markers are HTML comments inserted in snapshot only)
const regions = [
  { name: 'HEADER_VIDEO_BLOCK', start: '<!-- REGION:HEADER_VIDEO_BLOCK_START -->', end: '<!-- REGION:HEADER_VIDEO_BLOCK_END -->' },
  { name: 'ATTACHMENTS_SECTION', start: '<!-- REGION:ATTACHMENTS_SECTION_START -->', end: '<!-- REGION:ATTACHMENTS_SECTION_END -->' },
  { name: 'RESUME_SECTION', start: '<!-- REGION:RESUME_SECTION_START -->', end: '<!-- REGION:RESUME_SECTION_END -->' },
  { name: 'CALENDAR_CARD', start: '<!-- REGION:CALENDAR_CARD_START -->', end: '<!-- REGION:CALENDAR_CARD_END -->' }
];

function sliceRegion(html, start, end) {
  const i = html.indexOf(start);
  const j = html.indexOf(end);
  if (i === -1 || j === -1 || j <= i) return null;
  return html.slice(i + start.length, j);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const snap = fs.readFileSync(snapPath, 'utf8');

let failed = false;

for (const reg of regions) {
  const a = sliceRegion(snap, reg.start, reg.end);
  const b = sliceRegion(html, reg.start, reg.end);
  if (!a || !b) {
    console.error(`❌ Guardrail region not found: ${reg.name}. Make sure snapshot markers exist in both files.`);
    failed = true;
    continue;
  }
  if (normalize(a) !== normalize(b)) {
    console.error(`❌ UI drift detected in region: ${reg.name}`);
    console.error(`• Suggestion: Revert structural/class changes in this region to match the snapshot.`);
    failed = true;
  } else {
    console.log(`✅ ${reg.name} matches snapshot.`);
  }
}

if (failed) process.exit(1);
else console.log('✅ All guardrails passed.');
