/** @type {import('jest').Config} */
const config = {
  displayName: 'integration',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/specs/**/*.test.ts'],
  globalSetup: '<rootDir>/global-setup.js',
  globalTeardown: '<rootDir>/global-teardown.js',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@common$': '<rootDir>/../../libs/common/src/index.ts',
    '^@/(.*)$': '<rootDir>/../../$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  maxWorkers: 1,
  verbose: true,
};

export default config;
