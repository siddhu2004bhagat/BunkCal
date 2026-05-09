import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Bunkwise',
        short_name: 'Bunkwise',
        description: 'Smart student attendance tracker',
        theme_color: '#091426',
        background_color: '#f7f9fb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/dashboard',
        icons: [
          { src: '/icons.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache app shell and static assets
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Cache Supabase API responses for offline use
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 24h
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor-react'
            if (id.includes('@tanstack') || id.includes('zustand')) return 'vendor-query'
            if (id.includes('framer-motion') || id.includes('lucide-react')) return 'vendor-ui'
            if (id.includes('recharts')) return 'vendor-charts'
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) return 'vendor-forms'
            if (id.includes('@supabase')) return 'vendor-supabase'
            return 'vendor'
          }
        },
      },
    },
  },
})
