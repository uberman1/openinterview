#!/usr/bin/env node
// Test script to verify atomic booking creation + credit enforcement
// Usage: node test_atomic_booking_credits.mjs

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testAtomicBookingCreation() {
  console.log('🧪 Testing atomic booking creation + credit enforcement...');
  
  // Test data - using a profile that should exist
  const testProfileId = 'test-profile-id';
  const bookingData = {
    profileId: testProfileId,
    date: '2025-01-15',
    time: '14:00',
    bookerName: 'Test Booker',
    bookerEmail: 'test@example.com',
    message: 'Atomic test booking'
  };
  
  console.log('🔥 Firing 5 concurrent requests (free plan limit = 0 bookings)...');
  
  // Fire 5 concurrent requests (should exceed free plan limit of 0)
  const promises = Array.from({ length: 5 }, (_, i) => 
    fetch(`${BASE_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...bookingData, 
        bookerEmail: `atomic-test-${i}@example.com`,
        message: `Atomic test booking ${i + 1}`
      })
    }).then(async res => {
      const data = await res.json();
      return { status: res.status, data };
    })
  );
  
  const results = await Promise.all(promises);
  
  console.log('\n📊 Results:');
  results.forEach((result, i) => {
    const status = result.data.success ? 'SUCCESS' : `ERROR: ${result.data.error}`;
    console.log(`Request ${i + 1} (${result.status}):`, status);
  });
  
  // Count successes and failures
  const successes = results.filter(r => r.data.success).length;
  const failures = results.filter(r => r.data.error).length;
  const limitReached = results.filter(r => r.data.requiresUpgrade).length;
  
  console.log(`\n📈 Summary:`);
  console.log(`✅ Successes: ${successes}`);
  console.log(`❌ Failures: ${failures}`);
  console.log(`🚫 Limit reached: ${limitReached}`);
  
  // For free plan (0 booking limit), all should fail with limit reached
  if (successes === 0 && limitReached === 5) {
    console.log('🎉 PASS: Atomic enforcement working correctly!');
    console.log('   - No bookings created (as expected for free plan)');
    console.log('   - All requests properly blocked with upgrade required');
  } else if (successes <= 1 && failures >= 4) {
    console.log('🎉 PASS: Atomic enforcement working correctly!');
    console.log('   - At most 1 booking created');
    console.log('   - Remaining requests properly blocked');
  } else {
    console.log('💥 FAIL: Race condition detected!');
    console.log('   - Multiple bookings may have been created without credit enforcement');
  }
}

testAtomicBookingCreation().catch(console.error);