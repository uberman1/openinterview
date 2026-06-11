// Central password hashing & verification (widget, signup, login, password change)
import crypto from 'crypto';

/** Strip common copy/paste junk from email / inputs */
export function normalizeLoginPassword(password) {
  return String(password ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
    .trim();
}

function sha256Hex(s) {
  return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex');
}

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024
};

/** Persist password (signup, widget convert, password change). */
export function hashPasswordForStore(plain) {
  const pwd = normalizeLoginPassword(plain);
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pwd, salt, SCRYPT_KEYLEN, SCRYPT_OPTS);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/**
 * Verify login / current-password checks.
 * - Legacy: 64-char hex = raw SHA256(utf8 password) — existing accounts + old widget sends
 * - New: scrypt$<saltB64><hashB64> — stronger, avoids ambiguous comparisons
 */
export function verifyPassword(plain, storedRaw) {
  const stored = storedRaw != null ? String(storedRaw).trim() : '';
  if (!stored) return false;
  const pwd = normalizeLoginPassword(plain);

  // Legacy SHA-256 hex (historical app behavior)
  if (/^[a-f0-9]{64}$/i.test(stored)) {
    try {
      const a = Buffer.from(sha256Hex(pwd), 'hex');
      const b = Buffer.from(stored, 'hex');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  // scrypt$<saltB64>$<hashB64>
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [, saltB64, hashB64] = parts;
    try {
      const salt = Buffer.from(saltB64, 'base64');
      const expected = Buffer.from(hashB64, 'base64');
      const derived = crypto.scryptSync(pwd, salt, expected.length, SCRYPT_OPTS);
      if (derived.length !== expected.length) return false;
      return crypto.timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }

  return false;
}

/** Dev / explicit SHA256-only checks if needed elsewhere */
export function sha256PasswordHex(plain) {
  return sha256Hex(normalizeLoginPassword(plain));
}
