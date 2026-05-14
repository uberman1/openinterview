
import dotenv from 'dotenv';
import pgClient from './pg-client.js';

dotenv.config();

async function run() {
  try {
    const pool = await pgClient.initDatabase();
    console.log('Connected. Fetching availability timezones...');
    
    const { rows } = await pool.query('SELECT id, profile_id, timezone FROM availability LIMIT 20');
    console.log('Availability Timezones:');
    rows.forEach(r => console.log(`[${r.id}] Profile: ${r.profile_id} | TZ: "${r.timezone}"`));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
