
import 'dotenv/config';
import { resetMonthlyUsage, createEntitlement, createProfile, getUser, createUser, pool, initDatabase } from '../server/db/pg-client.js';
import assert from 'assert';

// Mock dependencies if needed, or rely on integration test pattern
// This test assumes a running DB as per project standards

async function testViewReset() {
  console.log('🧪 Testing Monthly View Reset...');
  
  // Initialize DB connection
  await initDatabase();

  const testUserId = `test-user-${Date.now()}`;
  const testProfileId = `test-profile-${Date.now()}`;
  
  try {
    // 1. Setup User
    await createUser({
      id: testUserId,
      email: `${testUserId}@example.com`,
      name: 'Test User',
      status: 'active'
    });

    // 2. Setup Entitlement with usage
    await createEntitlement({
      userId: testUserId,
      plan: 'pro',
      sharesUsed: 5,
      bookingsUsed: 3,
      // viewsUsed is not in createEntitlement params but defaults to 0. 
      // We will manually update it to simulate usage.
    });

    // Manually set usage
    await pool.query(`
      UPDATE entitlements 
      SET views_used = 100, shares_used = 5, bookings_used = 3
      WHERE user_id = $1
    `, [testUserId]);

    // 3. Setup Profile with view count
    await createProfile({
      id: testProfileId,
      userId: testUserId,
      profileName: 'Test Profile',
      viewCount: 50
    });
    
    // Ensure profile has views
    await pool.query(`
      UPDATE profiles SET view_count = 50 WHERE id = $1
    `, [testProfileId]);

    // 4. Run Reset
    const newResetDate = new Date().toISOString();
    await resetMonthlyUsage(testUserId, newResetDate);

    // 5. Verify Results
    const { rows: entRows } = await pool.query('SELECT * FROM entitlements WHERE user_id = $1', [testUserId]);
    const entitlement = entRows[0];

    const { rows: profRows } = await pool.query('SELECT * FROM profiles WHERE id = $1', [testProfileId]);
    const profile = profRows[0];

    console.log('Entitlement after reset:', {
      views_used: entitlement.views_used,
      bookings_used: entitlement.bookings_used,
      shares_used: entitlement.shares_used
    });

    console.log('Profile after reset:', {
      view_count: profile.view_count
    });

    assert.equal(entitlement.views_used, 0, 'Entitlement views_used should be 0');
    assert.equal(entitlement.bookings_used, 0, 'Entitlement bookings_used should be 0');
    assert.equal(entitlement.shares_used, 0, 'Entitlement shares_used should be 0');
    assert.equal(profile.view_count, 0, 'Profile view_count should be 0');

    console.log('✅ Monthly View Reset Verified Successfully!');

  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await pool.query('DELETE FROM profiles WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM entitlements WHERE user_id = $1', [testUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    // pool.end() is not needed as it hangs the process in some setups, we just let script exit
  }
}

testViewReset();
