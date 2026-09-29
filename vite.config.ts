import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vite 設定：React と PWA（オフライン対応）
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '100年後の街',
        short_name: '100年後の街',
        description: 'この街で、あなたの一日を過ごしてください。',
        lang: 'ja',
        start_url: './',
        scope: './',
        display: 'fullscreen',
        orientation: 'any',
        background_color: '#10131c',
        theme_color: '#10131c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
