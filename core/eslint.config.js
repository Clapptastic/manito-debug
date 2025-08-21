import js from '@eslint/js';
import node from 'eslint-plugin-node';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    plugins: {
      node,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {
      ...node.configs.recommended.rules,
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'no-undef': 'error',
    },
  },
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    rules: {
      'no-console': 'off',
    },
  },
];
