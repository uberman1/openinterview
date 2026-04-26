
import 'dotenv/config';
import { initDatabase, pool, createProfile, softDeleteProfile, getProfile, ensureSingleDefaultProfile, createEntitlement, getEntitlement } from '../server/db/pg-client.js';
import { v4 as uuid } from 'uuid';

async function runTest() {
  await initDatabase();
  const client = await pool.connect();
  
  try {
    console.log('--- Starting Soft Delete Test ---');

    // 1. Create a test user
    const userId = `test-user-${uuid()}`;
    await client.query("INSERT INTO users (id, email, name) VALUES ($1, $2, $3)", [userId, `${userId}@example.com`, 'Test User']);
    
    // 2. Create entitlements
    await createEntitlement({
      userId,
      sharesUsed: 1,
      sharesLimit: 1,
      bookingsUsed: 0,
      bookingsLimit: 0
    });
    
    // Manually update to set storage and views (since createEntitlement doesn't)
    await client.query(`
        UPDATE entitlements 
        SET views_used = 10, video_storage_used_bytes = 1000, doc_storage_used_bytes = 500
        WHERE user_id = $1
    `, [userId]);

    // 3. Create a profile
    const profileId = `profile-${uuid()}`;
    const profile = await createProfile({
      id: profileId,
      userId,
      profileName: 'Test Profile',
      visibility: 'public',
      isDefault: true
    });
    
    // Manually set view_count for the profile
    await client.query('UPDATE profiles SET view_count = 5 WHERE id = $1', [profileId]);
    
    console.log('Created profile:', profile.id);

    // 4. Create some files associated with the profile
    await client.query(`
      INSERT INTO files (id, public_id, user_id, profile_id, name, kind, size_bytes)
      VALUES 
      ($1, 'vid_123', $2, $3, 'video.mp4', 'video/mp4', 1000),
      ($4, 'doc_123', $2, $3, 'resume.pdf', 'application/pdf', 500)
    `, [`file-vid-${uuid()}`, userId, profileId, `file-doc-${uuid()}`]);
    console.log('Created files for profile');

    // 5. Verify initial state
    const initialEntitlement = await getEntitlement(userId);
    console.log('Initial Entitlements:', initialEntitlement);
    
    // Manually set an avatar URL in the person JSONB to simulate an avatar upload
    const avatarUrl = 'https://res.cloudinary.com/demo/image/upload/v123456/avatar_123.jpg';
    await client.query(
      'UPDATE profiles SET person = jsonb_set(person, \'{avatar_url}\', $1) WHERE id = $2',
      [JSON.stringify(avatarUrl), profileId]
    );

    // 6. Perform Soft Delete
    console.log('Soft deleting profile...');
    const filesToDelete = await softDeleteProfile(userId, profileId);
    console.log('Files to delete from Cloudinary:', filesToDelete);

    // Verify avatar is in filesToDelete
    const avatarDeleted = filesToDelete.some(f => f.public_id === 'avatar_123');
    if (!avatarDeleted) {
      console.error('❌ Avatar was NOT found in deletion list!');
    } else {
      console.log('✅ Avatar found in deletion list');
    }

    // 7. Verify Profile State
    const deletedProfile = await getProfile(profileId);
    console.log('Deleted Profile Visibility:', deletedProfile.visibility);
    if (deletedProfile.visibility !== 'deleted') throw new Error('Profile visibility should be deleted');
    if (deletedProfile.is_default) throw new Error('Profile should not be default');

    // 8. Verify Files Deleted from DB
    const { rows: files } = await client.query('SELECT * FROM files WHERE profile_id = $1', [profileId]);
    console.log('Files remaining in DB:', files.length);
    if (files.length !== 0) throw new Error('Files should be deleted from DB');

    // 9. Verify Entitlements Released
    // Note: createEntitlement sets initial values. 
    // Our softDeleteProfile decrements based on profile.view_count (which was 0 by default when created via createProfile unless specified, I passed 0 in createProfile arguments? No wait).
    // In createProfile I passed viewCount: 5? 
    // Let's check createProfile implementation. It takes viewCount.
    // However, I updated view_count directly in DB? No, createProfile inserts it.
    // Let's check if createProfile respects viewCount.
    // Line 412 in updateProfile respects it. Line 385.
    // Line 297 in createProfile doesn't seem to insert view_count? 
    // Let's check createProfile again.
    // INSERT INTO profiles (... view_count isn't in the list of columns in INSERT statement in pg-client.js line 297).
    // So view_count starts at 0 (default).
    // So softDeleteProfile will subtract 0 views.
    
    // But shares_used should be decremented by 1.
    // storage should be decremented by 1000 (video) and 500 (doc).
    
    const finalEntitlement = await getEntitlement(userId);
    console.log('Final Entitlements:', finalEntitlement);
    
    if (Number(finalEntitlement.sharesUsed) !== 0) throw new Error(`sharesUsed should be 0, got ${finalEntitlement.sharesUsed}`);
    if (Number(finalEntitlement.viewsUsed) !== 5) throw new Error(`viewsUsed should be 5, got ${finalEntitlement.viewsUsed}`);
    if (Number(finalEntitlement.videoStorageUsedBytes) !== 0) throw new Error(`videoStorageUsedBytes should be 0, got ${finalEntitlement.videoStorageUsedBytes}`);
    if (Number(finalEntitlement.docStorageUsedBytes) !== 0) throw new Error(`docStorageUsedBytes should be 0, got ${finalEntitlement.docStorageUsedBytes}`);
    
    console.log('✅ Test Passed!');

  } catch (e) {
    console.error('Test Failed:', e);
    process.exit(1);
  } finally {
    // Cleanup
    // await client.query('DELETE FROM users WHERE id LIKE $1', ['test-user-%']);
    client.release();
    await pool.end();
  }
}

runTest();
