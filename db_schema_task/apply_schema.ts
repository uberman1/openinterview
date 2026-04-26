
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = pg;

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env file");
  }

  console.log(`Connecting to database...`);
  
  // Use the connection string directly. 
  // If SSL issues occur, we might need to adjust config, 
  // but typically the connection string parameters are sufficient.
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log("Running migrations...");

  try {
    // This will run the migration files generated in ./migrations folder
    await migrate(db, { migrationsFolder: path.resolve(__dirname, "./migrations") });
    console.log("✅ Migrations applied successfully! Database schema has been generated.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
