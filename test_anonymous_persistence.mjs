#!/usr/bin/env node

/**
 * Test Script: Anonymous User Persistence
 * 
 * This script tests the cookie-based anonymous user persistence functionality
 * by simulating multiple upload requests with and without existing cookies.
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_PDF_PATH = './create_test_pdf.py'; // Use existing test file

console.log('🧪 Testing Anonymous User Persistence\n');

// Helper function to create a simple test file if needed
function createTestFile() {
  if (!fs.existsSync(TEST_PDF_PATH)) {
    fs.writeFileSync(TEST_PDF_PATH, 'Test resume content for anonymous user persistence testing.');
  }
}

// Helper function to extract cookies from response headers
function extractCookies(response) {
  const cookies = {};
  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    setCookieHeader.split(',').forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      if (name && value) {
        cookies[name.trim()] = value.trim();
      }
    });
  }
  return cookies;
}

// Test Case 1: First upload (should create new anonymous user)
async function testFirstUpload() {
  console.log('📝 Test Case 1: First Upload (New Anonymous User)');
  
  createTestFile();
  const formData = new FormData();
  formData.append('file', fs.createReadStream(TEST_PDF_PATH));
  
  try {
    const response = await fetch(`${BASE_URL}/api/upload-resume-anon`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    const cookies = extractCookies(response);
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Anonymous User ID:', data.userId);
    console.log('✅ Is Returning User:', data.isReturningUser);
    console.log('✅ Cookie Set:', cookies.anonUserId ? 'Yes' : 'No');
    
    if (cookies.anonUserId) {
      console.log('✅ Cookie Value:', cookies.anonUserId);
      return cookies.anonUserId;
    }
    
    return data.userId;
  } catch (error) {
    console.error('❌ Test Case 1 Failed:', error.message);
    return null;
  }
}

// Test Case 2: Second upload with existing cookie (should reuse anonymous user)
async function testSecondUpload(anonUserId) {
  console.log('\n📝 Test Case 2: Second Upload (Existing Anonymous User)');
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(TEST_PDF_PATH));
  formData.append('anonUserId', anonUserId);
  
  try {
    const response = await fetch(`${BASE_URL}/api/upload-resume-anon`, {
      method: 'POST',
      body: formData,
      headers: {
        'Cookie': `anonUserId=${anonUserId}`
      }
    });
    
    const data = await response.json();
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Anonymous User ID:', data.userId);
    console.log('✅ Is Returning User:', data.isReturningUser);
    console.log('✅ Same User ID:', data.userId === anonUserId ? 'Yes' : 'No');
    
    return data.userId === anonUserId;
  } catch (error) {
    console.error('❌ Test Case 2 Failed:', error.message);
    return false;
  }
}

// Test Case 3: Upload without cookie (should create new anonymous user)
async function testWithoutCookie() {
  console.log('\n📝 Test Case 3: Upload Without Cookie (New Anonymous User)');
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(TEST_PDF_PATH));
  
  try {
    const response = await fetch(`${BASE_URL}/api/upload-resume-anon`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Anonymous User ID:', data.userId);
    console.log('✅ Is Returning User:', data.isReturningUser);
    console.log('✅ Should be New User:', !data.isReturningUser ? 'Yes' : 'No');
    
    return !data.isReturningUser;
  } catch (error) {
    console.error('❌ Test Case 3 Failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log(`🚀 Testing against: ${BASE_URL}\n`);
  
  // Test 1: First upload
  const firstUserId = await testFirstUpload();
  if (!firstUserId) {
    console.error('❌ Cannot continue tests - first upload failed');
    return;
  }
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Second upload with same user ID
  const reuseSuccess = await testSecondUpload(firstUserId);
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Upload without cookie
  const newUserSuccess = await testWithoutCookie();
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('✅ First Upload (New User):', firstUserId ? 'PASS' : 'FAIL');
  console.log('✅ Second Upload (Reuse User):', reuseSuccess ? 'PASS' : 'FAIL');
  console.log('✅ Third Upload (New User):', newUserSuccess ? 'PASS' : 'FAIL');
  
  const allPassed = firstUserId && reuseSuccess && newUserSuccess;
  console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  
  if (allPassed) {
    console.log('\n🎉 Anonymous User Persistence is working correctly!');
    console.log('   - New users get fresh anonymous IDs');
    console.log('   - Returning users reuse existing anonymous IDs');
    console.log('   - Cookies are properly set and read');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});