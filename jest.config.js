export default {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
