
import 'dotenv/config';
import { getPool, initDatabase } from './server/db/pg-client.js';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  await initDatabase();
  const pool = getPool();
  const migration = fs.readFileSync('server/db/migrations/availability_part1.sql', 'utf8');
  console.log('Running migration...');
  await pool.query(migration);
  console.log('Migration complete.');
  process.exit(0);
}

runMigration().catch(console.error);
