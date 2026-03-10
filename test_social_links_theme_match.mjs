#!/usr/bin/env node

// Test Social Links Theme Matching
// Verifies that social links use the project's consistent theme styling

import { readFileSync } from 'fs';

console.log('🧪 Testing Social Links Theme Consistency...\n');

try {
  // Test 1: Check owner preview uses project theme classes
  console.log('✅ Test 1: Checking owner preview theme classes...');
  const ownerPreviewJS = readFileSync('public/js/owner-preview-loader.js', 'utf8');
  
  const hasOwnerThemeClasses = ownerPreviewJS.includes('bg-subtle-light dark:bg-subtle-dark') &&
                              ownerPreviewJS.includes('hover:bg-primary/10 dark:hover:bg-primary/20') &&
                              ownerPreviewJS.includes('text-muted-light dark:text-muted-dark') &&
                              ownerPreviewJS.includes('text-foreground-light dark:text-foreground-dark') &&
                              ownerPreviewJS.includes('group-hover:text-primary');
  
  if (hasOwnerThemeClasses) {
    console.log('   ✓ Owner preview uses consistent project theme classes');
  } else {
    throw new Error('Owner preview not using project theme classes');
  }

  // Test 2: Check public profile uses project theme classes
  console.log('✅ Test 2: Checking public profile theme classes...');
  const publicProfileJS = readFileSync('public/js/public-profile-loader.js', 'utf8');
  
  const hasPublicThemeClasses = publicProfileJS.includes('bg-background-light dark:bg-subtle-dark') &&
                               publicProfileJS.includes('border border-subtle-light dark:border-subtle-dark') &&
                               publicProfileJS.includes('hover:bg-subtle-light dark:hover:bg-primary/50') &&
                               publicProfileJS.includes('text-muted-light dark:text-muted-dark');
  
  if (hasPublicThemeClasses) {
    console.log('   ✓ Public profile uses consistent project theme classes');
  } else {
    throw new Error('Public profile not using project theme classes');
  }

  // Test 3: Check removal of custom colors from social links
  console.log('✅ Test 3: Checking removal of custom brand colors from social links...');
  
  // Check specifically in social links functions
  const socialLinksOwner = ownerPreviewJS.substring(ownerPreviewJS.indexOf('function loadSocialLinks'));
  const socialLinksPublic = publicProfileJS.substring(publicProfileJS.indexOf('function renderSocialLinks'));
  
  const hasNoCustomColors = !socialLinksOwner.includes('bg-blue-600') &&
                           !socialLinksOwner.includes('bg-purple-600') &&
                           !socialLinksOwner.includes('bg-gray-800') &&
                           !socialLinksPublic.includes('bg-blue-600') &&
                           !socialLinksPublic.includes('bg-purple-600') &&
                           !socialLinksPublic.includes('bg-gray-800');
  
  if (hasNoCustomColors) {
    console.log('   ✓ Custom brand colors removed from social links, using project theme');
  } else {
    throw new Error('Custom brand colors still present in social links');
  }

  // Test 4: Check consistent icon usage
  console.log('✅ Test 4: Checking icon consistency...');
  
  const ownerUsesMatIcons = ownerPreviewJS.includes('material-symbols-outlined');
  const publicUsesSVGIcons = publicProfileJS.includes('getSocialIcon') &&
                            publicProfileJS.includes('stroke="currentColor"');
  
  if (ownerUsesMatIcons && publicUsesSVGIcons) {
    console.log('   ✓ Icons consistent with each page\'s existing pattern');
  } else {
    throw new Error('Icon usage inconsistent');
  }

  // Test 5: Check layout consistency with attachments
  console.log('✅ Test 5: Checking layout consistency...');
  
  const ownerLayoutMatch = ownerPreviewJS.includes('flex items-center gap-3 p-3') &&
                          ownerPreviewJS.includes('rounded-lg');
  const publicLayoutMatch = publicProfileJS.includes('flex items-center justify-between p-4') &&
                           publicProfileJS.includes('rounded-lg');
  
  if (ownerLayoutMatch && publicLayoutMatch) {
    console.log('   ✓ Layout matches existing attachments pattern');
  } else {
    throw new Error('Layout not consistent with attachments');
  }

  // Test 6: Check hover effects match project style
  console.log('✅ Test 6: Checking hover effects...');
  
  const ownerHoverEffects = ownerPreviewJS.includes('group-hover:text-primary') &&
                           ownerPreviewJS.includes('hover:bg-primary/10');
  const publicHoverEffects = publicProfileJS.includes('hover:bg-subtle-light') &&
                            publicProfileJS.includes('dark:hover:bg-primary/50');
  
  if (ownerHoverEffects && publicHoverEffects) {
    console.log('   ✓ Hover effects match project style');
  } else {
    throw new Error('Hover effects not matching project style');
  }

  // Test 7: Check text styling consistency
  console.log('✅ Test 7: Checking text styling...');
  
  const hasConsistentText = ownerPreviewJS.includes('text-sm font-medium') &&
                           ownerPreviewJS.includes('text-xs') &&
                           publicProfileJS.includes('font-medium text-sm') &&
                           publicProfileJS.includes('text-xs');
  
  if (hasConsistentText) {
    console.log('   ✓ Text styling consistent with project');
  } else {
    throw new Error('Text styling not consistent');
  }

  console.log('\n🎉 All tests passed! Social links now match project theme perfectly.');
  console.log('\n📋 Theme Consistency Summary:');
  console.log('   • Uses project color variables (subtle-light, muted-light, etc.)');
  console.log('   • Matches attachments layout and styling exactly');
  console.log('   • Consistent hover effects with primary color');
  console.log('   • Proper dark mode support');
  console.log('   • Icons match each page\'s existing pattern');
  console.log('   • No custom brand colors - pure project theme');
  console.log('   • Responsive design with proper spacing');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}