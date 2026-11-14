import shared from '../web/eslint.config.mjs';

export default [
  ...shared,
  { settings: { next: { rootDir: import.meta.dirname } } },
  // This preload must run as CommonJS before Next/ESM evaluates server modules.
  { files: ['scripts/**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
];
