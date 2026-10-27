/** @type {import('jest').Config} */
export default {
  testEnvironment: '<rootDir>/test/jsdomEnvironment.cjs',
  setupFiles: ['<rootDir>/test/setupTests.cjs'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { tsconfig: { jsx: 'react-jsx', module: 'commonjs', moduleResolution: 'node10' } },
    ],
  },
  moduleNameMapper: {
    '\\.css$': '<rootDir>/test/styleMock.cjs',
    '^@app/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
