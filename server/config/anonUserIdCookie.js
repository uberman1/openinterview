/**
 * Anonymous profile access uses the `anonUserId` cookie. In a cross-site iframe,
 * SameSite=Lax cookies are often not stored on the upload response or not sent on
 * later fetches, so profile_edit gets 401 and redirects to login. Widget uploads
 * set this cookie with SameSite=None; Secure (+ Partitioned) in production.
 */

export function useCrossSiteAnonCookie() {
  if (process.env.NODE_ENV === 'production') return true;
  return process.env.ANON_COOKIE_CROSS_SITE === '1';
}

export function anonUserIdSetOptions(embedThirdParty) {
  const maxAge = 365 * 24 * 60 * 60 * 1000;
  const base = { maxAge, httpOnly: false, path: '/' };

  if (embedThirdParty && useCrossSiteAnonCookie()) {
    return {
      ...base,
      secure: true,
      sameSite: 'none',
      partitioned: true,
    };
  }

  return {
    ...base,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };
}

/** Clear every variant we may have issued (Lax vs cross-site None+Partitioned). */
export function clearAnonUserIdCookie(res) {
  const prod = process.env.NODE_ENV === 'production';
  res.clearCookie('anonUserId', { path: '/', sameSite: 'lax', secure: prod });
  if (useCrossSiteAnonCookie()) {
    res.clearCookie('anonUserId', {
      path: '/',
      sameSite: 'none',
      secure: true,
      partitioned: true,
    });
  }
}
