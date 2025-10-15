export default {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  transform: {},
  setupFiles: ['<rootDir>/tests/setup.js'],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons']
  }
};
