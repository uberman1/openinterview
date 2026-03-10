import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

test('calendar creates ICS on confirm', async () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost' });
  const { window } = dom;

  // Provide email
  window.document.getElementById('email').value = 'recruiter@example.com';

  // Load app.js
  const app = fs.readFileSync(path.join(process.cwd(), 'public', 'app.js'),'utf8');
  const scriptEl = window.document.createElement('script');
  scriptEl.textContent = app;
  window.document.body.appendChild(scriptEl);

  // Click confirm
  window.document.getElementById('confirmBookingBtn').click();

  // ICS creation should have been detected by jest.setup override
  expect(global.__ICS_CREATED__).toBe(true);
});
