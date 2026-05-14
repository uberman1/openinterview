
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { plans } from "./schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = pg;

async function checkPlans() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env file");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    const allPlans = await db.select().from(plans);
    console.log(`Found ${allPlans.length} plans:`);
    console.log(JSON.stringify(allPlans, null, 2));
  } catch (error) {
    console.error("Error querying plans:", error);
  } finally {
    await pool.end();
  }
}

checkPlans();
