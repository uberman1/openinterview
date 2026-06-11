#!/usr/bin/env node

// Test Social Links Icon Animations
// Verifies that social link icons have professional, enterprise-level animations

import { readFileSync } from 'fs';

console.log('🧪 Testing Social Links Icon Animations...\n');

try {
  // Test 1: Check owner preview icon animation classes
  console.log('✅ Test 1: Checking owner preview icon animation...');
  const ownerPreviewJS = readFileSync('public/js/owner-preview-loader.js', 'utf8');
  
  const hasOwnerIconAnimation = ownerPreviewJS.includes('animate-pulse-subtle');
  
  if (hasOwnerIconAnimation) {
    console.log('   ✓ Owner preview icons have pulse-subtle animation');
  } else {
    throw new Error('Owner preview missing icon animation class');
  }

  // Test 2: Check public profile icon animation classes
  console.log('✅ Test 2: Checking public profile icon animation...');
  const publicProfileJS = readFileSync('public/js/public-profile-loader.js', 'utf8');
  
  const hasPublicIconAnimation = publicProfileJS.includes('animate-float');
  
  if (hasPublicIconAnimation) {
    console.log('   ✓ Public profile icons have float animation');
  } else {
    throw new Error('Public profile missing icon animation class');
  }

  // Test 3: Check owner preview CSS keyframes
  console.log('✅ Test 3: Checking owner preview CSS animations...');
  const ownerPreviewHTML = readFileSync('public/owner_preview.html', 'utf8');
  
  const hasOwnerKeyframes = ownerPreviewHTML.includes('@keyframes pulse-subtle') &&
                           ownerPreviewHTML.includes('opacity: 1') &&
                           ownerPreviewHTML.includes('opacity: 0.8') &&
                           ownerPreviewHTML.includes('transform: scale(1)') &&
                           ownerPreviewHTML.includes('transform: scale(1.02)') &&
                           ownerPreviewHTML.includes('3s ease-in-out infinite');
  
  if (hasOwnerKeyframes) {
    console.log('   ✓ Owner preview has professional pulse-subtle keyframes');
  } else {
    throw new Error('Owner preview missing pulse-subtle keyframes');
  }

  // Test 4: Check public profile CSS keyframes
  console.log('✅ Test 4: Checking public profile CSS animations...');
  const publicProfileHTML = readFileSync('public/public_profile.html', 'utf8');
  
  const hasPublicKeyframes = publicProfileHTML.includes('@keyframes float') &&
                            publicProfileHTML.includes('translateY(0px)') &&
                            publicProfileHTML.includes('translateY(-2px)') &&
                            publicProfileHTML.includes('scale(1)') &&
                            publicProfileHTML.includes('scale(1.01)') &&
                            publicProfileHTML.includes('4s ease-in-out infinite');
  
  if (hasPublicKeyframes) {
    console.log('   ✓ Public profile has professional float keyframes');
  } else {
    throw new Error('Public profile missing float keyframes');
  }

  // Test 5: Check animation pause on hover (UX enhancement)
  console.log('✅ Test 5: Checking animation pause on hover...');
  
  const ownerPauseOnHover = ownerPreviewHTML.includes('.group:hover .animate-pulse-subtle') &&
                           ownerPreviewHTML.includes('animation-play-state: paused');
  const publicPauseOnHover = publicProfileHTML.includes('.group:hover .animate-float') &&
                            publicProfileHTML.includes('animation-play-state: paused');
  
  if (ownerPauseOnHover && publicPauseOnHover) {
    console.log('   ✓ Animations pause on hover for better UX');
  } else {
    throw new Error('Animation pause on hover not implemented');
  }

  // Test 6: Check professional animation timing
  console.log('✅ Test 6: Checking professional animation timing...');
  
  const ownerTiming = ownerPreviewHTML.includes('3s ease-in-out');
  const publicTiming = publicProfileHTML.includes('4s ease-in-out');
  
  if (ownerTiming && publicTiming) {
    console.log('   ✓ Professional timing: slow, smooth animations (3-4s)');
  } else {
    throw new Error('Animation timing not professional');
  }

  // Test 7: Check subtle animation values (enterprise-level)
  console.log('✅ Test 7: Checking subtle animation values...');
  
  const ownerSubtle = ownerPreviewHTML.includes('opacity: 0.8') && // Subtle opacity change
                     ownerPreviewHTML.includes('scale(1.02)'); // Minimal scale change
  const publicSubtle = publicProfileHTML.includes('translateY(-2px)') && // Minimal movement
                      publicProfileHTML.includes('scale(1.01)'); // Minimal scale change
  
  if (ownerSubtle && publicSubtle) {
    console.log('   ✓ Subtle, professional animation values');
  } else {
    throw new Error('Animation values not subtle enough for enterprise use');
  }

  // Test 8: Check different animations for variety
  console.log('✅ Test 8: Checking animation variety...');
  
  const hasDifferentAnimations = ownerPreviewHTML.includes('pulse-subtle') &&
                                publicProfileHTML.includes('float') &&
                                !ownerPreviewHTML.includes('float') &&
                                !publicProfileHTML.includes('pulse-subtle');
  
  if (hasDifferentAnimations) {
    console.log('   ✓ Different animations for visual variety');
  } else {
    throw new Error('Animation variety not implemented');
  }

  console.log('\n🎉 All tests passed! Social link icons have professional, enterprise-level animations.');
  console.log('\n📋 Professional Animation Features:');
  console.log('   • Owner Preview: Subtle pulse animation (3s cycle)');
  console.log('   • Public Profile: Gentle floating animation (4s cycle)');
  console.log('   • Minimal opacity changes (1.0 → 0.8)');
  console.log('   • Subtle scale effects (1.0 → 1.02/1.01)');
  console.log('   • Minimal vertical movement (-2px)');
  console.log('   • Smooth ease-in-out timing');
  console.log('   • Animation pauses on hover (better UX)');
  console.log('   • Different animations for visual variety');
  console.log('   • Enterprise-appropriate subtlety');
  console.log('   • Eye-catching but not distracting');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}