
import { initDatabase, getPool } from './pg-client.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);

async function runMigration() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    const pool = getPool();
    const client = await pool.connect();
    
    try {
      console.log('Checking files table for size_bytes column...');
      const { rows } = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'files' AND column_name = 'size_bytes'
      `);

      if (rows.length === 0) {
        console.log('Adding size_bytes column to files table...');
        await client.query(`ALTER TABLE files ADD COLUMN size_bytes BIGINT DEFAULT 0;`);
        console.log('✅ size_bytes column added successfully.');
      } else {
        console.log('✅ size_bytes column already exists.');
      }
      
      // Also update existing files? 
      // We can't really know the size unless we check Cloudinary or file system, 
      // but for now we'll leave them as 0 or NULL. 
      // The default 0 is fine.
      
    } finally {
      client.release();
    }
    
    // Close pool
    await pool.end();
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
