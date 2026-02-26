/** @type {import('jest').Config} */
const config = {
  displayName: 'integration',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/specs/**/*.test.ts'],
  globalSetup: '<rootDir>/../shared/infra/start-infra.js',
  globalTeardown: '<rootDir>/global-teardown.js',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
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
