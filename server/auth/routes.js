// server/auth/routes.js
// Authentication routes with real PostgreSQL

import express from 'express';
import passport from './passport.js';
import crypto from 'crypto';
import db from '../db/pg-client.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import * as mailer from '../services/mailer.js';
import * as emailTemplates from '../services/emailTemplates.js';

import { hashPasswordForStore, verifyPassword } from './password.js';
import { clearAnonUserIdCookie } from '../config/anonUserIdCookie.js';

const router = express.Router();

function generateId(prefix = 'usr') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// Email/Password Signup
router.post('/signup', authRateLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check existing
    const existing = await db.getUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    // WP01 Enhancement: Check for anonymous user in session OR cookie
    let anonymousUserId = req.session?.anonymousUserId || req.cookies?.anonUserId;
    let user;
    let linkedProfile = false;
    
    if (anonymousUserId) {
      // Link anonymous user to authenticated account
      console.log(`[auth] Linking anonymous user ${anonymousUserId} to new account`);
      
      const { linkAnonymousUser } = await import('../services/anonymousUser.js');
      
      try {
        user = await linkAnonymousUser(anonymousUserId, {
          email: normalizedEmail,
          password_hash: hashPasswordForStore(password),
          name: name || normalizedEmail.split('@')[0]
        });
        
        linkedProfile = true;
        console.log(`[auth] Successfully linked anonymous user ${anonymousUserId}`);
        
        // Clear anonymous user ID from session
        delete req.session.anonymousUserId;
        
        // Also clear the cookie since user is now registered
        clearAnonUserIdCookie(res);

      } catch (linkError) {
        console.error('[auth] Failed to link anonymous user:', linkError);
        // Fall back to creating new user
        anonymousUserId = null;
      }
    }
    
    if (!anonymousUserId) {
      // Create new user (no anonymous user to link)
      const userId = generateId('usr');
      user = await db.createUser({
        id: userId,
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        passwordHash: hashPasswordForStore(password),
        role: 'user',
        status: 'registered'
      });
      
      // // Create profile immediately
      // const profileId = generateId('prof');
      // await db.createProfile({
      //   id: profileId,
      //   userId: userId,
      //   person: { name: user.name },
      //   contact: { email: normalizedEmail },
      //   isDefault: true
      // });
      
      console.log(`[auth] Created user ${userId}`);
    }
    
    // Create entitlement (fetch defaults from plan)
    const existingEntitlement = await db.getEntitlement(user.id);
    if (!existingEntitlement) {
      await db.createEntitlement({
        id: generateId('ent'),
        userId: user.id,
        plan: 'free',
        sharesUsed: 0,
        bookingsUsed: 0
      });
    }
    
    // Auto-login
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
      res.status(201).json({ 
        user: { id: user.id, email: user.email, name: user.name },
        message: 'Account created',
        linkedProfile: linkedProfile
      });
    });
  } catch (error) {
    // console.log('[auth] Signup error:', error);
    console.error('[auth] Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: transfer all anonymous-owned profiles to the authenticated user
async function transferAnonProfiles(anonUserId, authenticatedUserId) {
  try {
    const anonUser = await db.getUserById(anonUserId);
    if (!anonUser || anonUser.status !== 'anonymous') return;

    const anonProfiles = await db.listProfilesByUser(anonUserId);
    if (!anonProfiles || anonProfiles.length === 0) return;

    const userProfiles = await db.listProfilesByUser(authenticatedUserId);
    const hasExistingDefault = userProfiles.some(p => p.is_default);

    for (const profile of anonProfiles) {
      let shouldBeDefault = profile.is_default;
      if (hasExistingDefault && profile.is_default) {
        shouldBeDefault = false;
      } else if (!hasExistingDefault && !profile.is_default) {
        shouldBeDefault = true;
      }

      await db.updateProfile(profile.id, {
        userId: authenticatedUserId,
        isDefault: shouldBeDefault
      });
      console.log(`[auth] Transferred profile ${profile.id} from anon ${anonUserId} to user ${authenticatedUserId}`);
    }

    // Transfer any files owned by the anon user
    try {
      const pool = db.getPool();
      await pool.query('UPDATE files SET user_id = $1 WHERE user_id = $2', [authenticatedUserId, anonUserId]);
    } catch (fileErr) {
      console.error('[auth] Error transferring files:', fileErr);
    }

    await db.ensureSingleDefaultProfile(authenticatedUserId);
    console.log(`[auth] Completed profile transfer from anon ${anonUserId} to user ${authenticatedUserId}`);
  } catch (err) {
    console.error('[auth] transferAnonProfiles error:', err);
  }
}

// Email/Password Login
router.post('/login', authRateLimiter, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    
    req.login(user, async (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Always attempt to transfer any anon profiles before clearing the cookie
      const anonUserId = req.session?.anonymousUserId || req.cookies?.anonUserId;
      let linkedProfile = false;
      if (anonUserId && anonUserId !== user.id) {
        await transferAnonProfiles(anonUserId, user.id);
        linkedProfile = true;
      }

      // Now safe to clear anon context
      delete req.session.anonymousUserId;
      clearAnonUserIdCookie(res);

      res.json({ 
        user: { id: user.id, email: user.email, name: user.name },
        message: 'Login successful',
        linkedProfile
      });
    });
  })(req, res, next);
});

