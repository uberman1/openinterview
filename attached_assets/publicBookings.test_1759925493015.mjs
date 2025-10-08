import express from 'express';
import request from 'supertest';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = require(path.join(__dirname, '../../server/routes/publicBookings.js'));
const svc = require(path.join(__dirname, '../../server/services/booking.adapter.js'));

const app = express();
app.use(express.json());
app.use('/api/public', router);

test('GET booking returns booking', async () => {
  const res = await request(app).get('/api/public/bookings/bk_test_123?token=public-token-abc');
  expect(res.status).toBe(200);
  expect(res.body.candidateName).toBe('Alex Turner');
});

test('GET availability returns slots', async () => {
  const res = await request(app).get('/api/public/availability?bookingId=bk_test_123&date=2024-07-22');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBeGreaterThan(0);
});

test('PATCH reschedule rotates token and updates time', async () => {
  const res1 = await request(app)
    .patch('/api/public/bookings/bk_test_123/reschedule?token=public-token-abc')
    .send({ startUtc:'2024-07-22T13:00:00Z', endUtc:'2024-07-22T13:30:00Z' });
  expect(res1.status).toBe(200);
  expect(res1.body.startUtc).toBe('2024-07-22T13:00:00Z');
  const newToken = res1.body.token;
  expect(newToken).toBeDefined();

  // old token should now fail
  const oldRes = await request(app).get('/api/public/bookings/bk_test_123?token=public-token-abc');
  expect(oldRes.status).toBe(404);

  // new token should work
  const okRes = await request(app).get(`/api/public/bookings/bk_test_123?token=${newToken}`);
  expect(okRes.status).toBe(200);

  // store back for cancel test
  global.__LATEST_TOKEN__ = newToken;
});

test('DELETE cancel returns 204 with latest token', async () => {
  const tok = global.__LATEST_TOKEN__;
  const res = await request(app).delete(`/api/public/bookings/bk_test_123?token=${tok}`);
  expect([204,200]).toContain(res.status); // adapter returns 204; some envs could 200
});
