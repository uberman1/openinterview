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

/**
 * Formats a Date into a human-readable booking time string.
 * e.g. "Mon, May 25 at 12:30 PM EDT"
 * Falls back to America/New_York if timezone is missing or invalid.
 */
function formatSmsBookingTime(date, timezone) {
  const tz = (timezone && typeof timezone === 'string' && timezone.trim()) || 'America/New_York';

  const tryFormat = (tzName) => {
    const dayPart = new Intl.DateTimeFormat('en-US', {
      timeZone: tzName,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);

    const timePart = new Intl.DateTimeFormat('en-US', {
      timeZone: tzName,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);

    const tzAbbr = new Intl.DateTimeFormat('en-US', {
      timeZone: tzName,
      timeZoneName: 'short',
    }).formatToParts(date).find((p) => p.type === 'timeZoneName')?.value || '';

    return `${dayPart} at ${timePart}${tzAbbr ? ' ' + tzAbbr : ''}`;
  };

  try {
    return tryFormat(tz);
  } catch {
    try {
      return tryFormat('America/New_York');
    } catch {
      return date.toUTCString();
    }
  }
}

/**
 * Returns the best available display name for the recruiter/booker.
 * Priority: booker_name → booker_email → "Recruiter"
 */
function formatRecruiterDisplay(booking) {
  const name = (booking.booker_name || '').trim();
  const email = (booking.booker_email || '').trim();
  return name || email || 'Recruiter';
}

async function sendOwnerSmsForBooking(bookingId, buildMessage, eventLabel) {
  const baseResult = { attempted: false, success: true };

  try {
    const booking = await pgClient.getBookingById(bookingId);
    if (!booking) {
      console.warn('[sms] Booking not found, skipping SMS', bookingId);
      return { ...baseResult, attempted: false, success: false, skipped: true, reason: 'booking_not_found' };
    }

    const profile = await pgClient.getProfile(booking.profile_id);

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

    // Resolve candidate timezone from availability, fallback to New York
    const availability = await pgClient.getAvailability(booking.profile_id);
    const timezone = (availability?.timezone || '').trim() || 'America/New_York';

    const start = booking.start_time ? new Date(booking.start_time) : null;
    const timeStr = start && !isNaN(start.getTime())
      ? formatSmsBookingTime(start, timezone)
      : 'TBD';

    const recruiterDisplay = formatRecruiterDisplay(booking);

    const message = buildMessage({ booking, timeStr, recruiterDisplay });

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
    ({ timeStr, recruiterDisplay }) => {
      const lines = [
        'OpenInterview: Booking confirmed',
        '',
        timeStr !== 'TBD' ? timeStr : null,
        recruiterDisplay !== 'Recruiter' ? `From: ${recruiterDisplay}` : null,
        '',
        'View your bookings:',
        'https://openinterview.me/login-page.html',
      ].filter((v) => v !== null && v !== undefined);
      return lines.join('\n');
    },
    'booking_confirmed'
  );
}

export async function sendBookingRequestedOwnerSms(bookingId) {
  return sendOwnerSmsForBooking(
    bookingId,
    ({ timeStr, recruiterDisplay }) => {
      const lines = [
        'OpenInterview: New interview request',
        '',
        timeStr !== 'TBD' ? timeStr : null,
        recruiterDisplay !== 'Recruiter' ? `From: ${recruiterDisplay}` : null,
        '',
        'Confirm or reschedule:',
        'https://openinterview.me/login-page.html',
      ].filter((v) => v !== null && v !== undefined);
      return lines.join('\n');
    },
    'booking_requested_owner'
  );
}

export async function sendBookingCancelledOwnerSms(bookingId) {
  return sendOwnerSmsForBooking(
    bookingId,
    ({ timeStr, recruiterDisplay }) => {
      const lines = [
        'OpenInterview: Booking cancelled',
        '',
        timeStr !== 'TBD' ? timeStr : null,
        recruiterDisplay !== 'Recruiter' ? `From: ${recruiterDisplay}` : null,
        '',
        'View your bookings:',
        'https://openinterview.me/login-page.html',
      ].filter((v) => v !== null && v !== undefined);
      return lines.join('\n');
    },
    'booking_cancelled_owner'
  );
}
