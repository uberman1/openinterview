
import pg from "pg";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Client } = pg;

async function setupTestDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env file");
  }

  const dbName = "openinterview_schema_task_test";
  
  // Connect to the default database to create a new one
  // We need to disable SSL verification for some setups or ensure it's correct
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Connecting to main database...");
    await client.connect();

    // Check if database exists
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);
    
    if ((res.rowCount ?? 0) > 0) {
      console.log(`Database ${dbName} already exists. Dropping it...`);
      // We need to terminate connections to the DB before dropping it
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '${dbName}'
        AND pid <> pg_backend_pid();
      `);
      await client.query(`DROP DATABASE ${dbName}`);
    }

    console.log(`Creating database ${dbName}...`);
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`✅ Database ${dbName} created successfully.`);
    
    // Return the new connection string
    const url = new URL(process.env.DATABASE_URL);
    url.pathname = `/${dbName}`;
    console.log(`TEST_DATABASE_URL=${url.toString()}`);
    
  } catch (error) {
    console.error("❌ Failed to setup test database:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupTestDb();
