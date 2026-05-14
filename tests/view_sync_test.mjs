
import 'dotenv/config';
import { incrementProfileView, createEntitlement, createProfile, getUser, createUser, pool, initDatabase } from '../server/db/pg-client.js';
import assert from 'assert';

async function testViewSync() {
  console.log('🧪 Testing View Count Sync...');
  
  await initDatabase();

  const testUserId = `test-user-sync-${Date.now()}`;
  
  // Create User
  await createUser({
    id: testUserId,
    email: `${testUserId}@example.com`,
    name: 'Test User Sync',
    googleId: `google-${testUserId}`
  });

  // Create Entitlement
  await createEntitlement({
    userId: testUserId,
    plan: 'free',
    sharesUsed: 0,
    sharesLimit: 1,
    bookingsUsed: 0,
    bookingsLimit: 0,
    viewsUsed: 0
  });

  const profileId1 = `profile1-${Date.now()}`;
  await createProfile({
    id: profileId1,
    userId: testUserId,
    profileName: 'Profile 1',
    publicHandle: `handle1-${Date.now()}`
  });

  console.log('--- Incrementing View for Profile 1 ---');
  const count1 = await incrementProfileView(profileId1);
  assert.strictEqual(count1, 1, 'Profile 1 view count should be 1');

  // Verify Entitlement
  let { rows: entRows } = await pool.query('SELECT views_used FROM entitlements WHERE user_id = $1', [testUserId]);
  assert.strictEqual(entRows[0].views_used, '1', 'Entitlement views_used should be 1');

  console.log('✅ Profile 1 increment synced to entitlement');

  const profileId2 = `profile2-${Date.now()}`;
  await createProfile({
    id: profileId2,
    userId: testUserId,
    profileName: 'Profile 2',
    publicHandle: `handle2-${Date.now()}`
  });

  console.log('--- Incrementing View for Profile 2 ---');
  const count2 = await incrementProfileView(profileId2);
  assert.strictEqual(count2, 1, 'Profile 2 view count should be 1');

  // Verify Entitlement (should be sum of both profiles: 1 + 1 = 2)
  entRows = (await pool.query('SELECT views_used FROM entitlements WHERE user_id = $1', [testUserId])).rows;
  assert.strictEqual(entRows[0].views_used, '2', 'Entitlement views_used should be 2');

  console.log('✅ Profile 2 increment synced to entitlement (Sum works)');
  
  console.log('🎉 View Sync Test Passed!');
  process.exit(0);
}

testViewSync().catch(err => {
  console.error(err);
  process.exit(1);
});