// Google OAuth
router.get('/google', (req, res, next) => {
  if (req.query.returnTo) {
    req.session.returnTo = req.query.returnTo;
  }
  // Do NOT clear anonUserId here - transfer happens server-side in the callback
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-page.html?error=google_failed' }),
  async (req, res) => {
    try {
      const anonUserId = req.session?.anonymousUserId || req.cookies?.anonUserId;
      if (anonUserId && anonUserId !== req.user.id) {
        await transferAnonProfiles(anonUserId, req.user.id);
      }
    } catch (e) {
      console.error('[auth] Post-Google profile transfer error:', e);
    }

    // Clear anon context after transfer
    delete req.session.anonymousUserId;
    clearAnonUserIdCookie(res);

    const returnTo = req.session.returnTo || '/dashboard.html';
    delete req.session.returnTo;
    res.redirect(returnTo);
  }
);

// Get current user
router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ 
    user: { 
      id: req.user.id, 
      email: req.user.email, 
      name: req.user.name, 
      avatar: req.user.avatar,
      role: req.user.role,
      google_id: req.user.google_id,
      created_at: req.user.created_at
    }
  });
});

// Update password
router.put('/password', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    // Get user with password hash
    const user = await db.getUserById(req.user.id);
    
    const stored = user.password_hash ?? user.passwordHash;
    if (!user || !stored) {
      return res.status(400).json({ error: 'User not found or no password set' });
    }

    if (!verifyPassword(currentPassword, stored)) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    await db.updateUser(req.user.id, { passwordHash: hashPasswordForStore(newPassword) });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('[auth] Password update error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/password', (req, res) => {
  // Forward to PUT handler
  const { currentPassword, newPassword } = req.body;
  req.method = 'PUT';
  // Re-emit or just call the handler if it was a named function, but here we can just duplicate logic or redirect
  // Easier to just use the same handler logic or redirect internally. 
  // Express router doesn't easily support "call other route".
  // Let's just duplicate the handler or make it a named function.
  // Actually, I'll just make the PUT handler named.
  return updatePassword(req, res);
});

async function updatePassword(req, res) {
   if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const user = await db.getUserById(req.user.id);
    
    const stored = user.password_hash ?? user.passwordHash;
    if (!user || !stored) {
      return res.status(400).json({ error: 'User not found or no password set' });
    }

    if (!verifyPassword(currentPassword, stored)) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    await db.updateUser(req.user.id, { passwordHash: hashPasswordForStore(newPassword) });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('[auth] Password update error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Update current user (Support both PUT and POST)
async function updateCurrentUser(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const { name, avatar } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    const updatedUser = await db.updateUser(req.user.id, updates);
    
    // Update session user
    req.user.name = updatedUser.name;
    req.user.avatar = updatedUser.avatar;
    
    res.json({ 
      user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, avatar: updatedUser.avatar },
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('[auth] Update error:', error);
    res.status(500).json({ error: error.message });
  }
}

router.put('/me', updateCurrentUser);
router.post('/me', updateCurrentUser);

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: err.message });
    req.session.destroy(() => {
      clearAnonUserIdCookie(res);
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
});

router.get('/status', (req, res) => {
  res.json({
    authenticated: !!req.user,
    user: req.user ? { id: req.user.id, email: req.user.email, name: req.user.name, avatar: req.user.avatar } : null
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Widget flow: convert anonymous → registered + email magic link
// ─────────────────────────────────────────────────────────────────────────────

function generateRandomPassword(length = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  return Array.from(crypto.randomBytes(length))
    .map(b => chars[b % chars.length])
    .join('');
}

async function createMagicToken(userId) {
  const pool = db.getPool();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenId = `mlt_${crypto.randomBytes(8).toString('hex')}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query(
    `INSERT INTO magic_login_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [tokenId, userId, tokenHash, expiresAt]
  );
  return rawToken;
}

async function consumeMagicToken(rawToken) {
  const pool = db.getPool();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const result = await pool.query(
    `UPDATE magic_login_tokens
        SET used_at = NOW()
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING user_id`,
    [tokenHash]
  );

  if (result.rowCount === 0) return null;
  return result.rows[0].user_id;
}

// POST /auth/convert-anonymous
// Widget only — converts current anonymous user to registered, sends welcome email.
router.post('/convert-anonymous', authRateLimiter, async (req, res) => {
  try {
    const { email, profileId } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Resolve anonymous user from session / cookie
    const anonymousUserId = req.session?.anonymousUserId || req.cookies?.anonUserId;
    if (!anonymousUserId) {
      return res.status(400).json({ error: 'No active anonymous session found. Please start over.' });
    }

    // Optional: verify the profileId belongs to this anonymous user (defense-in-depth)
    if (profileId) {
      const profile = await db.getProfile(profileId);
      if (profile && profile.userId !== anonymousUserId) {
        return res.status(403).json({ error: 'Profile does not belong to the current session.' });
      }
    }

    // Check email not already registered to a *different* user
    const existing = await db.getUserByEmail(normalizedEmail);
    if (existing && existing.id !== anonymousUserId) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
    }

    // Generate random password and convert
    const plainPassword = generateRandomPassword();
    const { linkAnonymousUser } = await import('../services/anonymousUser.js');

    const anonUser = await db.getUserById(anonymousUserId);
    if (!anonUser) {
      return res.status(400).json({ error: 'Session expired. Please upload your resume again.' });
    }
    if (anonUser.status !== 'anonymous') {
      return res.status(400).json({ error: 'This account is already registered.' });
    }

    const user = await linkAnonymousUser(anonymousUserId, {
      email: normalizedEmail,
      password_hash: hashPasswordForStore(plainPassword),
      name: anonUser.name || normalizedEmail.split('@')[0],
    });

    // Ensure entitlement exists (same as /auth/signup)
    const existingEntitlement = await db.getEntitlement(user.id);
    if (!existingEntitlement) {
      await db.createEntitlement({
        id: generateId('ent'),
        userId: user.id,
        plan: 'free',
        sharesUsed: 0,
        bookingsUsed: 0,
      });
    }

    // Generate magic login token
    const rawToken = await createMagicToken(user.id);
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const magicLinkUrl = `${baseUrl}/auth/magic-login?token=${rawToken}`;

    // Send welcome email (fire-and-forget; don't fail the request if email is down)
    const { subject, html } = emailTemplates.widgetAccountWelcome({
      name: user.name,
      email: normalizedEmail,
      plainPassword,
      magicLinkUrl,
    });
    mailer.sendMail({ to: normalizedEmail, subject, html }).catch(err =>
      console.error('[widget-convert] Email send failed:', err)
    );

    // Clear anonymous session context
    delete req.session.anonymousUserId;
    clearAnonUserIdCookie(res);

    console.log(`[widget-convert] Converted anonymous user ${anonymousUserId} → ${normalizedEmail}`);
    res.json({ success: true });

  } catch (error) {
    console.error('[widget-convert] Error:', error);
    res.status(500).json({ error: error.message || 'Conversion failed. Please try again.' });
  }
});

// GET /auth/magic-login?token=...
// Validates single-use token, logs the user in, redirects to dashboard.
router.get('/magic-login', authRateLimiter, async (req, res) => {
  const rawToken = typeof req.query.token === 'string' ? req.query.token.trim() : '';

  if (!rawToken) {
    return res.redirect('/login-page.html?error=invalid_magic_link');
  }

  try {
    const userId = await consumeMagicToken(rawToken);

    if (!userId) {
      return res.redirect('/login-page.html?error=magic_link_expired');
    }

    const user = await db.getUserById(userId);
    if (!user) {
      return res.redirect('/login-page.html?error=magic_link_expired');
    }

    req.login(user, (err) => {
      if (err) {
        console.error('[magic-login] Login error:', err);
        return res.redirect('/login-page.html?error=login_failed');
      }
      // Clear any lingering anon context
      delete req.session.anonymousUserId;
      clearAnonUserIdCookie(res);
      console.log(`[magic-login] User ${userId} logged in via magic link`);
      res.redirect('/dashboard.html');
    });

  } catch (error) {
    console.error('[magic-login] Error:', error);
    res.redirect('/login-page.html?error=login_failed');
  }
});

export default router;
