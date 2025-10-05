import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'prettier'),
  {
    ignores: [
      'node_modules/**',
      'public/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      '.husky/**',
      'dist/**',
      '*.log',
      'coverage/**',
      '.env*.local',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
      'playwright/.cache/**',
      'playwright/.auth/**'
    ],
  },
];

export default eslintConfig;