import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  initDatabase,
  createUser,
  createProfile,
  updateProfile,
  pool
} from '../server/db/pg-client.js';

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

async function seedUser(label) {
  const id = uid(`u_${label}`);
  await createUser({
    id,
    email: `${id}@example.test`,
    name: `Test ${label}`,
    passwordHash: 'test-hash',
    status: 'registered',
    role: 'user'
  });
  return id;
}

async function seedProfile(userId, label) {
  const id = uid(`p_${label}`);
  await createProfile({
    id,
    userId,
    profileName: `Profile ${label}`,
    title: `Role ${label}`,
    visibility: 'private'
  });
  return id;
}

async function expectUniqueViolation(promise, msg) {
  try {
    await promise;
    assert.fail(`${msg}: expected unique violation but update succeeded`);
  } catch (err) {
    assert.equal(err?.code, '23505', `${msg}: expected Postgres code 23505`);
    assert.match(String(err?.constraint || ''), /profiles_public_handle_key/, `${msg}: expected public_handle unique constraint`);
  }
}

async function run() {
  const createdUsers = [];
  const createdProfiles = [];

  await initDatabase();

  try {
    // Setup: 2 users, 3 profiles (2 under first user, 1 under second)
    const userA = await seedUser('A');
    const userB = await seedUser('B');
    createdUsers.push(userA, userB);

    const profileA1 = await seedProfile(userA, 'A1');
    const profileA2 = await seedProfile(userA, 'A2');
    const profileB1 = await seedProfile(userB, 'B1');
    createdProfiles.push(profileA1, profileA2, profileB1);

    const sharedHandle = `humaiyon-abdullah-prof-m-${Date.now().toString(36)}`;

    // First claim of handle succeeds
    await updateProfile(profileA1, { publicHandle: sharedHandle, visibility: 'public' });

    // Cross-user collision should fail (proves uniqueness is global, not scoped by user_id)
    await expectUniqueViolation(
      updateProfile(profileB1, { publicHandle: sharedHandle, visibility: 'public' }),
      'cross-user collision'
    );

    // Same-user collision should also fail
    await expectUniqueViolation(
      updateProfile(profileA2, { publicHandle: sharedHandle, visibility: 'public' }),
      'same-user collision'
    );

    // A distinct handle should still succeed
    await updateProfile(profileA2, { publicHandle: `${sharedHandle}-alt`, visibility: 'public' });

    console.log('PASS: public_handle uniqueness is global across all profiles.');
    console.log('PASS: collisions fail for both same user and different users.');
  } finally {
    if (createdProfiles.length) {
      await pool.query('DELETE FROM profiles WHERE id = ANY($1)', [createdProfiles]);
    }
    if (createdUsers.length) {
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [createdUsers]);
    }
    await pool.end();
  }
}

run().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
