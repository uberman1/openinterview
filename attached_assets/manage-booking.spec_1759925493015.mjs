import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

test('manage-booking.html contains key elements', async () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'client/public/manage-booking.html'),'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  expect(doc.querySelector('h1')?.textContent).toMatch(/Manage Booking/);
  expect(doc.querySelector('#times-grid')).toBeTruthy();
  expect(doc.querySelector('#btn-reschedule')).toBeTruthy();
  expect(doc.querySelector('#btn-cancel')).toBeTruthy();
});

test('booking-success.js exposes showBookingSuccess', async () => {
  const html = '<!doctype html><html><body></body></html>';
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const code = fs.readFileSync(path.join(process.cwd(), 'client/public/js/booking-success.js'),'utf8');
  dom.window.eval(code);
  expect(typeof dom.window.showBookingSuccess).toBe('function');
});
