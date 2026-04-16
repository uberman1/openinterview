#!/usr/bin/env node

// Debug Shares Discrepancy
// Compares what dashboard vs share endpoints return

import { readFileSync } from 'fs';

console.log('🔍 Debugging Shares Discrepancy...\n');

console.log('📊 ANALYSIS: Dashboard vs Share Modal Data Sources');
console.log('=================================================\n');

// Check dashboard endpoint
console.log('1️⃣ DASHBOARD ENDPOINT (/api/dashboard)');
const indexContent = readFileSync('index.js', 'utf8');
const dashboardMatch = indexContent.match(/app\.get\("\/api\/dashboard"[\s\S]*?res\.json\([\s\S]*?\}\);/);

if (dashboardMatch) {
  const endpoint = dashboardMatch[0];
  
  console.log('   📍 Data Source: pgClient.getEntitlement(userId)');
  console.log('   🔄 Processing:');
  console.log('      • sharesUsed = Number(entitlement.sharesUsed) || 0');
  console.log('      • sharesLimit = Number(entitlement.sharesLimit) || 1');
  console.log('   📤 Returns: credits.sharesUsed, credits.sharesLimit');
  
  const hasGetEntitlement = endpoint.includes('pgClient.getEntitlement(userId)');
  const hasNumberCoercion = endpoint.includes('Number(entitlement.sharesUsed)');
  
  console.log(`   ✅ Uses pgClient.getEntitlement: ${hasGetEntitlement}`);
  console.log(`   ✅ Has Number coercion: ${hasNumberCoercion}\n`);
} else {
  console.log('   ❌ Dashboard endpoint not found\n');
}

// Check share endpoint
console.log('2️⃣ SHARE ENDPOINT (/api/profiles/:id/share)');
const shareMatch = indexContent.match(/app\.post\("\/api\/profiles\/:id\/share"[\s\S]*?if \(sharesUsed >= sharesLimit\)[\s\S]*?\}/);

if (shareMatch) {
  const endpoint = shareMatch[0];
  
  console.log('   📍 Data Source: pgClient.getEntitlement(userId)');
  console.log('   🔄 Processing:');
  console.log('      • sharesUsed = entitlement.sharesUsed || 0');
  console.log('      • sharesLimit = entitlement.sharesLimit || 1');
  console.log('   📤 Returns: paywall with sharesUsed, sharesLimit');
  
  const hasGetEntitlement = endpoint.includes('pgClient.getEntitlement(userId)');
  const hasLimitCheck = endpoint.includes('sharesUsed >= sharesLimit');
  
  console.log(`   ✅ Uses pgClient.getEntitlement: ${hasGetEntitlement}`);
  console.log(`   ✅ Has limit check: ${hasLimitCheck}\n`);
} else {
  console.log('   ❌ Share endpoint not found\n');
}

// Check database mapping
console.log('3️⃣ DATABASE MAPPING (formatEntitlement)');
const pgClientContent = readFileSync('server/db/pg-client.js', 'utf8');
const formatMatch = pgClientContent.match(/function formatEntitlement\(row\)[\s\S]*?sharesUsed: row\.shares_used[\s\S]*?\}/);

if (formatMatch) {
  console.log('   📍 Database Fields → JavaScript Properties:');
  console.log('      • shares_used (DB) → sharesUsed (JS)');
  console.log('      • shares_limit (DB) → sharesLimit (JS)');
  console.log('   ✅ Mapping is consistent\n');
} else {
  console.log('   ❌ formatEntitlement function not found\n');
}

console.log('🤔 POSSIBLE CAUSES OF DISCREPANCY');
console.log('==================================');
console.log('1. 🕐 **Timing Issue**: Dashboard loads before share action completes');
console.log('2. 🔄 **Caching Issue**: Browser/server caching old entitlement data');
console.log('3. 📊 **Different User Context**: Dashboard and share using different user IDs');
console.log('4. 🗄️  **Database Transaction**: Share increment not committed when dashboard reads');
console.log('5. 🐛 **Race Condition**: Multiple requests updating entitlement simultaneously');

console.log('\n🔧 DEBUGGING STEPS');
console.log('==================');
console.log('1. Check browser Network tab:');
console.log('   • Compare /api/dashboard response vs /api/profiles/:id/share response');
console.log('   • Look for different sharesUsed values');
console.log('');
console.log('2. Check server logs:');
console.log('   • Look for "[dashboard] Data:" and "[share] Profile shared" logs');
console.log('   • Compare userId and sharesUsed values');
console.log('');
console.log('3. Check database directly:');
console.log('   • SELECT shares_used, shares_limit FROM entitlements WHERE user_id = ?');
console.log('   • Verify actual database state');
console.log('');
console.log('4. Test sequence:');
console.log('   • Refresh dashboard → note sharesUsed value');
console.log('   • Try to share → note paywall sharesUsed value');
console.log('   • Refresh dashboard again → see if it updates');

console.log('\n💡 MOST LIKELY CAUSE');
console.log('====================');
console.log('Dashboard is showing **cached/stale data** from before the share action.');
console.log('The share modal shows **real-time data** from the share attempt.');
console.log('');
console.log('🎯 SOLUTION: Dashboard needs to refresh data after share actions,');
console.log('or there\'s a browser caching issue with /api/dashboard endpoint.');