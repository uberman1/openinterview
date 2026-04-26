
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import { plans } from "./schema";

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = pg;

async function seedPlans() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env file");
  }

  console.log(`Connecting to database...`);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log("Seeding plans...");

  const plansData = [
    {
      code: 'free',
      name: 'Free',
      priceCents: 0,
      currency: 'USD',
      interval: 'month',
      sharesLimit: 1,
      bookingsLimit: 0,
      stripePriceId: null,
      isActive: true,
      maxInterviewLengthSeconds: 420,
      maxResumeFileSizeBytes: 5242880,
    },
    {
      code: 'starter',
      name: 'Starter',
      priceCents: 0,
      currency: 'USD',
      interval: 'month',
      sharesLimit: 0, // Following SQL comment values
      bookingsLimit: 15,
      stripePriceId: null,
      isActive: true,
      maxInterviewLengthSeconds: 420,
      maxResumeFileSizeBytes: 5242880,
    },
    {
      code: 'pro',
      name: 'Pro',
      priceCents: 0,
      currency: 'USD',
      interval: 'month',
      sharesLimit: 0,
      bookingsLimit: 50,
      stripePriceId: null,
      isActive: true,
      maxInterviewLengthSeconds: 420,
      maxResumeFileSizeBytes: 5242880,
    },
    {
      code: 'premium',
      name: 'Premium',
      priceCents: 0,
      currency: 'USD',
      interval: 'month',
      sharesLimit: 0,
      bookingsLimit: 500,
      stripePriceId: null,
      isActive: true,
      maxInterviewLengthSeconds: 420,
      maxResumeFileSizeBytes: 5242880,
    }
  ];

  try {
    for (const plan of plansData) {
      await db.insert(plans)
        .values(plan)
        .onConflictDoUpdate({
          target: plans.code,
          set: plan // Update if exists to match our seed
        });
      console.log(`✅ Seeded/Updated plan: ${plan.name} (${plan.code})`);
    }
    console.log("🎉 Plans seeding complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedPlans();
