// Seed Neon PostgreSQL database with test data
// Run this after init-neon.js: node server/db/seed-neon.js

import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seedNeonDatabase() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env file');
    process.exit(1);
  }
  
  console.log('🔄 Connecting to Neon PostgreSQL...');
  const pool = new Pool({ connectionString });
  
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon PostgreSQL');
    
    // Read seed data
    const seedPath = join(dirname(dirname(__dirname)), 'seed.json');
    const seedData = JSON.parse(readFileSync(seedPath, 'utf8'));
    
    console.log('🔄 Seeding database...');
    
    // Seed users
    console.log('  📝 Seeding users...');
    for (const user of seedData.users) {
      await client.query(`
        INSERT INTO users (id, email, name, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [user.id, user.email, user.name, user.role]);
    }
    console.log(`  ✅ Seeded ${seedData.users.length} users`);
    
    // Seed profiles
    console.log('  📝 Seeding profiles...');
    for (const profile of seedData.profiles) {
      await client.query(`
        INSERT INTO profiles (
          id, user_id, profile_name, title, city, location, about, summary,
          public_handle, visibility, is_default, resume_file_id,
          highlights, person, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
        profile.id,
        profile.userId,
        profile.handle || '',
        profile.title || '',
        profile.city || '',
        profile.city || '',
        profile.about || '',
        profile.summary || '',
        profile.handle || null,
        profile.status === 'active' ? 'public' : 'private',
        profile.isDefault || false,
        profile.resumeFileId || null,
        JSON.stringify(profile.highlights || []),
        JSON.stringify({ name: seedData.users.find(u => u.id === profile.userId)?.name || '' })
      ]);
    }
    console.log(`  ✅ Seeded ${seedData.profiles.length} profiles`);
    
    // Seed entitlements
    console.log('  📝 Seeding entitlements...');
    for (const user of seedData.users) {
      await client.query(`
        INSERT INTO entitlements (
          id, user_id, plan, shares_used, shares_limit, bookings_used, bookings_limit,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING
      `, [
        `ent_${user.id}`,
        user.id,
        'free',
        0,
        1,
        0,
        0
      ]);
    }
    console.log(`  ✅ Seeded ${seedData.users.length} entitlements`);
    
    // Seed files
    console.log('  📝 Seeding files...');
    for (const file of seedData.files) {
      const kind = file.mime?.includes('pdf') && file.name?.includes('resume') ? 'resume' : 'attachment';
      await client.query(`
        INSERT INTO files (id, user_id, name, mime, size_label, url, kind, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
        file.id,
        file.userId,
        file.name,
        file.mime,
        file.sizeLabel,
        file.url,
        kind
      ]);
    }
    console.log(`  ✅ Seeded ${seedData.files.length} files`);
    
    // Check results
    const { rows: userCount } = await client.query('SELECT COUNT(*) FROM users');
    const { rows: profileCount } = await client.query('SELECT COUNT(*) FROM profiles');
    const { rows: entitlementCount } = await client.query('SELECT COUNT(*) FROM entitlements');
    const { rows: fileCount } = await client.query('SELECT COUNT(*) FROM files');
    
    console.log('\n📊 Database Summary:');
    console.log(`  Users: ${userCount[0].count}`);
    console.log(`  Profiles: ${profileCount[0].count}`);
    console.log(`  Entitlements: ${entitlementCount[0].count}`);
    console.log(`  Files: ${fileCount[0].count}`);
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Database seeding complete!');
    console.log('\nTest credentials:');
    console.log('  Email: user@example.com');
    console.log('  (No password set - use Google OAuth or set password manually)');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedNeonDatabase();
