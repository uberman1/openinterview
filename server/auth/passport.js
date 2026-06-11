// server/auth/passport.js
// Passport configuration with real PostgreSQL

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';
import * as db from '../db/pg-client.js';
import { verifyPassword } from './password.js';

function generateId(prefix = 'usr') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// Local Strategy
passport.use(new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  async (email, password, done) => {
    try {
      const user = await db.getUserByEmail(email.toLowerCase().trim());
      if (!user) return done(null, false, { message: 'Invalid email or password' });

      const storedRaw = user.password_hash != null ? user.password_hash : user.passwordHash;
      if (
        storedRaw == null ||
        storedRaw === '' ||
        !verifyPassword(password, storedRaw)
      ) {
        return done(null, false, { message: 'Invalid email or password' });
      }
      
      return done(null, {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      });
    } catch (error) {
      return done(error);
    }
  }
));

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:process.env.GOOGLE_CALLBACK_URL ||'/auth/google/callback',
      scope: ['profile', 'email'],
      passReqToCallback: true  // WP01 Enhancement: Need access to req.session
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) return done(null, false, { message: 'No email from Google' });
        
        // Check existing user
        let user = await db.getUserByEmail(email);
        
        // WP01 Enhancement: Check for anonymous user in session
        const anonymousUserId = req.session?.anonymousUserId;
        
        if (!user && anonymousUserId) {
          // Link anonymous user to Google account
          console.log(`[auth] Linking anonymous user ${anonymousUserId} to Google account`);
          
          const { linkAnonymousUser } = await import('../services/anonymousUser.js');
          
          try {
            user = await linkAnonymousUser(anonymousUserId, {
              email,
              google_id: profile.id,
              name: profile.displayName || email.split('@')[0],
              avatar: profile.photos?.[0]?.value || ''
            });
            
            console.log(`[auth] Successfully linked anonymous user ${anonymousUserId} to Google`);
            
            // Clear anonymous user ID from session
            delete req.session.anonymousUserId;
            
          } catch (linkError) {
            console.error('[auth] Failed to link anonymous user to Google:', linkError);
            // Fall back to creating new user
          }
        }
        
        if (!user) {
          // Create new user
          const userId = generateId('usr');
          user = await db.createUser({
            id: userId,
            email,
            name: profile.displayName || email.split('@')[0],
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value || '',
            role: 'user',
            status: 'registered'
          });
          
          // Create entitlement
          await db.createEntitlement({
            id: generateId('ent'),
            userId: userId,
            plan: 'free',
            sharesUsed: 0,
            bookingsUsed: 0
          });
          
          console.log(`[auth] New Google user: ${email}`);
        } else if (!user.google_id) {
          // Link Google to existing account
          await db.updateUser(user.id, { googleId: profile.id });
        }
        
        return done(null, {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar
        });
      } catch (error) {
        return done(error);
      }
    }
  ));
  console.log('[auth] Google OAuth configured');
} else {
  console.warn('[auth] Google OAuth not configured');
}

// Serialize/Deserialize
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.getUser(id);
    if (!user) return done(null, false);
    done(null, {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      google_id: user.google_id,
      created_at: user.created_at
    });
  } catch (error) {
    done(error);
  }
});

export { generateId };
export default passport;
