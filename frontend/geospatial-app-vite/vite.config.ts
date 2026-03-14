import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false, 
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        // Only use globDirectory & patterns in production
        globDirectory: process.env.NODE_ENV === 'production' ? 'dist' : undefined,
        globPatterns: process.env.NODE_ENV === 'production' ? ['**/*.{js,css,html,wasm}'] : undefined,
        globIgnores: ['**/node_modules/**/*', 'sw.js', 'workbox-*.js'],
      },
      manifest: {
        name: 'HazSpot',
        short_name: 'HazSpot',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0b1220',
        icons: [
          { src: '/pwa/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})