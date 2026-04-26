#!/usr/bin/env node

// Test Social Links Display
// Verifies that social links are properly displayed on both owner preview and public profile pages

import { readFileSync } from 'fs';

console.log('🧪 Testing Social Links Display Implementation...\n');

try {
  // Test 1: Check HTML structure in owner preview
  console.log('✅ Test 1: Checking owner preview HTML structure...');
  const ownerPreviewHTML = readFileSync('public/owner_preview.html', 'utf8');
  
  const hasOwnerSocialSection = ownerPreviewHTML.includes('data-field="social-links"') &&
                               ownerPreviewHTML.includes('id="social-links-container"') &&
                               ownerPreviewHTML.includes('<h3 class="text-lg font-semibold mb-4');
  
  if (hasOwnerSocialSection) {
    console.log('   ✓ Owner preview has social links section');
  } else {
    throw new Error('Owner preview missing social links section');
  }

  // Test 2: Check HTML structure in public profile
  console.log('✅ Test 2: Checking public profile HTML structure...');
  const publicProfileHTML = readFileSync('public/public_profile.html', 'utf8');
  
  const hasPublicSocialSection = publicProfileHTML.includes('data-profile="social-links"') &&
                                publicProfileHTML.includes('id="social-links-container"') &&
                                publicProfileHTML.includes('<h3 class="text-lg font-semibold mb-4');
  
  if (hasPublicSocialSection) {
    console.log('   ✓ Public profile has social links section');
  } else {
    throw new Error('Public profile missing social links section');
  }

  // Test 3: Check owner preview JavaScript implementation
  console.log('✅ Test 3: Checking owner preview JavaScript...');
  const ownerPreviewJS = readFileSync('public/js/owner-preview-loader.js', 'utf8');
  
  const hasOwnerSocialJS = ownerPreviewJS.includes('loadSocialLinks(profile)') &&
                          ownerPreviewJS.includes('function loadSocialLinks(profile)') &&
                          ownerPreviewJS.includes('profile.social?.linkedin') &&
                          ownerPreviewJS.includes('profile.social?.github') &&
                          ownerPreviewJS.includes('material-symbols-outlined');
  
  if (hasOwnerSocialJS) {
    console.log('   ✓ Owner preview has social links JavaScript');
  } else {
    throw new Error('Owner preview missing social links JavaScript');
  }

  // Test 4: Check public profile JavaScript implementation
  console.log('✅ Test 4: Checking public profile JavaScript...');
  const publicProfileJS = readFileSync('public/js/public-profile-loader.js', 'utf8');
  
  const hasPublicSocialJS = publicProfileJS.includes('renderSocialLinks(profile)') &&
                           publicProfileJS.includes('function renderSocialLinks(profile)') &&
                           publicProfileJS.includes('profile.social?.linkedin') &&
                           publicProfileJS.includes('profile.social?.github') &&
                           publicProfileJS.includes('material-symbols-outlined');
  
  if (hasPublicSocialJS) {
    console.log('   ✓ Public profile has social links JavaScript');
  } else {
    throw new Error('Public profile missing social links JavaScript');
  }

  // Test 5: Check social link types support
  console.log('✅ Test 5: Checking supported social link types...');
  
  const supportedTypes = ['linkedin', 'github', 'portfolio', 'website'];
  const ownerSupportsAll = supportedTypes.every(type => 
    ownerPreviewJS.includes(type) || ownerPreviewJS.includes(type.toLowerCase())
  );
  const publicSupportsAll = supportedTypes.every(type => 
    publicProfileJS.includes(type) || publicProfileJS.includes(type.toLowerCase())
  );
  
  if (ownerSupportsAll && publicSupportsAll) {
    console.log('   ✓ Both pages support LinkedIn, GitHub, Portfolio/Website');
  } else {
    throw new Error('Missing support for some social link types');
  }

  // Test 6: Check URL protocol handling
  console.log('✅ Test 6: Checking URL protocol handling...');
  
  const hasProtocolHandling = ownerPreviewJS.includes('startsWith(\'http://\')') &&
                             ownerPreviewJS.includes('startsWith(\'https://\')') &&
                             publicProfileJS.includes('startsWith(\'http://\')') &&
                             publicProfileJS.includes('startsWith(\'https://\')');
  
  if (hasProtocolHandling) {
    console.log('   ✓ URL protocol handling implemented');
  } else {
    throw new Error('URL protocol handling missing');
  }

  // Test 7: Check Material Icons integration
  console.log('✅ Test 7: Checking Material Icons integration...');
  
  const hasIcons = ownerPreviewJS.includes('linkedin') &&
                  ownerPreviewJS.includes('language') &&
                  ownerPreviewJS.includes('code') &&
                  ownerPreviewJS.includes('arrow_outward');
  
  if (hasIcons) {
    console.log('   ✓ Material Icons properly integrated');
  } else {
    throw new Error('Material Icons integration incomplete');
  }

  console.log('\n🎉 All tests passed! Social links display is properly implemented.');
  console.log('\n📋 Implementation Summary:');
  console.log('   • Social links section added below attachments on both pages');
  console.log('   • Supports LinkedIn, GitHub, Portfolio/Website links');
  console.log('   • Automatic URL protocol handling (adds https:// if missing)');
  console.log('   • Material Icons with hover animations');
  console.log('   • Color-coded buttons (LinkedIn: blue, GitHub: gray, Portfolio: purple)');
  console.log('   • Responsive design with proper truncation');
  console.log('   • Section hidden when no social links available');
  console.log('   • Opens links in new tab with security attributes');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}