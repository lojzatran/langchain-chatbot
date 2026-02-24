module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/specs/**/*.test.cjs',
    '<rootDir>/specs/**/*.test.ts',
  ],
  globalSetup: '<rootDir>/global-setup.cjs',
  globalTeardown: '<rootDir>/global-teardown.cjs',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@common$': '<rootDir>/../../libs/common/src/index.ts',
    '^@/(.*)$': '<rootDir>/../../$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'cjs'],
  maxWorkers: 1,
  verbose: true,
};
