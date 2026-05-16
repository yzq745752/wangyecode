import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
        },
        '/uploads': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
        },
        '/sitemap.xml': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
        },
        '/rss.xml': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})