// server/db/pg-client.js
// Real PostgreSQL client using pg package (NOT @neondatabase/serverless)

import pg from 'pg';
const { Pool } = pg;
import crypto from 'crypto';
import { DEFAULT_AVATAR_URL, DEFAULT_VIDEO_URL } from '../config/defaults.js';

// Initialize shared Stripe client
let stripeClient = null;
async function getStripeClient() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    const Stripe = (await import('stripe')).default;
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export let pool = null;

export async function initDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Set it in .env file.');
  }

  pool = new Pool({ connectionString });

  // Prevent process crash on transient idle socket/network errors (e.g. ETIMEDOUT).
  // We only log here; request-level code should handle query failures as usual.
  pool.on('error', (err) => {
    console.error('[pg] Pool error (non-fatal):', err?.code || err?.name || 'unknown', err?.message || err);
  });

  // Test connection
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    console.log('[pg] ✅ Connected to PostgreSQL');

    // Auto-initialize schema if tables don't exist
    await autoInitializeSchema(client);

  } finally {
    client.release();
  }

  return pool;
}

async function autoInitializeSchema(client) {
  try {
    // Check if users table exists
    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    const tablesExist = rows[0].exists;

    if (!tablesExist) {
      console.log('[pg] 🔄 Tables not found. Auto-initializing schema...');

      // Read and execute schema
      const { readFileSync } = await import('fs');
      const { fileURLToPath } = await import('url');
      const { dirname, join } = await import('path');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const schemaPath = join(__dirname, 'docker-init.sql');

      const schema = readFileSync(schemaPath, 'utf8');

      // Remove GRANT statements (may not work on all databases)
      const schemaWithoutGrants = schema
        .split('\n')
        .filter(line => !line.trim().startsWith('GRANT'))
        .join('\n');

      await client.query(schemaWithoutGrants);

      console.log('[pg] ✅ Schema auto-initialized successfully!');

      // List created tables
      const { rows: tables } = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);

      console.log('[pg] 📋 Tables created:', tables.map(t => t.table_name).join(', '));
    } else {
      console.log('[pg] ✅ Schema already exists');
    }

    // ALWAYS check for and apply WP01 enhancements (regardless of whether tables existed)
    await applyWP01Enhancements(client);

    // Apply concurrency protection migration
    await applyUniqueActiveBookingsMigration(client);

    // Create webhook table if missing (hotfix)
    await client.query(`
      CREATE TABLE IF NOT EXISTS stripe_webhook_events (
        event_id VARCHAR(255) PRIMARY KEY,
        event_type VARCHAR(255) NOT NULL,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Apply Thumbnail migration
    await applyThumbnailMigration(client);

    // Apply Recruiter Timezone migration
    await applyRecruiterTimezoneMigration(client);

    // Profile public access tokens (recruiter link exchange)
    await applyPublicAccessMigration(client);

  } catch (error) {
    console.error('[pg] ⚠️  Schema auto-initialization failed:', error.message);
    console.error('[pg] 💡 You may need to run: node server/db/init-neon.js');
    // Don't throw - allow app to continue if tables already exist
  }
}

async function applyWP01Enhancements(client) {
  try {
    console.log('[pg] 🔍 Checking WP01 enhancements...');

    // Check if status column exists in users table
    const { rows: statusCheck } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'status'
    `);

    // Check if email column is nullable
    const { rows: emailCheck } = await client.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email'
    `);

    const statusExists = statusCheck.length > 0;
    const emailNullable = emailCheck.length > 0 && emailCheck[0].is_nullable === 'YES';

    if (!statusExists || !emailNullable) {
      console.log('[pg] 🔄 Applying WP01 enhancements...');

      // Read and execute WP01 migration
      const { readFileSync } = await import('fs');
      const { fileURLToPath } = await import('url');
      const { dirname, join } = await import('path');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const migrationPath = join(__dirname, 'migrations', 'wp01-enhancements.sql');

      const migration = readFileSync(migrationPath, 'utf8');
      await client.query(migration);

      console.log('[pg] ✅ WP01 enhancements applied successfully!');

      // Verify the changes
      const { rows: verifyStatus } = await client.query(`
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
      `);

      const { rows: verifyAvatar } = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'avatar_url'
      `);

      const { rows: verifyEmail } = await client.query(`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email'
      `);

      if (verifyStatus.length > 0 && verifyAvatar.length > 0 && verifyEmail[0]?.is_nullable === 'YES') {
        console.log('[pg] ✅ WP01 enhancements verified: users.status, profiles.avatar_url, email nullable');
      }
    } else {
      console.log('[pg] ✅ WP01 enhancements already applied');
    }
  } catch (error) {
    console.error('[pg] ⚠️  WP01 enhancements failed:', error.message);
    // Don't throw - allow app to continue
  }
}

async function applyThumbnailMigration(client) {
  try {
    console.log('[pg] 🔍 Checking Thumbnail migration...');

    // Check if thumbnail_url column exists in profiles table
    const { rows: check } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' AND column_name = 'thumbnail_url'
    `);

    if (check.length === 0) {
      console.log('[pg] 🔄 Applying Thumbnail migration...');

      // Read and execute migration
      const { readFileSync } = await import('fs');
      const { fileURLToPath } = await import('url');
      const { dirname, join } = await import('path');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      // Go up one level from server/db to server/migrations
      const migrationPath = join(__dirname, '..', 'migrations', 'add-thumbnail-columns.sql');

      const migration = readFileSync(migrationPath, 'utf8');
      await client.query(migration);

      console.log('[pg] ✅ Thumbnail migration applied successfully!');
    } else {
      console.log('[pg] ✅ Thumbnail migration already applied');
    }
  } catch (error) {
    console.error('[pg] ⚠️  Thumbnail migration failed:', error.message);
  }
}

export function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

// ============ USERS ============
export async function getUser(userId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return rows[0] || null;
}

export async function getUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return rows[0] || null;
}

export async function getUserByGoogleId(googleId) {
  const { rows } = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
  return rows[0] || null;
}

export async function createUser(user) {
  const { rows } = await pool.query(`
    INSERT INTO users (id, email, name, password_hash, google_id, avatar, status, role)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    user.id,
    user.email,
    user.name,
    user.passwordHash || user.password_hash,
    user.googleId || user.google_id,
    user.avatar,
    user.status || 'registered',
    user.role || 'user'
  ]);
  return rows[0];
}

// Alias for getUserById (same as getUser)
export const getUserById = getUser;

export async function updateUser(userId, updates) {
  const fields = [];
  const values = [];
  let i = 1;

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    fields.push(`${dbKey} = $${i}`);
    values.push(value);
    i++;
  }

  values.push(userId);
  const { rows } = await pool.query(`
    UPDATE users SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $${i}
    RETURNING *
  `, values);
  return rows[0];
}

// ============ PROFILES ============
export async function getProfile(profileId) {
  const { rows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [profileId]);
  if (process.env.DEBUG_SQL) {
    console.log('[pg] getProfile', profileId, rows.length);
  }
  return rows[0] ? formatProfile(rows[0]) : null;
}

export async function getProfileByUserId(userId) {
  const { rows } = await pool.query("SELECT * FROM profiles WHERE user_id = $1 AND visibility != 'deleted' ORDER BY is_default DESC LIMIT 1", [userId]);
  return rows[0] ? formatProfile(rows[0]) : null;
}

export async function listProfilesByUser(userId) {
  const { rows } = await pool.query("SELECT * FROM profiles WHERE user_id = $1 AND visibility != 'deleted' ORDER BY created_at DESC", [userId]);
  return rows.map(formatProfile);
}

