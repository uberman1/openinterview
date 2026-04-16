
import { initDatabase, getUserById } from './server/db/pg-client.js';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  await initDatabase();
  const user = await getUserById('usr_268bcb096b5d6214');
  console.log('User:', user);
  process.exit(0);
}

check().catch(console.error);
