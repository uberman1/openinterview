// server/migrations/seedToReplit.js
// Migrate seed.json data to Replit DB
// Run once on first startup

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { replitDB } from '../services/replitDB.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrateSeedData() {
  console.log('🔄 Starting seed data migration to Replit DB...');
  
  try {
    // Check if migration already done
    const migrationKey = 'migration:seed:v1';
    const alreadyMigrated = await replitDB.db.get(migrationKey);
    
    if (alreadyMigrated) {
      console.log('✅ Migration already completed. Skipping.');
      return { success: true, skipped: true };
    }
    
    // Load seed data
    const seedPath = path.join(__dirname, '../../seed.json');
    let seed;
    
    try {
      seed = JSON.parse(readFileSync(seedPath, 'utf8'));
    } catch (e) {
      console.error('❌ Failed to read seed.json:', e.message);
      return { success: false, error: 'Failed to read seed.json' };
    }
    
    const stats = {
      users: 0,
      profiles: 0,
      files: 0,
      interviews: 0,
      availability: 0,
      entitlements: 0
    };
    
    // Migrate users
    if (seed.users && Array.isArray(seed.users)) {
      for (const user of seed.users) {
        const userData = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          handle: user.handle,
          passwordHash: user.passwordHash || hashPassword('password123'), // Default password for seed users
          createdAt: user.createdAt || new Date().toISOString()
        };
        
        await replitDB.setUser(user.id, userData);
        stats.users++;
        console.log(`  ✓ Migrated user: ${user.email}`);
      }
    }
    
    // Migrate profiles
    if (seed.profiles && Array.isArray(seed.profiles)) {
      for (const profile of seed.profiles) {
        const profileData = {
          id: profile.id,
          userId: profile.userId,
          handle: profile.handle,
          isDefault: profile.isDefault || false,
          title: profile.title,
          city: profile.city,
          about: profile.about,
          summary: profile.summary,
          status: profile.status || 'draft',
          video: profile.video || '',
          links: profile.links || [],
          resumeFileId: profile.resumeFileId,
          attachmentFileIds: profile.attachmentFileIds || [],
          highlights: profile.highlights || [],
          person: profile.person || { name: '' },
          location: profile.location || profile.city,
          skills: profile.skills || [],
          social: profile.social || {},
          contact: profile.contact || {},
          visibility: profile.visibility || 'private',
          publicHandle: profile.publicHandle || null,
          shareCount: profile.shareCount || 0,
          createdAt: profile.created_at || profile.createdAt || new Date().toISOString(),
          updatedAt: profile.updated_at || profile.updatedAt || new Date().toISOString()
        };
        
        await replitDB.setProfile(profile.id, profileData);
        stats.profiles++;
        console.log(`  ✓ Migrated profile: ${profile.id} (${profile.title})`);
      }
    }
    
    // Migrate files
    if (seed.files && Array.isArray(seed.files)) {
      for (const file of seed.files) {
        const fileData = {
          id: file.id,
          userId: file.userId,
          name: file.name,
          mime: file.mime,
          sizeLabel: file.sizeLabel,
          url: file.url,
          uploadedAt: file.uploadedAt || new Date().toISOString()
        };
        
        await replitDB.setFile(file.id, fileData);
        stats.files++;
        console.log(`  ✓ Migrated file: ${file.name}`);
      }
    }
    
    // Migrate availability
    if (seed.availability && Array.isArray(seed.availability)) {
      for (const avail of seed.availability) {
        await replitDB.setAvailability(avail.userId, avail);
        stats.availability++;
        console.log(`  ✓ Migrated availability for user: ${avail.userId}`);
      }
    }
    
    // Create default entitlements for all users
    if (seed.users && Array.isArray(seed.users)) {
      for (const user of seed.users) {
        const entitlement = {
          userId: user.id,
          plan: 'free',
          sharesUsed: 0,
          sharesLimit: 1,
          bookingsUsed: 0,
          bookingsLimit: 0,
          createdAt: new Date().toISOString()
        };
        
        await replitDB.setEntitlement(user.id, entitlement);
        stats.entitlements++;
        console.log(`  ✓ Created entitlement for: ${user.email}`);
      }
    }
    
    // Mark migration as complete
    await replitDB.db.set(migrationKey, {
      completedAt: new Date().toISOString(),
      stats
    });
    
    console.log('\n✅ Migration complete!');
    console.log('   Stats:', stats);
    
    return { success: true, stats };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to hash passwords
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Run migration if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateSeedData()
    .then(result => {
      console.log('Migration result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

export default migrateSeedData;
