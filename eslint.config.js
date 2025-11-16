import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

const tsRules = {
  ...tsPlugin.configs.recommended.rules,
  '@typescript-eslint/no-unused-vars': [
    'warn',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
  quotes: ['error', 'single', { avoidEscape: true }],
  'quote-props': ['error', 'as-needed'],
};

const tsParserOptions = {
  ecmaVersion: 'latest',
  sourceType: 'module',
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'front/**'],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: tsParserOptions,
      globals: globals.node,
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: tsRules,
  },
];
