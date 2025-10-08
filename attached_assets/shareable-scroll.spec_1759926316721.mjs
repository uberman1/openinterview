import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

test('shareable.html structure', async () => {
  const html = fs.readFileSync(path.join(process.cwd(),'client/public/shareable.html'),'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  expect(doc.querySelector('video')).toBeTruthy();
  const scrollArea = doc.querySelector('div.overflow-y-auto');
  expect(scrollArea).toBeTruthy();
  const sidebar = doc.querySelector('aside');
  expect(sidebar).toBeTruthy();
});
