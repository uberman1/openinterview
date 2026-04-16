// // ============================================================================
// // DEPRECATED: This file is no longer used in the application.
// // ============================================================================
// // 
// // All database access now goes through pg-client.js using the standard 'pg' Pool.
// // 
// // DO NOT:
// // - Import this file in any application code
// // - Call runSchema() or use the neon client
// // - Use db.getUser, db.setUser, db.getProfile, etc. from this file
// // 
// // DO:
// // - Use pg-client.js for all database operations
// // - Use docker-init.sql as the canonical schema (not schema.sql)
// // - Use process.env.DATABASE_URL as the single source of truth
// // 
// // This file is kept only as a historical reference.
// // ============================================================================

// // server/db/postgres.js
// // WP8: Postgres Database Connection (DEPRECATED)

// import { neon } from '@neondatabase/serverless';
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// let sql = null;

// /**
//  * Initialize Postgres connection
//  */
// export function initPostgres() {
//   if (!process.env.DATABASE_URL) {
//     console.warn('[postgres] DATABASE_URL not set - using in-memory fallback');
//     return null;
//   }
  
//   try {
//     sql = neon(process.env.DATABASE_URL);
//     console.log('[postgres] Connected to database');
//     return sql;
//   } catch (error) {
//     console.error('[postgres] Connection failed:', error.message);
//     return null;
//   }
// }

// /**
//  * Get the SQL client
//  */
// export function getSQL() {
//   if (!sql) {
//     sql = initPostgres();
//   }
//   return sql;
// }

// /**
//  * Run schema migration
//  */
// export async function runSchema() {
//   const client = getSQL();
//   if (!client) {
//     throw new Error('Database not connected');
//   }
  
//   const schemaPath = path.join(__dirname, 'schema.sql');
//   const schema = fs.readFileSync(schemaPath, 'utf8');
  
//   // Split by semicolons and run each statement
//   const statements = schema
//     .split(';')
//     .map(s => s.trim())
//     .filter(s => s.length > 0 && !s.startsWith('--'));
  
//   for (const statement of statements) {
//     try {
//       await client.unsafe(statement);
//     } catch (error) {
//       // Ignore "already exists" errors
//       if (!error.message.includes('already exists')) {
//         console.error('[postgres] Schema error:', error.message);
//       }
//     }
//   }
  
//   console.log('[postgres] Schema migration complete');
// }

// /**
//  * Check if database is connected
//  */
// export async function isConnected() {
//   const client = getSQL();
//   if (!client) return false;
  
//   try {
//     await client`SELECT 1`;
//     return true;
//   } catch {
//     return false;
//   }
// }

// // Database operations
// export const db = {
//   // Users
//   async getUser(id) {
//     const client = getSQL();
//     if (!client) return null;
//     const result = await client`SELECT * FROM users WHERE id = ${id}`;
//     return result[0] || null;
//   },
  
//   async getUserByEmail(email) {
//     const client = getSQL();
//     if (!client) return null;
//     const result = await client`SELECT * FROM users WHERE LOWER(email) = LOWER(${email})`;
//     return result[0] || null;
//   },
  
//   async setUser(id, data) {
//     const client = getSQL();
//     if (!client) return null;
    
//     const existing = await this.getUser(id);
//     if (existing) {
//       await client`
//         UPDATE users SET
//           email = ${data.email || existing.email},
//           name = ${data.name || existing.name},
//           password_hash = ${data.passwordHash || existing.password_hash},
//           google_id = ${data.googleId || existing.google_id},
//           avatar = ${data.avatar || existing.avatar},
//           timezone = ${data.timezone || existing.timezone},
//           role = ${data.role || existing.role},
//           updated_at = NOW()
//         WHERE id = ${id}
//       `;
//     } else {
//       await client`
//         INSERT INTO users (id, email, name, password_hash, google_id, avatar, timezone, role)
//         VALUES (${id}, ${data.email}, ${data.name}, ${data.passwordHash}, ${data.googleId}, ${data.avatar}, ${data.timezone || 'America/Los_Angeles'}, ${data.role || 'user'})
//       `;
//     }
//     return this.getUser(id);
//   },
  
//   // Profiles
//   async getProfile(id) {
//     const client = getSQL();
//     if (!client) return null;
//     const result = await client`SELECT * FROM profiles WHERE id = ${id}`;
//     if (!result[0]) return null;
//     return this.mapProfile(result[0]);
//   },
  
