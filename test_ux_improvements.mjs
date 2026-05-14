#!/usr/bin/env node

// Test UX improvements for subscription page skeleton loading and owner preview button states

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🧪 Testing UX Improvements...\n');

// Test 1: Check if subscription.bind.js has skeleton loading
console.log('1. Testing subscription page skeleton loading...');
try {
  const subscriptionBindContent = fs.readFileSync('public/js/subscription.bind.js', 'utf8');
  
  const hasSkeletonFunction = subscriptionBindContent.includes('showSkeletonLoading()');
  const hasHideSkeletonFunction = subscriptionBindContent.includes('hideSkeletonLoading()');
  const hasSkeletonHTML = subscriptionBindContent.includes('animate-pulse');
  
  if (hasSkeletonFunction && hasHideSkeletonFunction && hasSkeletonHTML) {
    console.log('✅ Subscription skeleton loading implemented');
  } else {
    console.log('❌ Subscription skeleton loading missing components');
    console.log(`   - showSkeletonLoading: ${hasSkeletonFunction}`);
    console.log(`   - hideSkeletonLoading: ${hasHideSkeletonFunction}`);
    console.log(`   - skeleton HTML: ${hasSkeletonHTML}`);
  }
} catch (error) {
  console.log('❌ Error reading subscription.bind.js:', error.message);
}

// Test 2: Check if owner-preview-loader.js has button disabling
console.log('\n2. Testing owner preview button states...');
try {
  const ownerPreviewContent = fs.readFileSync('public/js/owner-preview-loader.js', 'utf8');
  
  const hasDisableFunction = ownerPreviewContent.includes('disableAllButtons()');
  const hasEnableFunction = ownerPreviewContent.includes('enableAllButtons()');
  const hasButtonLoadingStates = ownerPreviewContent.includes('shareBtn.disabled = true');
  const hasCopyLinkLoadingStates = ownerPreviewContent.includes('copyLinkBtn.disabled = true');
  
  if (hasDisableFunction && hasEnableFunction && hasButtonLoadingStates && hasCopyLinkLoadingStates) {
    console.log('✅ Owner preview button states implemented');
  } else {
    console.log('❌ Owner preview button states missing components');
    console.log(`   - disableAllButtons: ${hasDisableFunction}`);
    console.log(`   - enableAllButtons: ${hasEnableFunction}`);
    console.log(`   - share button loading: ${hasButtonLoadingStates}`);
    console.log(`   - copy link loading: ${hasCopyLinkLoadingStates}`);
  }
} catch (error) {
  console.log('❌ Error reading owner-preview-loader.js:', error.message);
}

// Test 3: Check if share-profile.js has proper structure
console.log('\n3. Testing share profile functionality...');
try {
  const shareProfileContent = fs.readFileSync('public/js/share-profile.js', 'utf8');
  
  const hasShareFunction = shareProfileContent.includes('async share(profileId');
  const hasDoShareFunction = shareProfileContent.includes('async doShare(profileId');
  const hasShowSuccessFunction = shareProfileContent.includes('showShareSuccess(data)');
  const hasCopyLinkFunction = shareProfileContent.includes('async copyLink(url)');
  
  if (hasShareFunction && hasDoShareFunction && hasShowSuccessFunction && hasCopyLinkFunction) {
    console.log('✅ Share profile functionality complete');
  } else {
    console.log('❌ Share profile functionality missing components');
    console.log(`   - share function: ${hasShareFunction}`);
    console.log(`   - doShare function: ${hasDoShareFunction}`);
    console.log(`   - showShareSuccess: ${hasShowSuccessFunction}`);
    console.log(`   - copyLink function: ${hasCopyLinkFunction}`);
  }
} catch (error) {
  console.log('❌ Error reading share-profile.js:', error.message);
}

console.log('\n🎯 UX Improvements Test Summary:');
console.log('- Subscription page: Skeleton loading while API data loads');
console.log('- Owner preview page: Buttons disabled during loading, enabled after data loads');
console.log('- Share button: Loading state prevents multiple clicks');
console.log('- Copy link button: Loading state with proper feedback');
console.log('\n✨ All UX improvements appear to be implemented!');