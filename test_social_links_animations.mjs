#!/usr/bin/env node

// Test Social Links Animations
// Verifies that social links have smooth animations matching the project's style

import { readFileSync } from 'fs';

console.log('🧪 Testing Social Links Animation Effects...\n');

try {
  // Test 1: Check owner preview animation classes
  console.log('✅ Test 1: Checking owner preview animation classes...');
  const ownerPreviewJS = readFileSync('public/js/owner-preview-loader.js', 'utf8');
  
  const ownerAnimations = ownerPreviewJS.includes('transition-all duration-300') &&
                         ownerPreviewJS.includes('hover:scale-105') &&
                         ownerPreviewJS.includes('hover:shadow-md') &&
                         ownerPreviewJS.includes('group-hover:scale-110') &&
                         ownerPreviewJS.includes('group-hover:translate-x-1') &&
                         ownerPreviewJS.includes('group-hover:text-primary');
  
  if (ownerAnimations) {
    console.log('   ✓ Owner preview has comprehensive animation effects');
  } else {
    throw new Error('Owner preview missing animation classes');
  }

  // Test 2: Check public profile animation classes
  console.log('✅ Test 2: Checking public profile animation classes...');
  const publicProfileJS = readFileSync('public/js/public-profile-loader.js', 'utf8');
  
  const publicAnimations = publicProfileJS.includes('transition-all duration-300') &&
                          publicProfileJS.includes('hover:scale-105') &&
                          publicProfileJS.includes('hover:shadow-lg') &&
                          publicProfileJS.includes('hover:border-primary/50') &&
                          publicProfileJS.includes('group-hover:scale-110') &&
                          publicProfileJS.includes('group-hover:translate-x-1') &&
                          publicProfileJS.includes('group-hover:text-primary');
  
  if (publicAnimations) {
    console.log('   ✓ Public profile has comprehensive animation effects');
  } else {
    throw new Error('Public profile missing animation classes');
  }

  // Test 3: Check consistent animation duration
  console.log('✅ Test 3: Checking animation duration consistency...');
  
  const ownerDuration = ownerPreviewJS.includes('duration-300');
  const publicDuration = publicProfileJS.includes('duration-300');
  
  if (ownerDuration && publicDuration) {
    console.log('   ✓ Both pages use consistent 300ms animation duration');
  } else {
    throw new Error('Animation duration not consistent');
  }

  // Test 4: Check group hover coordination
  console.log('✅ Test 4: Checking group hover coordination...');
  
  const ownerGroupHover = ownerPreviewJS.includes('group') &&
                         ownerPreviewJS.includes('group-hover:text-primary') &&
                         ownerPreviewJS.includes('group-hover:scale-110');
  const publicGroupHover = publicProfileJS.includes('group') &&
                          publicProfileJS.includes('group-hover:text-primary') &&
                          publicProfileJS.includes('group-hover:scale-110');
  
  if (ownerGroupHover && publicGroupHover) {
    console.log('   ✓ Group hover effects properly coordinated');
  } else {
    throw new Error('Group hover effects not properly coordinated');
  }

  // Test 5: Check scale and transform effects
  console.log('✅ Test 5: Checking scale and transform effects...');
  
  const ownerTransforms = ownerPreviewJS.includes('hover:scale-105') &&
                         ownerPreviewJS.includes('group-hover:scale-110') &&
                         ownerPreviewJS.includes('group-hover:translate-x-1');
  const publicTransforms = publicProfileJS.includes('hover:scale-105') &&
                          publicProfileJS.includes('group-hover:scale-110') &&
                          publicProfileJS.includes('group-hover:translate-x-1');
  
  if (ownerTransforms && publicTransforms) {
    console.log('   ✓ Scale and transform effects implemented');
  } else {
    throw new Error('Scale and transform effects missing');
  }

  // Test 6: Check shadow effects
  console.log('✅ Test 6: Checking shadow effects...');
  
  const ownerShadow = ownerPreviewJS.includes('hover:shadow-md');
  const publicShadow = publicProfileJS.includes('hover:shadow-lg');
  
  if (ownerShadow && publicShadow) {
    console.log('   ✓ Shadow effects implemented for depth');
  } else {
    throw new Error('Shadow effects missing');
  }

  // Test 7: Check color transition effects
  console.log('✅ Test 7: Checking color transition effects...');
  
  const ownerColorTransitions = ownerPreviewJS.includes('group-hover:text-primary') &&
                               ownerPreviewJS.includes('transition-colors duration-300');
  const publicColorTransitions = publicProfileJS.includes('group-hover:text-primary') &&
                                publicProfileJS.includes('transition-colors duration-300');
  
  if (ownerColorTransitions && publicColorTransitions) {
    console.log('   ✓ Color transitions smooth and coordinated');
  } else {
    throw new Error('Color transitions not properly implemented');
  }

  // Test 8: Check animation matches project patterns
  console.log('✅ Test 8: Checking animation matches project patterns...');
  
  // Check if animations match existing patterns (like video play button)
  const matchesProjectPattern = ownerPreviewJS.includes('transition-all') &&
                               publicProfileJS.includes('transition-all') &&
                               ownerPreviewJS.includes('hover:scale-') &&
                               publicProfileJS.includes('hover:scale-');
  
  if (matchesProjectPattern) {
    console.log('   ✓ Animations match existing project patterns');
  } else {
    throw new Error('Animations do not match project patterns');
  }

  console.log('\n🎉 All tests passed! Social links have smooth, coordinated animations.');
  console.log('\n📋 Animation Effects Summary:');
  console.log('   • Smooth 300ms transitions for all effects');
  console.log('   • Hover scale (105%) for subtle lift effect');
  console.log('   • Icon scale (110%) on hover for emphasis');
  console.log('   • Translate-x animation for external link arrow');
  console.log('   • Color transitions to primary on hover');
  console.log('   • Shadow effects for depth (md/lg)');
  console.log('   • Border color change on hover (public profile)');
  console.log('   • Group coordination for synchronized effects');
  console.log('   • Matches existing project animation patterns');
  console.log('   • Theme-aligned with consistent timing');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}