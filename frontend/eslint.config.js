import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import path from "node:path";
import { fileURLToPath } from 'node:url'; // ← 추가

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // ← 추가

export default [
  js.configs.recommended,
  {
    ignores: [
      'node_modules',
      'dist',
      'apps/*/dist',
      'apps/*/build',
      'shared/dist',
      'eslint.config.js'
    ],
  },
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // 👉 Type-aware linting을 위한 tsconfig 지정
        project: [
          './tsconfig.base.json',
          './apps/hpc/tsconfig.app.json',
          './apps/hwc/tsconfig.app.json',
          './shared/tsconfig.json',
        ],
        tsconfigRootDir: __dirname, // 루트 기준 해석 보장
      },
      sourceType: 'module',
      ecmaVersion: 'latest',
      globals: {
        // ✅ 브라우저/Node 전역 객체 등록
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        process: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        alert: 'readonly',
        setTimeout: 'readonly',
        cancelAnimationFrame: 'readonly',
        requestAnimationFrame: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLElement: 'readonly',
        ResizeObserver: 'readonly',
        MouseEvent: 'readonly',
        WheelEvent: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettier,
      react: react,
    },
    rules: {
      // 🔧 충돌 방지
      'no-unused-vars': 'off',

      // ✅ 타입 기반으로 unused-vars 검사
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // ✅ 기타 룰 유지
      'prettier/prettier': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
];
