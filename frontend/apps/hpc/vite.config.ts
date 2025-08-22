// apps/hpc/vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // 앱 폴더 내 .env.<mode>
  return {
    plugins: [react()],
    resolve: {
      alias: { '@shared': path.resolve(__dirname, '../../shared/src') },
    },
    cacheDir: 'node_modules/.vite-hpc',
    server: { port: 5173 },
    preview: { port: 4173 },
    build: {
      target: 'es2022',
      rollupOptions: { treeshake: true },
      // 빌드 결과물이 생성될 경로를 backend 모듈로 지정
      outDir: '../../../backend/src/main/resources/static',
      // 빌드 시 기존 폴더를 깨끗하게 비움
      emptyOutDir: true,
    },
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version),
      __API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL ?? '/api'),
      __API_TIMEOUT__: JSON.stringify(env.VITE_API_TIMEOUT ?? '10000'),
      __API_WITH_CREDENTIALS__: JSON.stringify(env.VITE_API_WITH_CREDENTIALS ?? 'false'),
      global: 'window', // global 변수를 window로 대체합니다.
    },
  };
});
