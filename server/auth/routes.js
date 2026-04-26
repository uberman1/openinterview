// server/auth/routes.js
// Authentication routes with real PostgreSQL

import express from 'express';
import passport from './passport.js';
import crypto from 'crypto';
import db from '../db/pg-client.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

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
          password_hash: hashPassword(password),
          name: name || normalizedEmail.split('@')[0]
        });
        
        linkedProfile = true;
        console.log(`[auth] Successfully linked anonymous user ${anonymousUserId}`);
        
        // Clear anonymous user ID from session
        delete req.session.anonymousUserId;
        
        // Also clear the cookie since user is now registered
        res.clearCookie('anonUserId');
        
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
        passwordHash: hashPassword(password),
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

// Email/Password Login
router.post('/login', authRateLimiter, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      const returnTo = String(req.body?.returnTo || '');
      const shouldKeepAnonymousProfile =
        returnTo.includes('/profile_edit.html') ||
        returnTo.includes('/owner_preview.html') ||
        req.body?.action === 'share';

      if (!shouldKeepAnonymousProfile && req.session) {
        delete req.session.anonymousUserId;
        res.clearCookie('anonUserId');
      }

      res.json({ 
        user: { id: user.id, email: user.email, name: user.name },
        message: 'Login successful'
      });
    });
  })(req, res, next);
});

// Google OAuth
router.get('/google', (req, res, next) => {
  if (req.query.returnTo) {
    req.session.returnTo = req.query.returnTo;
  }
  const returnTo = String(req.query.returnTo || '');
  const shouldKeepAnonymousProfile =
    returnTo.includes('/profile_edit.html') ||
    returnTo.includes('/owner_preview.html') ||
    req.query.action === 'share';

  if (!shouldKeepAnonymousProfile && req.session) {
    delete req.session.anonymousUserId;
    res.clearCookie('anonUserId');
  }

  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-page.html?error=google_failed' }),
  async (req, res) => {
    // After Google login, ensure profile exists and create first free share
    try {
      // const userId = req.user.id;
      // let profile = await db.getProfileByUserId(userId);
      
      // if (!profile) {
      //   // Create profile
      //   const profileId = generateId('prof');
      //   profile = await db.createProfile({
      //     id: profileId,
      //     userId: userId,
      //     person: { name: req.user.name },
      //     contact: { email: req.user.email },
      //     isDefault: true
      //   });
      // }
      
      // // Check if first login (no shares used yet) - auto-create share
      // const entitlement = await db.getEntitlement(userId);
      // if (entitlement && entitlement.sharesUsed === 0 && !profile.publicHandle) {
      //   // Create first free share automatically
      //   const handle = `${req.user.name?.toLowerCase().replace(/\s+/g, '-') || 'user'}-${Date.now().toString(36)}`;
      //   await db.updateProfile(profile.id, {
      //     publicHandle: handle,
      //     visibility: 'public'
      //   });
      //   await db.updateEntitlement(userId, { sharesUsed: 1 });
      //   console.log(`[auth] Auto-created first share for ${userId}: ${handle}`);
      // }
    } catch (e) {
      console.error('[auth] Post-Google setup error:', e);
    }
    
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
      google_id: req.user.google_id
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
    
    if (!user || !user.password_hash) {
      return res.status(400).json({ error: 'User not found or no password set' });
    }

    // Verify current password
    const currentHash = hashPassword(currentPassword);
    if (currentHash !== user.password_hash) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    // Update password
    const newHash = hashPassword(newPassword);
    
    // We need a direct update for password as updateUser might not handle it or we want to be explicit
    // Using db.updateUser if it supports generic updates, but pg-client.js updateUser maps camelCase to snake_case columns
    // user.password_hash is snake_case. updateUser takes { passwordHash: ... } likely?
    // Let's check updateUser in pg-client.js again.
    // It maps keys: key.replace(/([A-Z])/g, '_$1').toLowerCase()
    // So passwordHash -> password_hash.
    
    await db.updateUser(req.user.id, { passwordHash: newHash });

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
    
    if (!user || !user.password_hash) {
      return res.status(400).json({ error: 'User not found or no password set' });
    }

    const currentHash = hashPassword(currentPassword);
    if (currentHash !== user.password_hash) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const newHash = hashPassword(newPassword);
    await db.updateUser(req.user.id, { passwordHash: newHash });

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
      res.clearCookie('anonUserId');
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

export default router;
