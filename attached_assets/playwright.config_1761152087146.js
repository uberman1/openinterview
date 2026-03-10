// playwright.config.js
/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './tests',
  use: {
    headless: true
  },
  webServer: {
    command: 'npx http-server -p 4173',
    url: 'http://localhost:4173/share.html?profileId=42',
    reuseExistingServer: !process.env.CI,
  },
};
export default config;
