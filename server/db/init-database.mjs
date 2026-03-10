#!/usr/bin/env node
// Universal Database Initialization Script
// Works with any PostgreSQL database (local, Neon, etc.)
// Ensures all tables, columns, and migrations are applied

import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initializeDatabase() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL is required. Set it in .env file.');
    process.exit(1);
  }
  
  console.log('🔄 Connecting to database...');
  const pool = new Pool({ connectionString });
  
  try {
    const client = await pool.connect();
    
    try {
      console.log('✅ Connected to PostgreSQL');
      console.log('🔍 Database URL:', connectionString.replace(/:[^:@]*@/, ':***@'));
      
      // Step 1: Check if base tables exist
      const { rows } = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      const tablesExist = rows[0].exists;
      
      if (!tablesExist) {
        console.log('🔄 Creating base schema...');
        
        // Read and execute base schema
        const schemaPath = join(__dirname, 'docker-init.sql');
        const schema = readFileSync(schemaPath, 'utf8');
        
        // Remove GRANT statements (may not work on all databases)
        const schemaWithoutGrants = schema
          .split('\n')
          .filter(line => !line.trim().startsWith('GRANT'))
          .join('\n');
        
        await client.query(schemaWithoutGrants);
        
        console.log('✅ Base schema created successfully!');
        
        // List created tables
        const { rows: tables } = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `);
        
        console.log('📋 Tables created:', tables.map(t => t.table_name).join(', '));
      } else {
        console.log('✅ Base schema already exists');
      }

      // Step 2: Apply WP01 enhancements
      console.log('🔍 Checking WP01 enhancements...');
      
      // Check if status column exists
      const { rows: statusCheck } = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
      `);
      
      // Check if email is nullable
      const { rows: emailCheck } = await client.query(`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email'
      `);
      
      const statusExists = statusCheck.length > 0;
      const emailNullable = emailCheck.length > 0 && emailCheck[0].is_nullable === 'YES';
      
      if (!statusExists || !emailNullable) {
        console.log('🔄 Applying WP01 enhancements...');
        
        const migrationPath = join(__dirname, 'migrations', 'wp01-enhancements.sql');
        const migration = readFileSync(migrationPath, 'utf8');
        await client.query(migration);
        
        console.log('✅ WP01 enhancements applied successfully!');
      } else {
        console.log('✅ WP01 enhancements already applied');
      }
      
      // Step 3: Verify final state
      console.log('🔍 Verifying database state...');
      
      const { rows: finalTables } = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      const { rows: userColumns } = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      
      const { rows: profileColumns } = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name IN ('avatar_url', 'video_url')
        ORDER BY column_name
      `);
      
      console.log('📋 Final tables:', finalTables.map(t => t.table_name).join(', '));
      console.log('📋 Users table columns:', userColumns.length);
      console.log('📋 WP01 profile columns:', profileColumns.map(c => c.column_name).join(', '));
      
      // Check specific WP01 requirements
      const statusColumn = userColumns.find(c => c.column_name === 'status');
      const emailColumn = userColumns.find(c => c.column_name === 'email');
      const avatarColumn = profileColumns.find(c => c.column_name === 'avatar_url');
      
      if (statusColumn && emailColumn?.is_nullable === 'YES' && avatarColumn) {
        console.log('🎉 Database initialization completed successfully!');
        console.log('✅ All WP01 enhancements are properly configured');
        console.log('✅ Anonymous user functionality is ready');
      } else {
        console.log('⚠️  Some WP01 enhancements may be missing:');
        console.log('   - users.status:', statusColumn ? '✅' : '❌');
        console.log('   - users.email nullable:', emailColumn?.is_nullable === 'YES' ? '✅' : '❌');
        console.log('   - profiles.avatar_url:', avatarColumn ? '✅' : '❌');
      }
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();