export async function getProfileByHandle(handle) {
  const { rows } = await pool.query(
    "SELECT * FROM profiles WHERE public_handle = $1 AND visibility = 'public'",
    [handle]
  );
  return rows[0] ? formatProfile(rows[0]) : null;
}

async function applyPublicAccessMigration(client) {
  try {
    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'profile_public_access'
      ) AS exists;
    `);
    if (!rows[0]?.exists) {
      console.log('[pg] 🔄 Applying profile_public_access migration...');
      const { readFileSync } = await import('fs');
      const { fileURLToPath } = await import('url');
      const { dirname, join } = await import('path');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const migrationPath = join(__dirname, 'migrations', 'add-profile-public-access.sql');
      const migration = readFileSync(migrationPath, 'utf8');
      await client.query(migration);
      console.log('[pg] ✅ profile_public_access table ready');
    } else {
      console.log('[pg] ✅ profile_public_access table exists');
    }
  } catch (error) {
    console.error('[pg] ⚠️  profile_public_access migration failed:', error.message);
  }
}

/**
 * Ensures a non-revoked access token row exists for a public profile; returns shareable exchange URL.
 * Reuses token_secret when still valid (one stable link per profile until revoked/expired).
 */
export async function ensurePublicAccessToken(profileId, baseUrl) {
  const prof = await getProfile(profileId);
  if (!prof || prof.visibility !== 'public' || !prof.publicHandle) {
    return null;
  }
  const handle = prof.publicHandle;
  const base = String(baseUrl || '').replace(/\/$/, '');
  const ttlDays = parseInt(process.env.PUBLIC_ACCESS_TOKEN_TTL_DAYS || '0', 10);

  const { rows: existingRows } = await pool.query(
    `SELECT * FROM profile_public_access WHERE profile_id = $1`,
    [profileId]
  );

  let tokenSecret;
  if (existingRows.length) {
    const row = existingRows[0];
    const revoked = row.revoked_at != null;
    const expired = row.expires_at && new Date(row.expires_at) <= new Date();
    if (!revoked && !expired) {
      tokenSecret = row.token_secret;
    } else {
      tokenSecret = crypto.randomBytes(32).toString('base64url');
      const expiresAt = ttlDays > 0 ? new Date(Date.now() + ttlDays * 864e5) : null;
      await pool.query(
        `UPDATE profile_public_access
         SET token_secret = $2, expires_at = $3, revoked_at = NULL, updated_at = NOW()
         WHERE profile_id = $1`,
        [profileId, tokenSecret, expiresAt]
      );
    }
  } else {
    tokenSecret = crypto.randomBytes(32).toString('base64url');
    const expiresAt = ttlDays > 0 ? new Date(Date.now() + ttlDays * 864e5) : null;
    await pool.query(
      `INSERT INTO profile_public_access (profile_id, token_secret, expires_at, revoked_at)
       VALUES ($1, $2, $3, NULL)`,
      [profileId, tokenSecret, expiresAt]
    );
  }

  const accessUrl = `${base}/p/access?handle=${encodeURIComponent(handle)}&t=${encodeURIComponent(tokenSecret)}`;
  return { accessUrl, publicHandle: handle };
}

export async function revokePublicAccessToken(profileId, dbClient = pool) {
  await dbClient.query(
    `UPDATE profile_public_access SET revoked_at = NOW(), updated_at = NOW() WHERE profile_id = $1`,
    [profileId]
  );
}

/** DB + token match for GET /p/access (constant-time compare on secret). */
export async function validateExchangeToken(handle, tokenSecret) {
  if (!handle || !tokenSecret) return null;
  const prof = await getProfileByHandle(handle);
  if (!prof) return null;
  const { rows } = await pool.query(
    `SELECT token_secret, expires_at FROM profile_public_access
     WHERE profile_id = $1 AND revoked_at IS NULL`,
    [prof.id]
  );
  if (!rows.length) return null;
  const row = rows[0];
  if (row.expires_at && new Date(row.expires_at) <= new Date()) return null;
  const a = Buffer.from(String(row.token_secret), 'utf8');
  const b = Buffer.from(String(tokenSecret), 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return {
    profileId: prof.id,
    publicHandle: prof.publicHandle,
    expiresAt: row.expires_at ? new Date(row.expires_at) : null
  };
}

export async function isPublicAccessGrantActive(profileId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM profile_public_access
     WHERE profile_id = $1 AND revoked_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())`,
    [profileId]
  );
  return rows.length > 0;
}

/**
 * Owner-only: set profile to private, clear public_handle, refund one share credit if it was public.
 * Refund uses the same rule as softDeleteProfile: shares_used -= 1 only when visibility was 'public', clamped with GREATEST(0, ...).
 */
export async function unpublishProfile(userId, profileId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM profiles WHERE id = $1 AND user_id = $2',
      [profileId, userId]
    );

    if (rows.length === 0) {
      throw new Error('Profile not found or access denied');
    }

    const row = rows[0];

    if (row.visibility === 'deleted') {
      throw new Error('Cannot unpublish a deleted profile');
    }

    const shareRelease = row.visibility === 'public' ? 1 : 0;

    await revokePublicAccessToken(profileId, client);

    await client.query(
      `UPDATE profiles SET visibility = 'private', public_handle = NULL, updated_at = NOW() WHERE id = $1`,
      [profileId]
    );

    if (shareRelease === 1) {
      await client.query(
        `UPDATE entitlements
         SET shares_used = GREATEST(0, shares_used - $2), updated_at = NOW()
         WHERE user_id = $1`,
        [userId, shareRelease]
      );
    }

    await client.query('COMMIT');
    return getProfile(profileId);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      /* ignore */
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Atomically publish profile + consume one share credit.
 * Keeps existing behavior but ensures share usage is not incremented if publish fails.
 */
