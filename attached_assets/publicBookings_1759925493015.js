const router = require('express').Router();
const svc = require('../services/booking.adapter');

// GET booking
router.get('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;
    const booking = await svc.getBookingByIdToken(id, token);
    if (!booking) return res.sendStatus(404);
    res.json(booking);
  } catch (e) {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// PATCH reschedule
router.patch('/bookings/:id/reschedule', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;
    const { startUtc, endUtc } = req.body || {};
    const updated = await svc.rescheduleBooking({ id, token, startUtc, endUtc });
    if (!updated) return res.status(400).json({ error: 'RESCHEDULE_FAILED' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// DELETE cancel
router.delete('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;
    const ok = await svc.cancelBooking({ id, token });
    if (!ok) return res.status(400).json({ error: 'CANCEL_FAILED' });
    res.sendStatus(204);
  } catch (e) {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET availability for a date (YYYY-MM-DD)
router.get('/availability', async (req, res) => {
  try {
    const { bookingId, date } = req.query;
    const slots = await svc.getAvailability({ bookingId, date });
    res.json(slots || []);
  } catch (e) {
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

module.exports = router;
