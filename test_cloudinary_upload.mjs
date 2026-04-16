#!/usr/bin/env node

// Test script to verify Cloudinary avatar upload is working
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const SERVER_URL = 'http://localhost:3012';

async function testAvatarUpload() {
  console.log('🧪 Testing Cloudinary Avatar Upload...');
  
  try {
    // First, create a test profile
    console.log('1. Creating test profile...');
    const profileResponse = await fetch(`${SERVER_URL}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test_user_' + Date.now(),
        person: { name: 'Test User' },
        contact: { email: 'test@example.com' }
      })
    });
    
    if (!profileResponse.ok) {
      throw new Error(`Failed to create profile: ${profileResponse.status}`);
    }
    
    const profile = await profileResponse.json();
    console.log(`✅ Profile created: ${profile.id}`);
    
    // Create a simple test image (1x1 PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    // Upload avatar
    console.log('2. Uploading avatar...');
    const formData = new FormData();
    formData.append('file', testImageBuffer, {
      filename: 'test-avatar.png',
      contentType: 'image/png'
    });
    
    const uploadResponse = await fetch(`${SERVER_URL}/api/upload/avatar/${profile.id}`, {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Avatar upload failed: ${uploadResponse.status} - ${errorText}`);
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('📤 Upload response:', JSON.stringify(uploadResult, null, 2));
    
    // Check if URL is Cloudinary
    if (uploadResult.url && uploadResult.url.includes('cloudinary.com')) {
      console.log('✅ SUCCESS: Avatar uploaded to Cloudinary!');
      console.log(`🔗 Cloudinary URL: ${uploadResult.url}`);
    } else {
      console.log('❌ FAILURE: Avatar NOT uploaded to Cloudinary');
      console.log(`🔗 URL received: ${uploadResult.url || 'No URL'}`);
    }
    
    // Verify profile was updated
    console.log('3. Verifying profile update...');
    const updatedProfileResponse = await fetch(`${SERVER_URL}/api/profiles/${profile.id}`);
    const updatedProfile = await updatedProfileResponse.json();
    
    console.log('👤 Profile avatar_url:', updatedProfile.avatar_url);
    console.log('👤 Profile person.avatar_url:', updatedProfile.person?.avatar_url);
    
    if (updatedProfile.avatar_url && updatedProfile.avatar_url.includes('cloudinary.com')) {
      console.log('✅ Profile correctly updated with Cloudinary URL');
    } else {
      console.log('❌ Profile NOT updated with Cloudinary URL');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAvatarUpload().then(() => {
  console.log('🎉 Test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});