// Initialize Neon PostgreSQL database with schema
// Run this once: node server/db/init-neon.js

import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initNeonDatabase() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env file');
    process.exit(1);
  }
  
  console.log('🔄 Connecting to Neon PostgreSQL...');
  const pool = new Pool({ connectionString });
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to Neon PostgreSQL');
    
    // Read schema file
    const schemaPath = join(__dirname, 'docker-init.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    console.log('🔄 Running schema initialization...');
    
    // Execute schema (remove GRANT statements as they may not work on Neon)
    const schemaWithoutGrants = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('GRANT'))
      .join('\n');
    
    await client.query(schemaWithoutGrants);
    
    console.log('✅ Schema initialized successfully!');
    
    // Check tables
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables created:');
    rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Database initialization complete!');
    console.log('You can now start your application with: npm start');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    console.error(error);
    process.exit(1);
  }
}

initNeonDatabase();
