// apply-home-cleanup.mjs
import fs from 'fs/promises';
import path from 'path';

const target = path.resolve('home.html');
const backup = `${target}.${Date.now()}.bak`;
const cleaned = path.resolve('./cleaned/home.html');

try {
  const oldHtml = await fs.readFile(target, 'utf8');
  await fs.writeFile(backup, oldHtml, 'utf8');
  console.log('✅ Backup saved:', backup);

  const newHtml = await fs.readFile(cleaned, 'utf8');
  await fs.writeFile(target, newHtml, 'utf8');
  console.log('✅ home.html updated (duplicate Attachments removed).');
} catch (err) {
  console.error('❌ Error updating home.html:', err);
}
