// playwright.config.js - CI-stable config with software rendering for headless tests
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:5000',
    headless: true,
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    
    launchOptions: {
      args: [
        '--disable-gpu',              // Critical: Force software rendering
        '--use-gl=swiftshader',       // Critical: Use SwiftShader for painting
        '--disable-dev-shm-usage',    // Fix for container environments
        '--no-sandbox',               // Required for some CI environments
        '--disable-setuid-sandbox'    // Additional sandbox bypass
      ]
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome']
      }
    }
  ]
});
