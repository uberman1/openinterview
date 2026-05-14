#!/usr/bin/env node

// Test script to verify Cloudinary avatar upload is working
import fetch from 'node-fetch';
import FormData from 'form-data';

const SERVER_URL = 'http://localhost:3012';

async function testAvatarUpload() {
  console.log('🧪 Testing Cloudinary Avatar Upload...');
  
  try {
    // First, create a profile via anonymous resume upload
    console.log('1. Creating profile via anonymous resume upload...');
    
    const testResumeContent = `
John Doe
Software Engineer
Email: john@example.com
Phone: (555) 123-4567

Experience:
- Software Engineer at Tech Corp (2020-2023)
- Junior Developer at StartupCo (2018-2020)

Skills: JavaScript, Python, React, Node.js
    `.trim();
    
    const formData = new FormData();
    formData.append('file', Buffer.from(testResumeContent), {
      filename: 'test-resume.txt',
      contentType: 'text/plain'
    });
    
    const resumeResponse = await fetch(`${SERVER_URL}/api/upload-resume-anon`, {
      method: 'POST',
      body: formData
    });
    
    if (!resumeResponse.ok) {
      const errorText = await resumeResponse.text();
      throw new Error(`Resume upload failed: ${resumeResponse.status} - ${errorText}`);
    }
    
    const resumeResult = await resumeResponse.json();
    console.log(`✅ Profile created: ${resumeResult.profileId}`);
    
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
    const avatarFormData = new FormData();
    avatarFormData.append('file', testImageBuffer, {
      filename: 'test-avatar.png',
      contentType: 'image/png'
    });
    
    const uploadResponse = await fetch(`${SERVER_URL}/api/upload/avatar/${resumeResult.profileId}`, {
      method: 'POST',
      body: avatarFormData
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
    const updatedProfileResponse = await fetch(`${SERVER_URL}/api/profiles/${resumeResult.profileId}`);
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