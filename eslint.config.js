import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

const sourceConfig = {
  files: ['src/js/**/*.{js,ts}'],
  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.es2025,
      ...globals.jest,
      ...globals.webextensions,
    },
    parser: tsParser,
  },
  plugins: {
    '@typescript-eslint': tseslint,
  },
  rules: {
    ...tseslint.configs.recommended.rules,
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-extra-semi': 'off',
    '@typescript-eslint/ban-ts-comment': [
      'error',
      { 'ts-ignore': 'allow-with-description' },
    ],
  },
};

export default [
  eslint.configs.recommended,
  sourceConfig,
  {
    files: ['src/js/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
    rules: {
      ...tseslint.configs['eslint-recommended'].overrides[0].rules,
    },
  },
];
