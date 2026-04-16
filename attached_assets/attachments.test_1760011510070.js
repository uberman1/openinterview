import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

test('attachment links are wired to download', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost' });
  const { window } = dom;
  // inject app.js
  const app = fs.readFileSync(path.join(process.cwd(), 'public', 'app.js'),'utf8');
  const scriptEl = window.document.createElement('script');
  scriptEl.textContent = app;
  window.document.body.appendChild(scriptEl);

  const first = window.document.querySelector('.attachment-link');
  expect(first).toBeTruthy();
  // stub click
  let clicked = false;
  const orig = window.HTMLAnchorElement.prototype.click;
  window.HTMLAnchorElement.prototype.click = function(){ clicked = true; };
  first.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true }));
  window.HTMLAnchorElement.prototype.click = orig;
  expect(clicked).toBe(true);
});
