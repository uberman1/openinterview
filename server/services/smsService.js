// Domain-level SMS service, keeps provider pluggable.

import { getSmsProvider } from './smsProvider.js';
import * as pgClient from '../db/pg-client.js';

const MAX_RETRIES = 3;

async function sendWithRetry(payload, attempt = 1) {
  const provider = getSmsProvider();

  const result = await provider.sendSms(payload);

  if (result.success) return result;

  const transient = isTransientError(result.errorCode, result.errorMessage);

  if (transient && attempt < MAX_RETRIES) {
    const delayMs = Math.min(15000, 1000 * Math.pow(2, attempt - 1));
    console.warn('[sms] Transient failure, retrying', { attempt, delayMs, error: result.errorMessage });
    await new Promise((r) => setTimeout(r, delayMs));
    return sendWithRetry(payload, attempt + 1);
  }

  return result;
}

function isTransientError(code, message) {
  const msg = (message || '').toLowerCase();
  if (!code && !msg) return false;
  if (msg.includes('timeout') || msg.includes('network')) return true;
  if (msg.includes('econnreset') || msg.includes('ehostunreach')) return true;
  if (msg.includes('5xx') || msg.includes('internal server error')) return true;
  return false;
}

async function sendOwnerSmsForBooking(bookingId, buildMessage, eventLabel) {
  /** @type {{attempted:boolean, success:boolean, skipped?:boolean, reason?:string, errorCode?:string, errorMessage?:string, providerMessageId?:string}} */
  const baseResult = { attempted: false, success: true };

  try {
    const booking = await pgClient.getBookingById(bookingId);
    if (!booking) {
      console.warn('[sms] Booking not found, skipping SMS', bookingId);
      return { ...baseResult, attempted: false, success: false, skipped: true, reason: 'booking_not_found' };
    }

    const profile = await pgClient.getProfile(booking.profile_id);

    // Extract phone + sms preference from profile.contact JSONB
    const contact = profile?.contact || {};
    const phone = contact.phone;
    const smsEnabled = contact.smsNotificationsEnabled === true || contact.sms_notifications_enabled === true;

    if (!smsEnabled) {
      console.log('[sms] SMS disabled in profile contact, skipping for booking', bookingId);
      return { ...baseResult, attempted: false, success: true, skipped: true, reason: 'sms_disabled' };
    }

    if (!phone) {
      console.warn('[sms] No phone present while SMS enabled, skipping for booking', bookingId);
      return { ...baseResult, attempted: false, success: true, skipped: true, reason: 'missing_phone' };
    }

    const start = booking.start_time ? new Date(booking.start_time) : null;
    const startStr = start && !isNaN(start.getTime())
      ? start.toISOString()
      : 'TBD';

    const recruiterEmail = booking.booker_email || '';

    const message = buildMessage({ booking, startStr, recruiterEmail });

    const result = await sendWithRetry({
      to: phone,
      message,
      metadata: { bookingId, event: eventLabel },
    });

    const final = {
      attempted: true,
      success: !!result.success,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      providerMessageId: result.providerMessageId,
    };

    if (!final.success) {
      console.error(`[sms] Failed to send ${eventLabel} SMS`, {
        bookingId,
        errorCode: final.errorCode,
        errorMessage: final.errorMessage,
      });
    }

    return final;
  } catch (err) {
    console.error(`[sms] Unexpected error while sending ${eventLabel} SMS`, err);
    return {
      attempted: true,
      success: false,
      errorMessage: err?.message ? String(err.message) : 'Unexpected SMS error',
    };
  }
}

export async function sendBookingConfirmedSms(bookingId) {
  return sendOwnerSmsForBooking(
    bookingId,
    ({ startStr, recruiterEmail }) =>
      [
        'Your interview booking is confirmed.',
        startStr !== 'TBD' ? `Time: ${startStr}` : null,
        recruiterEmail ? `Recruiter: ${recruiterEmail}` : null,
      ]
        .filter(Boolean)
        .join(' | '),
    'booking_confirmed'
  );
}

export async function sendBookingRequestedOwnerSms(bookingId) {
  return sendOwnerSmsForBooking(
    bookingId,
    ({ startStr, recruiterEmail }) =>
      [
        'New interview booking request received.',
        startStr !== 'TBD' ? `Time: ${startStr}` : null,
        recruiterEmail ? `Recruiter: ${recruiterEmail}` : null,
      ]
        .filter(Boolean)
        .join(' | '),
    'booking_requested_owner'
  );
}

export async function sendBookingCancelledOwnerSms(bookingId) {
  return sendOwnerSmsForBooking(
    bookingId,
    ({ startStr, recruiterEmail }) =>
      [
        'A recruiter cancelled a booking.',
        startStr !== 'TBD' ? `Time: ${startStr}` : null,
        recruiterEmail ? `Recruiter: ${recruiterEmail}` : null,
      ]
        .filter(Boolean)
        .join(' | '),
    'booking_cancelled_owner'
  );
}

