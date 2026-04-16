import crypto from 'crypto';

export const RECRUITER_VIEW_COOKIE = 'oi_pub_view';

function getSecret() {
  return process.env.PUBLIC_ACCESS_COOKIE_SECRET || process.env.SESSION_SECRET || 'dev-insecure-change-me';
}

/**
 * Signed cookie: base64url(payload).hexhmac — payload { profileId, handle, exp }
 */
export function signRecruiterViewCookie(profileId, handle, expMs) {
  const payload = JSON.stringify({ profileId, handle, exp: expMs });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const secret = getSecret();
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  return `${payloadB64}.${sig}`;
}

export function verifyRecruiterViewCookie(cookieValue, expectedProfileId, expectedHandle) {
  if (!cookieValue || typeof cookieValue !== 'string') return false;
  const dot = cookieValue.lastIndexOf('.');
  if (dot === -1) return false;
  const payloadB64 = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const secret = getSecret();
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  try {
    if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      return false;
    }
  } catch {
    return false;
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return false;
  }
  if (payload.profileId !== expectedProfileId || payload.handle !== expectedHandle) {
    return false;
  }
  if (payload.exp != null && typeof payload.exp === 'number' && Date.now() > payload.exp) {
    return false;
  }
  return true;
}
