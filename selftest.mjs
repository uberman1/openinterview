// selftest.mjs
// WP14: System Health Check - Runs on startup
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const results = [];
let allPassed = true;

/**
 * Check Postgres connection using pg Pool (works with Docker and Neon)
 */
async function checkPostgres() {
  const dbUrl = process.env.DATABASE_URL;
  console.log("url of db",dbUrl);
  
  
  if (!dbUrl || !dbUrl.startsWith('postgresql://')) {
    return { name: 'Postgres', status: 'WARN', message: 'DATABASE_URL not set' };
  }
  
  let pool = null;
  try {
    pool = new Pool({ connectionString: dbUrl });
    const client = await pool.connect();
    
    // Test connection and check for core tables
    await client.query('SELECT 1');
    
    // Verify core tables exist
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'profiles', 'entitlements', 'bookings', 'files', 'analytics_events')
    `);
    
    client.release();
    await pool.end();
    
    const tableCount = rows.length;
    if (tableCount < 6) {
      return { name: 'Postgres', status: 'WARN', message: `Connected but only ${tableCount}/6 core tables found` };
    }
    
    return { name: 'Postgres', status: 'PASS', message: 'Connected (all core tables exist)' };
  } catch (e) {
    if (pool) await pool.end().catch(() => {});
    return { name: 'Postgres', status: 'FAIL', message: 'Connection failed: ' + e.message };
  }
}

/**
 * Check Stripe configuration
 */
function checkStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return { name: 'Stripe', status: 'WARN', message: 'STRIPE_SECRET_KEY not set - payments disabled' };
  }
  if (!key.startsWith('sk_')) {
    return { name: 'Stripe', status: 'WARN', message: 'Key format looks invalid' };
  }
  return { name: 'Stripe', status: 'PASS', message: key.startsWith('sk_live') ? 'Live mode' : 'Test mode' };
}

/**
 * Check AI API configuration
 */
function checkAI() {
  const deepseek = process.env.DEEPSEEK_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  
  if (!deepseek && !openai) {
    return { name: 'AI API', status: 'WARN', message: 'No AI key - resume parsing uses mock data' };
  }
  return { name: 'AI API', status: 'PASS', message: deepseek ? 'DeepSeek configured' : 'OpenAI configured' };
}

/**
 * Check Session configuration
 */
function checkSession() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return { name: 'Session', status: 'WARN', message: 'Using default secret - set SESSION_SECRET in production' };
  }
  if (secret.includes('change') || secret.includes('default') || secret.length < 16) {
    return { name: 'Session', status: 'WARN', message: 'Session secret looks weak - use a strong random string' };
  }
  return { name: 'Session', status: 'PASS', message: 'Configured' };
}

/**
 * Check Google OAuth configuration
 */
function checkGoogleOAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return { name: 'Google OAuth', status: 'WARN', message: 'Not configured - Google login disabled' };
  }
  return { name: 'Google OAuth', status: 'PASS', message: 'Configured' };
}

/**
 * Check BASE_URL configuration
 */
function checkBaseUrl() {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    return { name: 'Base URL', status: 'WARN', message: 'BASE_URL not set - using localhost' };
  }
  if (!baseUrl.startsWith('https://')) {
    return { name: 'Base URL', status: 'WARN', message: 'BASE_URL should use HTTPS in production' };
  }
  return { name: 'Base URL', status: 'PASS', message: baseUrl };
}

/**
 * Run all health checks
 */
export async function runSelfTest() {
  console.log('\n🔍 Running system health checks...\n');
  console.log('─'.repeat(50));
  
  const checks = [
    await checkPostgres(),
    checkStripe(),
    checkAI(),
    checkSession(),
    checkGoogleOAuth(),
    checkBaseUrl()
  ];
  
  checks.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️ ' : '❌';
    const color = r.status === 'PASS' ? '' : r.status === 'WARN' ? '' : '';
    console.log(`${icon} ${r.name.padEnd(15)} ${r.message}`);
    if (r.status === 'FAIL') allPassed = false;
  });
  
  console.log('─'.repeat(50));
  
  const passCount = checks.filter(c => c.status === 'PASS').length;
  const warnCount = checks.filter(c => c.status === 'WARN').length;
  const failCount = checks.filter(c => c.status === 'FAIL').length;
  
  if (failCount === 0) {
    if (warnCount === 0) {
      console.log('\n✨ All systems healthy!\n');
    } else {
      console.log(`\n⚠️  ${passCount} passed, ${warnCount} warnings - review above\n`);
    }
  } else {
    console.log(`\n❌ ${failCount} critical failures - fix before deploying\n`);
  }
  
  return { allPassed: failCount === 0, results: checks };
}

// Run if called directly
const isMainModule = process.argv[1]?.endsWith('selftest.mjs') || 
                     process.argv[1]?.includes('selftest');

if (isMainModule) {
  runSelfTest().then(({ allPassed }) => {
    process.exit(allPassed ? 0 : 1);
  });
}

export default { runSelfTest };
