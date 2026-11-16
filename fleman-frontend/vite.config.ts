import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const API_TARGET = env.VITE_API_TARGET
  const OAUTH_TARGET = env.VITE_OAUTH_TARGET || API_TARGET

  console.log('')
  console.log('======================================')
  console.log(`[vite] Mode: ${mode}`)
  console.log(`[vite] Command: ${command}`)
  console.log(`[vite] API Target: ${API_TARGET || 'not required'}`)
  console.log(`[vite] OAuth Target: ${OAUTH_TARGET || 'not required'}`)
  console.log('======================================')
  console.log('')

  // Only require API_TARGET when running the Vite development server.
  // During production build, nginx/container configuration handles API routing.
  if (command === 'serve' && !API_TARGET) {
    throw new Error(
      `[vite] VITE_API_TARGET is not defined for mode "${mode}". ` +
      `Make sure .env.${mode} exists and contains VITE_API_TARGET.`
    )
  }

  return {
    base: '/',

    build: {
      sourcemap: false,
      minify: true,
    },

    plugins: [
      react(),
      tailwindcss(),
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    server: {
      port: 5174,
      strictPort: false,

      proxy: {
        '/api': {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
        },

        '/health': {
          target: API_TARGET,
          changeOrigin: true,
          secure: false,
        },

        '/oauth2': {
          target: OAUTH_TARGET,
          changeOrigin: true,
          secure: false,
        },

        '/login/oauth2': {
          target: OAUTH_TARGET,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})