// playwright.config.js
/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './tests',
  use: {
    headless: true,
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--use-gl=swiftshader',
        '--single-process'
      ]
    }
  },
  webServer: {
    command: 'npx http-server -p 4173',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI
  }
};
export default config;