//   async getProfileByHandle(handle) {
//     const client = getSQL();
//     if (!client) return null;
//     const result = await client`SELECT * FROM profiles WHERE public_handle = ${handle}`;
//     if (!result[0]) return null;
//     return this.mapProfile(result[0]);
//   },
  
//   async listProfilesByUser(userId) {
//     const client = getSQL();
//     if (!client) return [];
//     const result = await client`SELECT * FROM profiles WHERE user_id = ${userId}`;
//     return result.map(this.mapProfile);
//   },
  
//   async setProfile(id, data) {
//     const client = getSQL();
//     if (!client) return null;
    
//     const existing = await this.getProfile(id);
//     if (existing) {
//       await client`
//         UPDATE profiles SET
//           title = ${data.title || existing.title},
//           city = ${data.city || existing.city},
//           about = ${data.about || existing.about},
//           video_url = ${data.video?.url || data.videoUrl || existing.video_url},
//           public_handle = ${data.publicHandle || existing.public_handle},
//           visibility = ${data.visibility || existing.visibility},
//           resume_file_id = ${data.resumeFileId || existing.resume_file_id},
//           person_name = ${data.person?.name || existing.person_name},
//           highlights = ${JSON.stringify(data.highlights || existing.highlights)},
//           skills = ${JSON.stringify(data.skills || existing.skills)},
//           social = ${JSON.stringify(data.social || existing.social)},
//           contact = ${JSON.stringify(data.contact || existing.contact)},
//           experience = ${JSON.stringify(data.experience || existing.experience)},
//           education = ${JSON.stringify(data.education || existing.education)},
//           view_count = ${data.viewCount ?? existing.view_count},
//           booking_count = ${data.bookingCount ?? existing.booking_count},
//           is_default = ${data.isDefault ?? existing.is_default},
//           updated_at = NOW()
//         WHERE id = ${id}
//       `;
//     } else {
//       await client`
//         INSERT INTO profiles (id, user_id, title, city, about, public_handle, visibility, person_name, highlights, skills, social, contact)
//         VALUES (${id}, ${data.userId}, ${data.title}, ${data.city}, ${data.about}, ${data.publicHandle}, ${data.visibility || 'private'}, ${data.person?.name}, ${JSON.stringify(data.highlights || [])}, ${JSON.stringify(data.skills || [])}, ${JSON.stringify(data.social || {})}, ${JSON.stringify(data.contact || {})})
//       `;
//     }
//     return this.getProfile(id);
//   },
  
//   mapProfile(row) {
//     return {
//       id: row.id,
//       userId: row.user_id,
//       title: row.title,
//       city: row.city,
//       about: row.about,
//       video: row.video_url ? { url: row.video_url } : null,
//       publicHandle: row.public_handle,
//       visibility: row.visibility,
//       resumeFileId: row.resume_file_id,
//       person: { name: row.person_name },
//       highlights: row.highlights || [],
//       skills: row.skills || [],
//       social: row.social || {},
//       contact: row.contact || {},
//       experience: row.experience || [],
//       education: row.education || [],
//       viewCount: row.view_count,
//       bookingCount: row.booking_count,
//       isDefault: row.is_default,
//       createdAt: row.created_at,
//       updatedAt: row.updated_at
//     };
//   },
  
//   // Entitlements
//   async getEntitlement(userId) {
//     const client = getSQL();
//     if (!client) return null;
//     const result = await client`SELECT * FROM entitlements WHERE user_id = ${userId}`;
//     if (!result[0]) {
//       // Create default entitlement
//       return this.setEntitlement(userId, {
//         plan: 'free',
//         sharesUsed: 0,
//         sharesLimit: 1,
//         bookingsUsed: 0,
//         bookingsLimit: 0
//       });
//     }
//     return this.mapEntitlement(result[0]);
//   },
  
//   async setEntitlement(userId, data) {
//     const client = getSQL();
//     if (!client) return null;
    
