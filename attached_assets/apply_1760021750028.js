\
/**
 * Header alignment fix for home.html
 * Only wraps:
 *   <h2>My Interviews</h2> + "Create New" link
 *   <h2>My Resumes</h2>   + "Add New" link
 * into a single flex row.
 *
 * Zero other changes.
 */
import fs from 'fs';
import path from 'path';

const log = (...a) => console.log('[header-fix]', ...a);
const warn = (...a) => console.warn('[header-fix]', ...a);
const err = (...a) => console.error('[header-fix]', ...a);

function findHomeHtml(cwd) {
  const primary = require('path').join(cwd, 'public', 'home.html');
  const alt = require('path').join(cwd, 'home.html');
  if (fs.existsSync(primary)) return primary;
  if (fs.existsSync(alt)) return alt;
  return null;
}

function backupFile(p) {
  const stamp = new Date().toISOString().replace(/[-:T]/g,'').slice(0,15);
  const bak = p.replace(/\.html?$/i, `.bak-${stamp}.html`);
  fs.copyFileSync(p, bak);
  return bak;
}

function extractTagContaining(html, tag, targetText, fromIndex=0) {
  const tagOpen = `<${tag}`;
  const tIdx = html.indexOf(targetText, fromIndex);
  if (tIdx === -1) return null;
  let openIdx = html.lastIndexOf(tagOpen, tIdx);
  if (openIdx === -1) return null;
  const openEnd = html.indexOf('>', openIdx);
  if (openEnd === -1) return null;
  const closeTag = `</${tag}>`;
  const closeIdx = html.indexOf(closeTag, openEnd);
  if (closeIdx === -1) return null;
  const end = closeIdx + closeTag.length;
  return { html: html.slice(openIdx, end), start: openIdx, end };
}

function extractAnchorWithText(html, linkText, startIndex=0, stopBefore=null) {
  const linkIdx = html.indexOf(linkText, startIndex);
  if (linkIdx === -1) return null;
  if (stopBefore && linkIdx > stopBefore) return null;
  const aOpen = html.lastIndexOf('<a', linkIdx);
  if (aOpen === -1) return null;
  const aClose = html.indexOf('</a>', linkIdx);
  if (aClose === -1) return null;
  const end = aClose + 4;
  return { html: html.slice(aOpen, end), start: aOpen, end };
}

function wrapHeaderAndLink(content, headerText, linkText) {
  const h = extractTagContaining(content, 'h2', headerText, 0);
  if (!h) {
    warn(`Could not find <h2> containing "${headerText}".`);
    return { updated: content, changed: false };
  }
  const a = extractAnchorWithText(content, linkText, h.end);
  if (!a) {
    warn(`Could not find <a> containing "${linkText}" after the header.`);
    return { updated: content, changed: false };
  }
  const wrapper = `<div class="mb-4 flex items-center justify-between">` + h.html + a.html + `</div>`;
  const before = content.slice(0, h.start);
  const between = content.slice(h.end, a.start);
  const after = content.slice(a.end);
  const newContent = before + wrapper + between + after;
  return { updated: newContent, changed: true };
}

(function main() {
  const cwd = process.cwd();
  const file = findHomeHtml(cwd);
  if (!file) {
    err('home.html not found in "public/home.html" or "home.html". Aborting.');
    process.exit(1);
  }
  log('Target file:', require('path').relative(cwd, file));

  const orig = fs.readFileSync(file, 'utf8');
  const bak = backupFile(file);
  log('Backup created:', require('path').relative(cwd, bak));

  let out = orig;
  let totalChanges = 0;

  let r1 = wrapHeaderAndLink(out, 'My Interviews', 'Create New');
  out = r1.updated; if (r1.changed) totalChanges++;

  let r2 = wrapHeaderAndLink(out, 'My Resumes', 'Add New');
  out = r2.updated; if (r2.changed) totalChanges++;

  if (totalChanges === 0) {
    warn('No changes applied. Check that the page contains those exact texts:');
    warn('- <h2>My Interviews</h2> ... "Create New"');
    warn('- <h2>My Resumes</h2> ... "Add New"');
    process.exit(0);
  }

  fs.writeFileSync(file, out);
  log(`✅ Applied ${totalChanges} header alignment change(s).`);
  log('Done. Restart your server and refresh the page.');
})();
