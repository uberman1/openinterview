/**
 * Property-Based Tests for Video Player Enhancement
 * Feature: video-player-enhancement, Property 7: Play button positioning
 * Validates: Requirements 1.3
 */

import { test, expect } from '@playwright/test';

test.describe('Video Player Enhancement - Property Tests', () => {
  
  /**
   * Property 7: Play button positioning
   * For any video container, the play button should have CSS positioning 
   * that centers it both horizontally and vertically
   * Validates: Requirements 1.3
   */
  test('Property 7: Play button positioning - always centered', async ({ page }) => {
    // Test with public profile page
    await page.goto('/public_profile.html', { waitUntil: 'domcontentloaded' });
    
    // Wait for any video containers to be rendered
    await page.waitForTimeout(1000);
    
    // Find all video containers on the page
    const videoContainers = await page.locator('.video-container').all();
    
    // Property: For ANY video container, play button should be centered
    for (let i = 0; i < videoContainers.length; i++) {
      const container = videoContainers[i];
      const playButtonOverlay = container.locator('.play-button-overlay');
      
      if (await playButtonOverlay.count() > 0) {
        // Check CSS positioning properties for centering
        const styles = await playButtonOverlay.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            position: computed.position,
            top: computed.top,
            left: computed.left,
            transform: computed.transform
          };
        });
        
        // Property assertion: Play button should be absolutely positioned and centered
        expect(styles.position).toBe('absolute');
        expect(styles.top).toBe('50%');
        expect(styles.left).toBe('50%');
        expect(styles.transform).toContain('translate(-50%, -50%)');
        
        console.log(`✓ Container ${i}: Play button properly centered`);
      }
    }
  });

  test('Property 7: Play button positioning - owner preview page', async ({ page }) => {
    // Test with owner preview page  
    await page.goto('/owner_preview.html', { waitUntil: 'domcontentloaded' });
    
    await page.waitForTimeout(1000);
    
    const videoContainers = await page.locator('.video-container').all();
    
    // Property: For ANY video container, play button should be centered
    for (let i = 0; i < videoContainers.length; i++) {
      const container = videoContainers[i];
      const playButtonOverlay = container.locator('.play-button-overlay');
      
      if (await playButtonOverlay.count() > 0) {
        const styles = await playButtonOverlay.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            position: computed.position,
            top: computed.top,
            left: computed.left,
            transform: computed.transform
          };
        });
        
        // Property assertion: Play button should be absolutely positioned and centered
        expect(styles.position).toBe('absolute');
        expect(styles.top).toBe('50%');
        expect(styles.left).toBe('50%');
        expect(styles.transform).toContain('translate(-50%, -50%)');
        
        console.log(`✓ Owner preview container ${i}: Play button properly centered`);
      }
    }
  });

  /**
   * Property test with multiple viewport sizes to ensure centering works responsively
   */
  test('Property 7: Play button positioning - responsive centering', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/public_profile.html', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      
      const videoContainers = await page.locator('.video-container').all();
      
      for (let i = 0; i < videoContainers.length; i++) {
        const container = videoContainers[i];
        const playButtonOverlay = container.locator('.play-button-overlay');
        
        if (await playButtonOverlay.count() > 0) {
          // Get container and button positions
          const containerBox = await container.boundingBox();
          const buttonBox = await playButtonOverlay.boundingBox();
          
          if (containerBox && buttonBox) {
            // Calculate center positions
            const containerCenterX = containerBox.x + containerBox.width / 2;
            const containerCenterY = containerBox.y + containerBox.height / 2;
            const buttonCenterX = buttonBox.x + buttonBox.width / 2;
            const buttonCenterY = buttonBox.y + buttonBox.height / 2;
            
            // Property: Button should be centered within container (with small tolerance)
            const tolerance = 2; // pixels
            expect(Math.abs(containerCenterX - buttonCenterX)).toBeLessThan(tolerance);
            expect(Math.abs(containerCenterY - buttonCenterY)).toBeLessThan(tolerance);
            
            console.log(`✓ ${viewport.name}: Container ${i} play button centered`);
          }
        }
      }
    }
  });
});

  /**
   * Property 5: Consistent container dimensions
   * For any two profiles (one with video, one without), their video containers 
   * should have identical width, height, and aspect ratio properties
   * Validates: Requirements 3.1, 3.5
   */
  test('Property 5: Consistent container dimensions - same dimensions regardless of video presence', async ({ page }) => {
    // Test both public profile and owner preview pages
    const pages = ['/public_profile.html', '/owner_preview.html'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      // Find all video containers
      const videoContainers = await page.locator('.video-container, .video-section-container, [class*="aspect-video"]').all();
      
      if (videoContainers.length > 0) {
        // Get dimensions of first container as reference
        const firstContainer = videoContainers[0];
        const firstBox = await firstContainer.boundingBox();
        const firstStyles = await firstContainer.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            width: computed.width,
            height: computed.height,
            aspectRatio: computed.aspectRatio || 'auto'
          };
        });
        
        // Property: ALL video containers should have identical dimensions
        for (let i = 1; i < videoContainers.length; i++) {
          const container = videoContainers[i];
          const containerBox = await container.boundingBox();
          const containerStyles = await container.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              width: computed.width,
              height: computed.height,
              aspectRatio: computed.aspectRatio || 'auto'
            };
          });
          
          if (firstBox && containerBox) {
            // Property assertion: Dimensions should be consistent
            expect(containerBox.width).toBeCloseTo(firstBox.width, 1);
            expect(containerBox.height).toBeCloseTo(firstBox.height, 1);
            
            // Check CSS properties
            expect(containerStyles.width).toBe(firstStyles.width);
            expect(containerStyles.height).toBe(firstStyles.height);
            
            console.log(`✓ ${pagePath}: Container ${i} has consistent dimensions with container 0`);
          }
        }
      }
    }
  });

  /**
   * Property test for aspect ratio consistency
   */
  test('Property 5: Consistent container dimensions - 16:9 aspect ratio maintained', async ({ page }) => {
    const pages = ['/public_profile.html', '/owner_preview.html'];
    
    for (const pagePath of pages) {
      await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      const videoContainers = await page.locator('.video-container, .video-section-container, [class*="aspect-video"]').all();
      
      for (let i = 0; i < videoContainers.length; i++) {
        const container = videoContainers[i];
        const containerBox = await container.boundingBox();
        
        if (containerBox) {
          // Property: All video containers should maintain 16:9 aspect ratio
          const aspectRatio = containerBox.width / containerBox.height;
          const expected16by9 = 16 / 9;
          
          // Allow small tolerance for rounding
          expect(aspectRatio).toBeCloseTo(expected16by9, 1);
          
          console.log(`✓ ${pagePath}: Container ${i} maintains 16:9 aspect ratio (${aspectRatio.toFixed(2)})`);
        }
      }
    }
  });

  /**
   * Property test across different viewport sizes to ensure consistent dimensions
   */
  test('Property 5: Consistent container dimensions - responsive consistency', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' }
    ];
    
    const dimensionsByViewport = {};
    
    // Collect dimensions for each viewport
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/public_profile.html', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      
      const videoContainers = await page.locator('.video-container, .video-section-container, [class*="aspect-video"]').all();
      
      if (videoContainers.length > 0) {
        const containerBox = await videoContainers[0].boundingBox();
        if (containerBox) {
          dimensionsByViewport[viewport.name] = {
            aspectRatio: containerBox.width / containerBox.height,
            width: containerBox.width,
            height: containerBox.height
          };
        }
      }
    }
    
    // Property: Aspect ratio should be consistent across all viewports
    const aspectRatios = Object.values(dimensionsByViewport).map(d => d.aspectRatio);
    if (aspectRatios.length > 1) {
      const firstRatio = aspectRatios[0];
      for (let i = 1; i < aspectRatios.length; i++) {
        expect(aspectRatios[i]).toBeCloseTo(firstRatio, 1);
      }
      console.log('✓ Aspect ratio consistent across all viewports');
    }
  });