//     await client`
//       INSERT INTO entitlements (user_id, plan, shares_used, shares_limit, bookings_used, bookings_limit, credits_reset_at, stripe_customer_id, stripe_subscription_id, stripe_subscription_status)
//       VALUES (${userId}, ${data.plan || 'free'}, ${data.sharesUsed || 0}, ${data.sharesLimit || 1}, ${data.bookingsUsed || 0}, ${data.bookingsLimit || 0}, ${data.creditsResetAt || null}, ${data.stripeCustomerId || null}, ${data.stripeSubscriptionId || null}, ${data.stripeSubscriptionStatus || null})
//       ON CONFLICT (user_id) DO UPDATE SET
//         plan = ${data.plan || 'free'},
//         shares_used = ${data.sharesUsed || 0},
//         shares_limit = ${data.sharesLimit || 1},
//         bookings_used = ${data.bookingsUsed || 0},
//         bookings_limit = ${data.bookingsLimit || 0},
//         credits_reset_at = ${data.creditsResetAt || null},
//         stripe_customer_id = ${data.stripeCustomerId || null},
//         stripe_subscription_id = ${data.stripeSubscriptionId || null},
//         stripe_subscription_status = ${data.stripeSubscriptionStatus || null},
//         updated_at = NOW()
//     `;
//     return this.getEntitlement(userId);
//   },
  
//   mapEntitlement(row) {
//     return {
//       userId: row.user_id,
//       plan: row.plan,
//       sharesUsed: row.shares_used,
//       sharesLimit: row.shares_limit,
//       bookingsUsed: row.bookings_used,
//       bookingsLimit: row.bookings_limit,
//       creditsResetAt: row.credits_reset_at,
//       stripeCustomerId: row.stripe_customer_id,
//       stripeSubscriptionId: row.stripe_subscription_id,
//       stripeSubscriptionStatus: row.stripe_subscription_status,
//       createdAt: row.created_at,
//       updatedAt: row.updated_at
//     };
//   },
  
//   // Bookings
//   async getBooking(id) {
//     const client = getSQL();
//     if (!client) return null;
//     const result = await client`SELECT * FROM bookings WHERE id = ${id}`;
//     return result[0] ? this.mapBooking(result[0]) : null;
//   },
  
//   async setBooking(id, data) {
//     const client = getSQL();
//     if (!client) return null;
    
//     await client`
//       INSERT INTO bookings (id, profile_id, owner_id, booker_name, booker_email, message, booking_date, booking_time, duration, start_time, status, ics_content)
//       VALUES (${id}, ${data.profileId}, ${data.ownerId}, ${data.bookerName}, ${data.bookerEmail}, ${data.message}, ${data.date}, ${data.time}, ${data.duration || 30}, ${data.startTime}, ${data.status || 'confirmed'}, ${data.icsContent})
//       ON CONFLICT (id) DO UPDATE SET
//         status = ${data.status || 'confirmed'},
//         ics_content = ${data.icsContent}
//     `;
//     return this.getBooking(id);
//   },
  
//   async listBookingsByOwner(ownerId) {
//     const client = getSQL();
//     if (!client) return [];
//     const result = await client`SELECT * FROM bookings WHERE owner_id = ${ownerId} ORDER BY start_time DESC`;
//     return result.map(this.mapBooking);
//   },
  
//   mapBooking(row) {
//     return {
//       id: row.id,
//       profileId: row.profile_id,
//       ownerId: row.owner_id,
//       bookerName: row.booker_name,
//       bookerEmail: row.booker_email,
//       message: row.message,
//       date: row.booking_date,
//       time: row.booking_time,
//       duration: row.duration,
//       startTime: row.start_time,
//       status: row.status,
//       icsContent: row.ics_content,
//       createdAt: row.created_at
//     };
//   },
  
//   // Analytics
//   async recordView(profileId, visitorIp) {
//     const client = getSQL();
//     if (!client) return;
    
//     // Check for recent view from same IP
//     const recent = await client`
//       SELECT id FROM analytics 
//       WHERE profile_id = ${profileId} AND visitor_ip = ${visitorIp}
//       AND created_at > NOW() - INTERVAL '1 hour'
//     `;
    
//     if (recent.length === 0) {
//       await client`
//         INSERT INTO analytics (profile_id, event_type, visitor_ip)
//         VALUES (${profileId}, 'view', ${visitorIp})
//       `;
//       await client`
//         UPDATE profiles SET view_count = view_count + 1 WHERE id = ${profileId}
//       `;
//     }
//   },
  
//   async getProfileViews(profileId) {
//     const client = getSQL();
//     if (!client) return 0;
//     const result = await client`SELECT view_count FROM profiles WHERE id = ${profileId}`;
//     return result[0]?.view_count || 0;
//   }
// };

// export default { initPostgres, getSQL, runSchema, isConnected, db };
