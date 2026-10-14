/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs', moduleResolution: 'node10' } }],
  },
  moduleNameMapper: {
    '^@app/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
