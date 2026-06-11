/**
 * One-off: splits extracted plain text from client docx into page bodies.
 * Run: node scripts/build-help-pages.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const docxPath = path.join(root, 'public/assets_crousel/helping_docs/Help Docs_040626 (1).docx');

function extractDocxPlain(docx) {
  const xml = execSync(`unzip -p ${JSON.stringify(docx)} word/document.xml`, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  return xml
    .replace(/<w:tab[^/]*\/>/g, '\t')
    .replace(/<w:br[^/]*\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

const raw = extractDocxPlain(docxPath);

const splits = [
  { slug: '/docs/help/dashboard', start: '/docs/help/dashboard', end: '>Creating Your First OpeninterviewMetadata:' },
  { slug: '/docs/help/create-first-openinterview', start: '/docs/help/create-first-openinterview', end: '>Editing Your OpenInterviewMetadata:' },
  { slug: '/docs/help/edit-profile', start: '/docs/help/edit-profile', end: '>Sharing Your OpeninterviewMetadata' },
  { slug: '/docs/help/share-profile', start: '/docs/help/share-profile', end: '>Create Additional OpeninterivewsMetadata' },
  { slug: '/docs/help/create-new-openinterview', start: '/docs/help/create-new-openinterview', end: null }
];

function slicePage(body, i) {
  const s = splits[i];
  const a = body.indexOf(s.start);
  if (a === -1) throw new Error('start not found: ' + s.start);
  const from = a + s.start.length;
  if (!s.end) return body.slice(from).trim();
  const b = body.indexOf(s.end, from);
  if (b === -1) throw new Error('end not found: ' + s.end);
  return body.slice(from, b).trim();
}

const out = {};
for (let i = 0; i < splits.length; i++) {
  out[splits[i].slug] = slicePage(raw, i);
}
fs.writeFileSync(
  path.join(root, 'public/js/help-center/raw-bodies.json'),
  JSON.stringify(out, null, 0),
  'utf8'
);
console.log('Wrote raw-bodies.json', Object.keys(out).map((k) => [k, out[k].length]));
