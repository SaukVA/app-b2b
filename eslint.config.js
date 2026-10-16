const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/release/**',
      '**/coverage/**',
      'apps/desktop/renderer/**',
      '**/*.min.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Constitución, principio IV: funciones cortas y poco anidadas.
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 2],
    },
  },
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { require: 'readonly', module: 'writable', __dirname: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // apps/client es "type": "module": sus .js son ES modules.
    files: ['apps/client/**/*.js'],
    languageOptions: { sourceType: 'module' },
  },
);
