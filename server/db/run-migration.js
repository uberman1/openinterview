
import dotenv from 'dotenv';
import pgClient from './pg-client.js';

dotenv.config();

console.log('Running manual migration trigger...');

async function run() {
  try {
    await pgClient.initDatabase();
    console.log('Migration check complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
