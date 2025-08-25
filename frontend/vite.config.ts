import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import * as path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@domains': path.resolve(__dirname, 'src/domains'),
        '@features': path.resolve(__dirname, 'src/features'),
        '@pages': path.resolve(__dirname, 'src/pages'),
        '@styles': path.resolve(__dirname, 'src/styles'),
        '@theme': path.resolve(__dirname, 'src/theme'),
        '@assets': path.resolve(__dirname, 'src/assets'),
        '@app': path.resolve(__dirname, 'src/app'),
      },
    },
    cacheDir: 'node_modules/.vite-hpc',
    server: { port: 5173 },
    preview: { port: 4173 },
    build: {
      target: 'es2022',
      rollupOptions: { treeshake: true },
      outDir: '../backend/src/main/resources/static',
      emptyOutDir: true,
    },
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version),
      __API_BASE_URL__: JSON.stringify(env.VITE_API_BASE_URL ?? '/api'),
      __API_TIMEOUT__: JSON.stringify(env.VITE_API_TIMEOUT ?? '10000'),
      __API_WITH_CREDENTIALS__: JSON.stringify(env.VITE_API_WITH_CREDENTIALS ?? 'false'),
      global: 'window',
    },
  }
})