export async function publishProfileConsumeShareAtomic({
  userId,
  profileId,
  baseHandle,
  nextShareCount,
  maxAttempts = 5
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cleanBase = String(baseHandle || '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || `profile-${String(profileId).slice(0, 6)}`;

    let updatedRow = null;
    let pickedHandle = null;

    for (let i = 0; i < maxAttempts; i++) {
      const candidate =
        i === 0
          ? cleanBase
          : i < maxAttempts - 1
            ? `${cleanBase}-${i + 1}`
            : `${cleanBase}-${crypto.randomBytes(2).toString('hex')}`;

      await client.query('SAVEPOINT sp_publish_handle');
      try {
        const { rows } = await client.query(
          `UPDATE profiles
           SET public_handle = $1, visibility = 'public', share_count = $2, updated_at = NOW()
           WHERE id = $3 AND user_id = $4
           RETURNING *`,
          [candidate, nextShareCount, profileId, userId]
        );
        if (!rows.length) {
          throw new Error('Profile not found or access denied');
        }
        updatedRow = rows[0];
        pickedHandle = candidate;
        await client.query('RELEASE SAVEPOINT sp_publish_handle');
        break;
      } catch (err) {
        await client.query('ROLLBACK TO SAVEPOINT sp_publish_handle');
        const isDup =
          err?.code === '23505' &&
          String(err?.constraint || '').includes('profiles_public_handle_key');
        if (!isDup || i === maxAttempts - 1) throw err;
      }
    }

    if (!updatedRow) {
      throw new Error('Could not reserve unique public handle');
    }

    const { rows: entRows } = await client.query(
      `UPDATE entitlements
       SET shares_used = shares_used + 1, updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      [userId]
    );
    if (!entRows.length) {
      throw new Error('Entitlement not found');
    }

    await client.query('COMMIT');
    return {
      profile: formatProfile(updatedRow),
      entitlement: entRows[0],
      publicHandle: pickedHandle
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      /* ignore */
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function createProfile(profile) {
  // Handle default profile logic
  let isDefault = false;

  if (profile.isDefault === true) {
    // If this profile should be default, set all other user profiles to non-default first
    if (profile.userId) {
      await pool.query(
        'UPDATE profiles SET is_default = false WHERE user_id = $1',
        [profile.userId]
      );
    }
    isDefault = true;
  } else {
    // If no explicit default setting, check if user has any profiles
    if (profile.userId) {
      const { rows: existingProfiles } = await pool.query(
        'SELECT COUNT(*) as count FROM profiles WHERE user_id = $1',
        [profile.userId]
      );
      // If this is the user's first profile, make it default
      isDefault = existingProfiles[0].count === 0;
    } else {
      // For anonymous users, always make it default (they only have one profile)
      isDefault = true;
    }
  }

  const { rows } = await pool.query(`
    INSERT INTO profiles (id, user_id, profile_name, title, city, location, about, summary, public_handle, visibility, is_default, person, highlights, skills, social, contact, experience, education)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *
  `, [
    profile.id,
    profile.userId,
    profile.profileName || profile.profile_name || '',
    profile.title || '',
    profile.city || '',
    profile.location || '',
    profile.about || '',
    profile.summary || '',
    profile.publicHandle || null,
    profile.visibility || 'private',
    isDefault,
    JSON.stringify(profile.person || {}),
    JSON.stringify(profile.highlights || []),
    JSON.stringify(profile.skills || []),
    JSON.stringify(profile.social || {}),
    JSON.stringify(profile.contact || {}),
    JSON.stringify(profile.experience || []),
    JSON.stringify(profile.education || [])
  ]);
  return formatProfile(rows[0]);
}

export async function ensureSingleDefaultProfile(userId) {
  if (!userId) return;

  // Get all profiles for the user that are marked as default
  const { rows } = await pool.query(
    "SELECT id FROM profiles WHERE user_id = $1 AND is_default = true AND visibility != 'deleted' ORDER BY created_at ASC",
    [userId]
  );

  if (rows.length > 1) {
    console.log(`[ensureSingleDefaultProfile] Found ${rows.length} default profiles for user ${userId}, fixing...`);

    // Keep the first (oldest) profile as default, set others to non-default
    const keepDefaultId = rows[0].id;
    const idsToUpdate = rows.slice(1).map(row => row.id);

    if (idsToUpdate.length > 0) {
      await pool.query(
        'UPDATE profiles SET is_default = false WHERE id = ANY($1)',
        [idsToUpdate]
      );
      console.log(`[ensureSingleDefaultProfile] Set ${idsToUpdate.length} profiles to non-default, kept ${keepDefaultId} as default`);
    }
  } else if (rows.length === 0) {
    // No default profile found, set the oldest profile as default
    const { rows: allProfiles } = await pool.query(
      "SELECT id FROM profiles WHERE user_id = $1 AND visibility != 'deleted' ORDER BY created_at ASC LIMIT 1",
      [userId]
    );

    if (allProfiles.length > 0) {
      await pool.query(
        'UPDATE profiles SET is_default = true WHERE id = $1',
        [allProfiles[0].id]
      );
      console.log(`[ensureSingleDefaultProfile] Set oldest profile ${allProfiles[0].id} as default for user ${userId}`);
    }
  }
}

export async function updateProfile(profileId, updates) {
  const profile = await getProfile(profileId);
  if (!profile) return null;

  const merged = { ...profile, ...updates };
  const isDefaultValue = merged.isDefault !== undefined ? merged.isDefault : merged.is_default;

  const { rows } = await pool.query(`
    UPDATE profiles SET
      user_id = $2,
      profile_name = $3,
      title = $4,
      city = $5,
      location = $6,
      about = $7,
      summary = $8,
      public_handle = $9,
      visibility = $10,
      is_default = $11,
      video_url = $12,
      video_file_id = $13,
      resume_file_id = $14,
      view_count = $15,
      booking_count = $16,
      person = $17,
      highlights = $18,
      skills = $19,
      social = $20,
      contact = $21,
      experience = $22,
      education = $23,
      thumbnail_url = $24,
      thumbnail_file_id = $25,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [
    profileId,
    merged.userId || merged.user_id,
    merged.profileName || merged.profile_name || '',
    merged.title || '',
    merged.city || '',
    merged.location || '',
    merged.about || '',
    merged.summary || '',
    merged.publicHandle || null,
    merged.visibility || 'private',
    isDefaultValue,
    merged.video_url || merged.videoUrl || null,
    merged.video_file_id || merged.videoFileId || null,
    merged.resume_file_id || merged.resumeFileId || null,
    merged.view_count || merged.viewCount || 0,
    merged.booking_count || merged.bookingCount || 0,
    JSON.stringify(merged.person || {}),
    JSON.stringify(merged.highlights || []),
    JSON.stringify(merged.skills || []),
    JSON.stringify(merged.social || {}),
    JSON.stringify(merged.contact || {}),
    JSON.stringify(merged.experience || []),
    JSON.stringify(merged.education || []),
    merged.thumbnail_url || merged.thumbnailUrl || null,
    merged.thumbnail_file_id || merged.thumbnailFileId || null
  ]);

  return formatProfile(rows[0]);
}

export async function softDeleteProfile(userId, profileId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify ownership and get profile
    const { rows: profiles } = await client.query(
      'SELECT * FROM profiles WHERE id = $1 AND user_id = $2',
      [profileId, userId]
    );

    if (profiles.length === 0) {
      throw new Error('Profile not found or access denied');
    }
    const profile = profiles[0];

    // If already deleted, do nothing (idempotent)
    if (profile.visibility === 'deleted') {
      await client.query('ROLLBACK');
      return [];
    }

    // 2. Get all associated files
    const { rows: files } = await client.query(
      'SELECT * FROM files WHERE profile_id = $1',
      [profileId]
    );

    // 3. Calculate storage to release
    let videoBytesFreed = 0;
    let docBytesFreed = 0;
    const filesToDelete = []; // List of public_ids for Cloudinary

    for (const file of files) {
      const isVideo = file.kind && file.kind.startsWith('video');
      const resourceType = isVideo ? 'video' : 'image';
      
      filesToDelete.push({ 
        public_id: file.public_id, 
        resource_type: resourceType 
      });
      
      const size = parseInt(file.size_bytes || 0, 10);
      if (isVideo) {
        videoBytesFreed += size;
      } else {
        docBytesFreed += size;
      }
    }

    // 3b. Check for "orphan" Cloudinary assets (avatar/video) not in files table
    const extractCloudinaryId = (url) => {
      if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
      try {
         const parts = url.split('/upload/');
         if (parts.length !== 2) return null;
         let afterUpload = parts[1];
         // Remove version prefix (e.g., v123456/)
         if (afterUpload.match(/^v\d+\//)) {
           afterUpload = afterUpload.replace(/^v\d+\//, '');
         }
         // Remove extension
         const lastDot = afterUpload.lastIndexOf('.');
         if (lastDot !== -1) afterUpload = afterUpload.substring(0, lastDot);
         return afterUpload;
      } catch (e) { return null; }
    };

    const avatarUrl = profile.person?.avatar_url || profile.avatar_url;
    // Ensure we don't delete the default avatar
    if (avatarUrl && avatarUrl !== DEFAULT_AVATAR_URL) {
      const avatarPublicId = extractCloudinaryId(avatarUrl);
      if (avatarPublicId && !filesToDelete.some(f => f.public_id === avatarPublicId)) {
        filesToDelete.push({ public_id: avatarPublicId, resource_type: 'image' });
      }
    }

    const videoUrl = profile.video_url;
    // Ensure we don't delete the default video
    if (videoUrl && videoUrl !== DEFAULT_VIDEO_URL) {
      const videoPublicId = extractCloudinaryId(videoUrl);
      if (videoPublicId && !filesToDelete.some(f => f.public_id === videoPublicId)) {
         // Only add if it looks like a video ID (often they are just strings, but if it's a URL we try)
         filesToDelete.push({ public_id: videoPublicId, resource_type: 'video' });
      }
    }

    // 4. Revoke recruiter access token (profile row remains for soft delete; CASCADE does not run)
    await revokePublicAccessToken(profileId, client);

    // 5. Soft delete profile
    await client.query(
      "UPDATE profiles SET visibility = 'deleted', is_default = false WHERE id = $1",
      [profileId]
    );

    // 6. Delete files from DB
    await client.query(
      'DELETE FROM files WHERE profile_id = $1',
      [profileId]
    );

    // 7. Release entitlements
    // Ensure we don't go below zero
    const shareRelease = profile.visibility === 'public' ? 1 : 0;

    await client.query(`
      UPDATE entitlements 
      SET 
        shares_used = GREATEST(0, shares_used - $5),
        views_used = GREATEST(0, views_used - $2),
        video_storage_used_bytes = GREATEST(0, video_storage_used_bytes - $3),
        doc_storage_used_bytes = GREATEST(0, doc_storage_used_bytes - $4),
        updated_at = NOW()
      WHERE user_id = $1
    `, [
      userId, 
      profile.view_count || 0, 
      videoBytesFreed, 
      docBytesFreed,
      shareRelease
    ]);

    await client.query('COMMIT');
    
    // Ensure default profile integrity if the deleted one was default (though we set it false above)
    // We should call ensureSingleDefaultProfile after commit to be safe, but it requires a separate connection/transaction context usually.
    // Since we released the client, we can call it.
    
    return filesToDelete;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function formatProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    profileName: row.profile_name,
    title: row.title,
    city: row.city,
    location: row.location,
    about: row.about,
    summary: row.summary,
    publicHandle: row.public_handle,
    visibility: row.visibility,
    video_url: row.video_url,           // ✅ Changed from videoUrl to video_url (snake_case)
    video_file_id: row.video_file_id,   // ✅ Changed from videoFileId to video_file_id (snake_case)
    thumbnail_url: row.thumbnail_url || null, // ✅ Added thumbnail_url
    thumbnail_file_id: row.thumbnail_file_id || null, // ✅ Added thumbnail_file_id
    resume_file_id: row.resume_file_id, // ✅ Changed from resumeFileId to resume_file_id (snake_case)
    view_count: row.view_count,         // ✅ Changed from viewCount to view_count (snake_case)
    booking_count: row.booking_count,   // ✅ Changed from bookingCount to booking_count (snake_case)
    is_default: row.is_default,         // ✅ Changed from isDefault to is_default (snake_case)
    avatar_url: row.person?.avatar_url || null, // ✅ Extract avatar_url from person JSONB
    person: row.person || {},
    highlights: row.highlights || [],
    skills: row.skills || [],
    social: row.social || {},
    contact: row.contact || {},
    experience: row.experience || [],
    education: row.education || [],
    created_at: row.created_at,         // ✅ Changed from createdAt to created_at (snake_case)
    updated_at: row.updated_at          // ✅ Changed from updatedAt to updated_at (snake_case)
  };
}

// ============ PLANS ============
export async function getPlans() {
  const { rows } = await pool.query('SELECT * FROM plans WHERE is_active = true ORDER BY price_cents ASC');
  return rows.map(formatPlan);
}

export async function getPlanByCode(code) {
  const { rows } = await pool.query('SELECT * FROM plans WHERE code = $1 AND is_active = true', [code]);
  return rows[0] ? formatPlan(rows[0]) : null;
}

export async function getPlanByStripePrice(stripePriceId) {
  const { rows } = await pool.query('SELECT * FROM plans WHERE stripe_price_id = $1 AND is_active = true', [stripePriceId]);
  return rows[0] ? formatPlan(rows[0]) : null;
}

export async function createPlan(plan) {
  const { rows } = await pool.query(`
    INSERT INTO plans (
      code, name, price_cents, currency, interval, 
      shares_limit, bookings_limit, 
      max_interview_length_seconds, views_limit,
      video_storage_limit_bytes, doc_storage_limit_bytes, max_resume_file_size_bytes,
      stripe_price_id, is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `, [
    plan.code,
    plan.name,
    plan.priceCents || 0,
    plan.currency || 'USD',
    plan.interval || 'month',
    plan.sharesLimit === 'unlimited' ? null : (plan.sharesLimit || 0),
    plan.bookingsLimit === 'unlimited' ? null : (plan.bookingsLimit || 0),
    plan.maxInterviewLengthSeconds || 420,
    plan.viewsLimit === 'unlimited' ? null : (plan.viewsLimit || 0),
    plan.videoStorageLimitBytes || 0,
    plan.docStorageLimitBytes || 0,
    plan.maxResumeFileSizeBytes || 5242880,
    plan.stripePriceId || null,
    plan.isActive ?? true
  ]);
  return formatPlan(rows[0]);
}

export async function updatePlan(code, updates) {
  const fields = [];
  const values = [code];
  let i = 2;

  const fieldMap = {
    name: 'name',
    priceCents: 'price_cents',
    currency: 'currency',
    interval: 'interval',
    sharesLimit: 'shares_limit',
    bookingsLimit: 'bookings_limit',
    maxInterviewLengthSeconds: 'max_interview_length_seconds',
    viewsLimit: 'views_limit',
    videoStorageLimitBytes: 'video_storage_limit_bytes',
    docStorageLimitBytes: 'doc_storage_limit_bytes',
    maxResumeFileSizeBytes: 'max_resume_file_size_bytes',
    stripePriceId: 'stripe_price_id',
    isActive: 'is_active'
  };

  for (const [key, value] of Object.entries(updates)) {
    if (fieldMap[key]) {
      fields.push(`${fieldMap[key]} = $${i}`);
      // Handle "unlimited" strings for nullable fields
      if ((key === 'sharesLimit' || key === 'bookingsLimit' || key === 'viewsLimit') && value === 'unlimited') {
        values.push(null);
      } else {
        values.push(value);
      }
      i++;
    }
  }

  if (fields.length === 0) return null;

  const { rows } = await pool.query(`
    UPDATE plans 
    SET ${fields.join(', ')}
    WHERE code = $1
    RETURNING *
  `, values);

  return rows[0] ? formatPlan(rows[0]) : null;
}

function formatPlan(row) {
  if (!row) return null;
  return {
    code: row.code,
    name: row.name,
    priceCents: row.price_cents,
    currency: row.currency,
    interval: row.interval,
    sharesLimit: row.shares_limit,
    bookingsLimit: row.bookings_limit,
    videoStorageLimitBytes: row.video_storage_limit_bytes,
    docStorageLimitBytes: row.doc_storage_limit_bytes,
    viewsLimit: row.views_limit,
    maxInterviewLengthSeconds: row.max_interview_length_seconds,
    maxResumeFileSizeBytes: row.max_resume_file_size_bytes,
    stripePriceId: row.stripe_price_id,
    isActive: row.is_active,
    isPurchasable: row.stripe_price_id !== null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ============ ENTITLEMENTS ============
export async function getEntitlement(userId) {
  const { rows } = await pool.query('SELECT * FROM entitlements WHERE user_id = $1', [userId]);
  return rows[0] ? formatEntitlement(rows[0]) : null;
}

export async function getEntitlementByStripeCustomerId(stripeCustomerId) {
  const { rows } = await pool.query('SELECT * FROM entitlements WHERE stripe_customer_id = $1', [stripeCustomerId]);
  return rows[0] ? formatEntitlement(rows[0]) : null;
}

export async function createEntitlement(entitlement) {
  // Resolve defaults from plan if not provided
  if (entitlement.sharesLimit === undefined || entitlement.bookingsLimit === undefined) {
      try {
        const planCode = entitlement.plan || 'free';
        const { rows } = await pool.query('SELECT * FROM plans WHERE code = $1', [planCode]);
        if (rows.length > 0) {
            const plan = rows[0];
            if (entitlement.sharesLimit === undefined) entitlement.sharesLimit = plan.shares_limit;
            if (entitlement.bookingsLimit === undefined) entitlement.bookingsLimit = plan.bookings_limit;
        }
      } catch (err) {
        console.error('[createEntitlement] Failed to fetch plan defaults:', err);
      }
  }

  // Fallback defaults if still undefined
  let finalSharesLimit = entitlement.sharesLimit;
  if (finalSharesLimit === undefined) finalSharesLimit = 1;
  
  let finalBookingsLimit = entitlement.bookingsLimit;
  if (finalBookingsLimit === undefined) finalBookingsLimit = 0;

  const { rows } = await pool.query(`
    INSERT INTO entitlements (user_id, plan, shares_used, shares_limit, bookings_used, bookings_limit)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    entitlement.userId,
    entitlement.plan || 'free',
    entitlement.sharesUsed || 0,
    finalSharesLimit,
    entitlement.bookingsUsed || 0,
    finalBookingsLimit
  ]);
  return formatEntitlement(rows[0]);
}

export async function updateEntitlement(userId, updates) {
  const fields = [];
  const values = [];
  let i = 1;

  // const fieldMap = {
  //   plan: 'plan',
  //   sharesUsed: 'shares_used',
  //   sharesLimit: 'shares_limit',
  //   bookingsUsed: 'bookings_used',
  //   bookingsLimit: 'bookings_limit',
  //   stripeCustomerId: 'stripe_customer_id',
  //   stripeSubscriptionId: 'stripe_subscription_id',
  //   stripeSubscriptionStatus: 'stripe_subscription_status'
  // };

  const fieldMap = {
    plan: 'plan',
    sharesUsed: 'shares_used',
    sharesLimit: 'shares_limit',
    bookingsUsed: 'bookings_used',
    bookingsLimit: 'bookings_limit',
    videoStorageUsedBytes: 'video_storage_used_bytes',
    docStorageUsedBytes: 'doc_storage_used_bytes',
    viewsUsed: 'views_used',
    creditsResetAt: 'credits_reset_at',          // ✅ FIX: persist billing reset boundary
    stripeCustomerId: 'stripe_customer_id',
    stripeSubscriptionId: 'stripe_subscription_id',
    stripeSubscriptionStatus: 'stripe_subscription_status'
  };

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = fieldMap[key] || key;
    fields.push(`${dbKey} = $${i}`);
    values.push(value);
    i++;
  }

  values.push(userId);
  const { rows } = await pool.query(`
    UPDATE entitlements SET ${fields.join(', ')}, updated_at = NOW()
    WHERE user_id = $${i}
    RETURNING *
  `, values);
  return rows[0] ? formatEntitlement(rows[0]) : null;
}





// Helper to reset monthly usage
export async function resetMonthlyUsage(userId, resetDate) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Reset entitlements
    await client.query(`
      UPDATE entitlements 
      SET bookings_used = 0, shares_used = 0, views_used = 0, credits_reset_at = $1, updated_at = NOW()
      WHERE user_id = $2
    `, [resetDate, userId]);

    // Reset profile views
    await client.query(`
      UPDATE profiles 
      SET view_count = 0, updated_at = NOW() 
      WHERE user_id = $1
    `, [userId]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Backend fallback mechanism for credit resets
export async function ensureCreditsFresh(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock entitlement row for update
    const { rows } = await client.query(`
      SELECT * FROM entitlements 
      WHERE user_id = $1 
      FOR UPDATE
    `, [userId]);

    if (rows.length === 0) {
      await client.query('COMMIT');
      return null; // No entitlement exists
    }

    const entitlement = formatEntitlement(rows[0]);

    // Handle paid users with NULL credits_reset_at
    if (!entitlement.creditsResetAt && entitlement.stripeSubscriptionId) {
      // Paid user with no reset date - populate from Stripe subscription
      try {
        const stripe = await getStripeClient();
        const subscription = await stripe.subscriptions.retrieve(entitlement.stripeSubscriptionId);
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        // Update credits_reset_at without resetting counters
        const { rows: updatedRows } = await client.query(`
          UPDATE entitlements 
          SET credits_reset_at = $1, updated_at = NOW()
          WHERE user_id = $2
          RETURNING *
        `, [currentPeriodEnd, userId]);

        await client.query('COMMIT');

        const updatedEntitlement = formatEntitlement(updatedRows[0]);
        console.log(`[ensureCreditsFresh] ✅ Populated credits_reset_at for paid user ${userId}: ${currentPeriodEnd}`);

        return updatedEntitlement;
      } catch (error) {
        console.error('[ensureCreditsFresh] Error fetching Stripe subscription for NULL reset date:', error);
        await client.query('COMMIT');
        return entitlement; // Return as-is if Stripe call fails
      }
    }

    // Check if reset is needed
    if (!entitlement.creditsResetAt) {
      await client.query('COMMIT');
      return entitlement; // No reset date set, nothing to check (free plan)
    }

    const now = new Date();
    const resetDate = new Date(entitlement.creditsResetAt);

    // If current time is past the reset date, reset is required
    if (now >= resetDate) {
      let nextResetDate = null;

      if (entitlement.stripeSubscriptionId) {
        // Paid plan - calculate next reset from Stripe subscription
        try {
            const stripe = await getStripeClient();
            // console.log(`[ensureCreditsFresh] Fetching subscription: ${entitlement.stripeSubscriptionId}`);
          
          // Check if it's a string
          const subId = typeof entitlement.stripeSubscriptionId === 'string' ? 
            entitlement.stripeSubscriptionId : 
            entitlement.stripeSubscriptionId?.id;

          if (!subId) {
             // Just warn and return existing entitlement - not critical failure
             console.warn(`[ensureCreditsFresh] No valid subscription ID for user ${userId}, skipping check`);
             await client.query('COMMIT');
             return entitlement;
          }

          const subscription = await stripe.subscriptions.retrieve(subId);
          // console.log(`[ensureCreditsFresh] Subscription status: ${subscription?.status}, end: ${subscription?.current_period_end}`);

          if (subscription && subscription.current_period_end) {
             nextResetDate = new Date(subscription.current_period_end * 1000).toISOString();
          } else {
             // Fallback if missing current_period_end (e.g. cancelled/incomplete)
             console.log('[ensureCreditsFresh] Missing current_period_end, using fallback date');
             const fallbackDate = new Date(resetDate);
             fallbackDate.setDate(fallbackDate.getDate() + 30);
             nextResetDate = fallbackDate.toISOString();
          }
        } catch (error) {
          console.error('[ensureCreditsFresh] Error fetching Stripe subscription:', error);
          // Fallback: add 30 days to current reset date
          const fallbackDate = new Date(resetDate);
          fallbackDate.setDate(fallbackDate.getDate() + 30);
          nextResetDate = fallbackDate.toISOString();
        }
      } else {
        // Free plan - no reset needed (existing semantics from credits.js)
        await client.query('COMMIT');
        return entitlement;
      }

      // Perform the reset
      const resetUpdates = {
        bookingsUsed: 0,
        viewsUsed: 0,
        creditsResetAt: nextResetDate
      };

      // Fetch current plan limits to apply new plan changes for the new month
      try {
        const planCode = entitlement.plan || 'free';
        const { rows } = await client.query('SELECT * FROM plans WHERE code = $1', [planCode]);
        if (rows.length > 0) {
           const plan = rows[0];
           resetUpdates.sharesLimit = plan.shares_limit;
           resetUpdates.bookingsLimit = plan.bookings_limit;
        }
      } catch (err) {
        console.error('[ensureCreditsFresh] Failed to fetch updated plan limits:', err);
      }

      // Reset all profile view counts for this user
      await client.query(`
        UPDATE profiles 
        SET view_count = 0, updated_at = NOW() 
        WHERE user_id = $1
      `, [userId]);

      // Only reset shares if they are monthly (follow existing semantics)
      // Based on existing code, shares are not reset for free plans
      if (entitlement.stripeSubscriptionId) {
        resetUpdates.sharesUsed = 0;
      }

      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(resetUpdates)) {
        const dbKey = key === 'bookingsUsed' ? 'bookings_used' :
          key === 'sharesUsed' ? 'shares_used' :
          key === 'sharesLimit' ? 'shares_limit' :
          key === 'bookingsLimit' ? 'bookings_limit' :
            key === 'viewsUsed' ? 'views_used' :
            key === 'creditsResetAt' ? 'credits_reset_at' : key;
        updateFields.push(`${dbKey} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }

      updateValues.push(userId);

      const { rows: updatedRows } = await client.query(`
        UPDATE entitlements 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE user_id = $${paramIndex}
        RETURNING *
      `, updateValues);

      await client.query('COMMIT');

      const updatedEntitlement = formatEntitlement(updatedRows[0]);
      console.log(`[ensureCreditsFresh] ✅ Lazy reset for user ${userId} at ${now.toISOString()}, next reset: ${nextResetDate}`);

      return updatedEntitlement;
    }

    await client.query('COMMIT');
    return entitlement; // No reset needed

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ensureCreditsFresh] Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// WP4: Atomic booking creation with credit enforcement in single transaction
export async function atomicCreateBookingWithCredit(ownerUserId, bookingPayload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock entitlement row and check limits
    const { rows } = await client.query(`
      SELECT * FROM entitlements 
      WHERE user_id = $1 
      FOR UPDATE
    `, [ownerUserId]);

    if (rows.length === 0) {
      // Create default entitlement if not exists using existing pattern
      // await client.query(`
      //   INSERT INTO entitlements (id, user_id, plan, shares_used, shares_limit, bookings_used, bookings_limit)
      //   VALUES ($1, $2, 'free', 0, 1, 0, 0)
      // `, [`ent_${Date.now()}`, ownerUserId]);
      await client.query(`
        INSERT INTO entitlements (user_id, plan, shares_used, shares_limit, bookings_used, bookings_limit)
        VALUES ($1, 'free', 0, 1, 0, 0)
      `, [ownerUserId]);


      // Re-select with lock
      const { rows: newRows } = await client.query(`
        SELECT * FROM entitlements 
        WHERE user_id = $1 
        FOR UPDATE
      `, [ownerUserId]);

      const entitlement = formatEntitlement(newRows[0]);
      const bookingsUsed = entitlement.bookingsUsed || 0;
      const bookingsLimit = entitlement.bookingsLimit;
      const effectiveLimit = bookingsLimit === null ? Infinity : (bookingsLimit ?? 0);

      // Check limit for new entitlement (free plan has 0 booking limit)
      if (bookingsUsed >= effectiveLimit) {
        await client.query('ROLLBACK');
        return {
          success: false,
          limitReached: true,
          entitlement
        };
      }
    } else {
      const entitlement = formatEntitlement(rows[0]);
      const bookingsUsed = entitlement.bookingsUsed || 0;
      const bookingsLimit = entitlement.bookingsLimit;
      const effectiveLimit = bookingsLimit === null ? Infinity : (bookingsLimit ?? 0);

      // Check if limit would be exceeded
      if (bookingsUsed >= effectiveLimit) {
        await client.query('ROLLBACK');
        return {
          success: false,
          limitReached: true,
          entitlement
        };
      }
    }

    // Create booking within same transaction
    // STRICT: Only use canonical startTime (ISO). Reject legacy scheduledDate/Time.
    const startTime = bookingPayload.startTime;
    if (!startTime) {
       throw new Error('start_time is required (ISO format)');
    }

    const { rows: bookingRows } = await client.query(`
      INSERT INTO bookings (id, profile_id, owner_id, booker_name, booker_email, message, start_time, duration, status, ics_content, recruiter_timezone)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      bookingPayload.id,
      bookingPayload.profileId,
      bookingPayload.ownerId,
      bookingPayload.bookerName,
      bookingPayload.bookerEmail,
      bookingPayload.message,
      startTime,
      bookingPayload.duration || 30,
      bookingPayload.status || 'confirmed',
      bookingPayload.icsContent,
      bookingPayload.recruiterTimezone
    ]);

    // Atomically increment booking usage within same transaction
    const { rows: updatedRows } = await client.query(`
      UPDATE entitlements 
      SET bookings_used = bookings_used + 1, updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `, [ownerUserId]);

    await client.query('COMMIT');
    return {
      success: true,
      booking: bookingRows[0],
      entitlement: formatEntitlement(updatedRows[0])
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}


// ✅ Stripe webhook idempotency: returns true if inserted (first time), false if already processed
export async function markStripeWebhookEventProcessed(eventId, eventType) {
  if (!eventId) return true; // if Stripe ever sends no id (unlikely), do not block processing
  try {
    const { rowCount } = await pool.query(
      `INSERT INTO stripe_webhook_events (event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType || 'unknown']
    );
    return rowCount === 1;
  } catch (e) {
    // Fail-open to avoid breaking production if table missing — but log loud.
    console.error('[pg] markStripeWebhookEventProcessed error:', e);
    return true;
  }
}


function formatEntitlement(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    sharesUsed: row.shares_used,
    sharesLimit: row.shares_limit,
    bookingsUsed: row.bookings_used,
    bookingsLimit: row.bookings_limit,

    // stripeCustomerId: row.stripe_customer_id,
    // stripeSubscriptionId: row.stripe_subscription_id,
    // createdAt: row.created_at,
    // updatedAt: row.updated_at

    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripeSubscriptionStatus: row.stripe_subscription_status,
    creditsResetAt: row.credits_reset_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    viewsUsed: row.views_used, // Pass raw (BigInt string) or number
    videoStorageUsedBytes: Number(row.video_storage_used_bytes || 0),
    docStorageUsedBytes: Number(row.doc_storage_used_bytes || 0)
  };
}

// ============ FILES ============
export async function createFile(file) {
  const { rows } = await pool.query(`
    INSERT INTO files (id, user_id, profile_id, name, mime, size_label, size_bytes, url, kind, public_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    file.id, 
    file.userId, 
    file.profileId, 
    file.name, 
    file.mime, 
    file.sizeLabel, 
    file.sizeBytes || 0, 
    file.url, 
    file.kind || 'attachment', 
    file.public_id || null
  ]);
  return rows[0];
}

export async function getFile(fileId) {
  const { rows } = await pool.query('SELECT * FROM files WHERE id = $1', [fileId]);
  return rows[0] || null;
}

export async function listFilesByUser(userId) {
  const { rows } = await pool.query('SELECT * FROM files WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return rows;
}

export async function listFilesByProfile(profileId) {
  const { rows } = await pool.query('SELECT * FROM files WHERE profile_id = $1 ORDER BY created_at DESC', [profileId]);
  return rows;
}

export async function deleteFile(fileId) {
  const { rowCount } = await pool.query('DELETE FROM files WHERE id = $1', [fileId]);
  return rowCount > 0;
}

export async function getAvailability(profileId) {
  const { rows } = await pool.query('SELECT * FROM availability WHERE profile_id = $1', [profileId]);
  return rows[0] ? formatAvailability(rows[0]) : null;
}

// export async function updateAvailability(profileId, data) {
//   const client = await pool.connect();
//   try {
//     await client.query('BEGIN');

//     // Ensure profile exists and get user_id
//     // const { rows: profiles } = await client.query('SELECT user_id FROM profiles WHERE id = $1', [profileId]);
//     const { rows: profiles } = await client.query(
//       `
//   SELECT p.user_id, u.timezone
//   FROM profiles p
//   JOIN users u ON u.id = p.user_id
//   WHERE p.id = $1
//   `,
//       [profileId]
//     );
//     if (!profiles.length) throw new Error('Profile not found');
//     const userId = profiles[0].user_id;

//     // Check if exists
//     const { rows: existing } = await client.query('SELECT id FROM availability WHERE profile_id = $1', [profileId]);

//     // Extract duration from rules or top-level
//     const duration = data.durationMinutes || data.rules?.durationMinutes || 30;

//     // Store the full configuration (weekly pattern + rules) in the 'slots' JSONB column
//     // This allows us to persist UI state that doesn't fit in the strict columns
//     const configPayload = {
//       weekly: data.weekly || {},
//       rules: data.rules || {}
//     };

//     let result;
//     if (existing.length) {
//       const { rows } = await client.query(`
//         UPDATE availability 
//         SET timezone = $1, duration_minutes = $2, slots = $3, updated_at = NOW()
//         WHERE profile_id = $4
//         RETURNING *
//       `, [
//         // data.timezone || 'UTC',
//         data.timezone || user.timezone || 'America/Los_Angeles',
//         duration,
//         JSON.stringify(configPayload),
//         profileId
//       ]);
//       result = rows[0];
//     } else {
//       const { rows } = await client.query(`
//         INSERT INTO availability (profile_id, user_id, timezone, duration_minutes, slots)
//         VALUES ($1, $2, $3, $4, $5)
//         RETURNING *
//       `, [
//         profileId,
//         userId,
//         data.timezone || 'UTC',
//         duration,
//         JSON.stringify(configPayload)
//       ]);
//       result = rows[0];
//     }

//     await client.query('COMMIT');
//     return formatAvailability(result);
//   } catch (e) {
//     await client.query('ROLLBACK');
//     throw e;
//   } finally {
//     client.release();
//   }
// }

export async function updateAvailability(profileId, data) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Ensure profile exists + get owner (user_id) + owner's default timezone
    const { rows: profiles } = await client.query(
      `
      SELECT p.user_id, u.timezone AS user_timezone
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = $1
      `,
      [profileId]
    );

    if (!profiles.length) throw new Error('Profile not found');

    const userId = profiles[0].user_id;
    const userTimezone = profiles[0].user_timezone;

    // Check if availability exists already (also fetch existing timezone to preserve if client doesn't send one)
    const { rows: existing } = await client.query(
      'SELECT id, timezone FROM availability WHERE profile_id = $1',
      [profileId]
    );

    const existingTimezone = existing[0]?.timezone;

    // Resolve timezone (NEVER default to UTC for availability)
    const resolvedTimezone =
      (typeof data?.timezone === 'string' && data.timezone.trim()) ||
      existingTimezone ||
      userTimezone ||
      'America/Los_Angeles';

    // Extract duration from top-level or rules (server should validate allowed durations elsewhere)
    const duration = Number(data?.durationMinutes ?? data?.duration_minutes ?? data?.rules?.durationMinutes ?? 30);

    // Persist config object in slots JSONB
    const configPayload = {
      weekly: data?.weekly || {},
      rules: { ...(data?.rules || {}), durationMinutes: duration, windowDays: 60 }
    };

    let result;

    if (existing.length) {
      const { rows } = await client.query(
        `
        UPDATE availability
        SET timezone = $1,
            duration_minutes = $2,
            slots = $3::jsonb,
            updated_at = NOW()
        WHERE profile_id = $4
        RETURNING *
        `,
        [resolvedTimezone, duration, JSON.stringify(configPayload), profileId]
      );
      result = rows[0];
    } else {
      const { rows } = await client.query(
        `
        INSERT INTO availability (profile_id, user_id, timezone, duration_minutes, slots)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING *
        `,
        [profileId, userId, resolvedTimezone, duration, JSON.stringify(configPayload)]
      );
      result = rows[0];
    }

    await client.query('COMMIT');
    return formatAvailability(result);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

function formatAvailability(row) {
  if (!row) return null;

  // The 'slots' column now holds the configuration object
  const config = row.slots || {};
  const isLegacyArray = Array.isArray(config);

  // If legacy array (actual slots), we might need to reconstruct or return empty weekly
  const weekly = isLegacyArray ? {} : (config.weekly || {});
  const rules = isLegacyArray ? {} : (config.rules || {});


  return {
    id: row.id,
    profileId: row.profile_id,
    userId: row.user_id,
    timezone: row.timezone,
    windowDays: 60, // Enforced system value
    durationMinutes: row.duration_minutes,
    weekly: weekly,
    rules: {
      ...rules,
      durationMinutes: row.duration_minutes, // Source of truth
      windowDays: 60
    }
  };
}

// ============ BOOKINGS ============
export async function createBooking(booking) {
  const startTime = booking.startTime;
  
  if (!startTime) {
    throw new Error('start_time is required');
  }

  const { rows } = await pool.query(`
    INSERT INTO bookings (id, profile_id, owner_id, booker_name, booker_email, message, start_time, duration, status, ics_content, recruiter_timezone)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    booking.id,
    booking.profileId,
    booking.ownerId,
    booking.bookerName,
    booking.bookerEmail,
    booking.message,
    startTime,
    booking.duration || 30,
    booking.status || 'confirmed',
    booking.icsContent,
    booking.recruiterTimezone
  ]);
  return rows[0];
}

export async function getBookingsByOwner(ownerId) {
  const { rows } = await pool.query('SELECT * FROM bookings WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
  return rows;
}

export async function getBookingById(id) {
  const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function updateBooking(id, updates, expectedStatus = null) {
  const fields = [];
  const values = [];
  let i = 1;

  const fieldMap = {
    status: 'status',
    message: 'message',
    startTime: 'start_time',
    duration: 'duration',
    icsContent: 'ics_content',
    recruiterTimezone: 'recruiter_timezone'
  };

  for (const [key, value] of Object.entries(updates)) {
    const dbKey = fieldMap[key] || key;
    fields.push(`${dbKey} = $${i}`);
    values.push(value);
    i++;
  }

  if (fields.length === 0) return null;

  values.push(id);
  
  let query = `
    UPDATE bookings SET ${fields.join(', ')}, updated_at = NOW()
    WHERE id = $${i}
  `;
  
  // Optimistic locking: only update if status matches expected
  if (expectedStatus) {
    i++;
    values.push(expectedStatus);
    query += ` AND status = $${i}`;
  }
  
  query += ` RETURNING *`;

  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}

async function applyRecruiterTimezoneMigration(client) {
  try {
    console.log('[pg] 🔍 Checking recruiter_timezone column...');
    
    const { rows } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' AND column_name = 'recruiter_timezone'
    `);

    if (rows.length === 0) {
      console.log('[pg] 🔄 Adding recruiter_timezone column...');
      await client.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recruiter_timezone VARCHAR(50);`);
      console.log('[pg] ✅ recruiter_timezone column added!');
    } else {
      console.log('[pg] ✅ recruiter_timezone column already exists');
    }
  } catch (error) {
    console.error('[pg] ⚠️  recruiter_timezone migration failed:', error.message);
  }
}

async function applyUniqueActiveBookingsMigration(client) {
  try {
    console.log('[pg] 🔍 Checking unique active bookings constraint...');
    
    // Check if the unique index exists
    const { rows } = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'bookings' AND indexname = 'uniq_booking_profile_start_active'
    `);

    if (rows.length === 0) {
      console.log('[pg] 🔄 Applying unique active bookings migration...');
      
      const { readFileSync } = await import('fs');
      const { fileURLToPath } = await import('url');
      const { dirname, join } = await import('path');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const migrationPath = join(__dirname, 'migrations', 'ensure-unique-active-bookings.sql');
      
      const migration = readFileSync(migrationPath, 'utf8');
      await client.query(migration);
      
      console.log('[pg] ✅ Unique active bookings constraint applied!');
    } else {
      console.log('[pg] ✅ Unique active bookings constraint already exists');
    }
  } catch (error) {
    console.error('[pg] ⚠️  Unique active bookings migration failed:', error.message);
    // Log but don't crash - manual cleanup might be needed if duplicates exist
  }
}

// Helper for atomic profile view increment + entitlement views_used update
export async function incrementProfileView(profileId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Increment profile view count
    const { rows: profileRows } = await client.query(`
      UPDATE profiles 
      SET view_count = COALESCE(view_count, 0) + 1 
      WHERE id = $1 
      RETURNING user_id, view_count
    `, [profileId]);

    if (profileRows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const userId = profileRows[0].user_id;
    const newProfileViewCount = profileRows[0].view_count;

    // 2. Calculate sum of views for all profiles of this user
    const { rows: sumRows } = await client.query(`
      SELECT SUM(view_count) as total_views 
      FROM profiles 
      WHERE user_id = $1
    `, [userId]);

    const totalViews = sumRows[0].total_views || 0;

    // 3. Update entitlements views_used
    await client.query(`
      UPDATE entitlements 
      SET views_used = $1, updated_at = NOW() 
      WHERE user_id = $2
    `, [totalViews, userId]);

    await client.query('COMMIT');
    return newProfileViewCount;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[incrementProfileView] Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getActivePlanLimits(userId) {
  const entitlement = await getEntitlement(userId);
  const planCode = entitlement?.plan || 'free';
  const plan = await getPlanByCode(planCode);

  if (!plan) {
    console.error(`[getActivePlanLimits] Plan '${planCode}' not found for user ${userId}`);
    return {
      planCode: 'free',
      maxInterviewLengthSeconds: 60,
      videoStorageLimitBytes: 0,
      docStorageLimitBytes: 0,
      maxResumeFileSizeBytes: 0,
      videoStorageUsedBytes: Number(entitlement?.videoStorageUsedBytes || 0),
      docStorageUsedBytes: Number(entitlement?.docStorageUsedBytes || 0),
      remainingVideoStorageBytes: 0,
      remainingDocStorageBytes: 0
    };
  }

  const videoUsed = BigInt(entitlement?.videoStorageUsedBytes || 0);
  const docUsed = BigInt(entitlement?.docStorageUsedBytes || 0);
  
  const videoLimit = plan.videoStorageLimitBytes !== null ? BigInt(plan.videoStorageLimitBytes) : null;
  const docLimit = plan.docStorageLimitBytes !== null ? BigInt(plan.docStorageLimitBytes) : null;

  return {
    planCode: plan.code,
    planName: plan.name,
    maxInterviewLengthSeconds: plan.maxInterviewLengthSeconds || 420,
    maxResumeFileSizeBytes: Number(plan.maxResumeFileSizeBytes || (+process.env.MAX_RESUME_MB || 5) * 1024 * 1024),
    
    videoStorageLimitBytes: videoLimit !== null ? Number(videoLimit) : null,
    docStorageLimitBytes: docLimit !== null ? Number(docLimit) : null,
    
    videoStorageUsedBytes: Number(videoUsed),
    docStorageUsedBytes: Number(docUsed),
    
    remainingVideoStorageBytes: videoLimit !== null ? Number(videoLimit - videoUsed) : null,
    remainingDocStorageBytes: docLimit !== null ? Number(docLimit - docUsed) : null
  };
}

export async function atomicUpdateStorageUsage(userId, type, deltaBytes, checkLimit = true) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { rows } = await client.query(`
      SELECT * FROM entitlements 
      WHERE user_id = $1 
      FOR UPDATE
    `, [userId]);
    
    let entitlement = rows[0];
    if (!entitlement) {
      const { rows: newRows } = await client.query(`
        INSERT INTO entitlements (user_id, plan) VALUES ($1, 'free') RETURNING *
      `, [userId]);
      entitlement = newRows[0];
    }

    let limit = null;
    if (checkLimit && deltaBytes > 0) {
      const { rows: planRows } = await client.query(`
        SELECT * FROM plans WHERE code = $1
      `, [entitlement.plan || 'free']);
      
      if (planRows.length > 0) {
        if (type === 'video') {
          limit = planRows[0].video_storage_limit_bytes;
        } else if (type === 'doc') {
          limit = planRows[0].doc_storage_limit_bytes;
        }
      }
    }

    const currentUsed = BigInt(type === 'video' ? (entitlement.video_storage_used_bytes || 0) : (entitlement.doc_storage_used_bytes || 0));
    const change = BigInt(deltaBytes);
    let newUsed = currentUsed + change;
    
    if (newUsed < 0n) newUsed = 0n;

    if (checkLimit && limit !== null && change > 0n) {
      const limitBig = BigInt(limit);
      if (newUsed > limitBig) {
        throw new Error(`Storage limit exceeded. Limit: ${limit}, New Usage: ${newUsed}`);
      }
    }

    const updateField = type === 'video' ? 'video_storage_used_bytes' : 'doc_storage_used_bytes';
    await client.query(`
      UPDATE entitlements 
      SET ${updateField} = $1, updated_at = NOW()
      WHERE user_id = $2
    `, [newUsed.toString(), userId]);

    await client.query('COMMIT');
    return { success: true, newUsage: Number(newUsed) };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default {
  initDatabase,
  getPool,
  getUser,
  getUserById,
  getUserByEmail,
  getUserByGoogleId,
  createUser,
  updateUser,
  getProfile,
  getProfileByUserId,
  getProfileByHandle,
  ensurePublicAccessToken,
  revokePublicAccessToken,
  validateExchangeToken,
  isPublicAccessGrantActive,
  listProfilesByUser,
  createProfile,
  updateProfile,
  publishProfileConsumeShareAtomic,
  unpublishProfile,
  ensureSingleDefaultProfile,
  getPlans,
  getPlanByCode,
  getPlanByStripePrice,
  getEntitlement,
  createEntitlement,
  updateEntitlement,
  atomicCreateBookingWithCredit,
  createFile,
  getFile,
  listFilesByUser,
  deleteFile,
  createBooking,
  getBookingsByOwner,
  getBookingById,
  getActivePlanLimits,
  atomicUpdateStorageUsage
};
