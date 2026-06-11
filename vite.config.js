import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // TIFF: runtime binary via file.arrayBuffer() only — not imported as modules/assets.
  optimizeDeps: {
    include: ['geotiff'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'favicon.svg'],
      manifest: {
        name: 'Lab Tools',
        short_name: 'LabTools',
        description: 'Endpoint analysis and colony counting tools for microbiology labs',
        start_url: './',
        display: 'standalone',
        background_color: '#13294B',
        theme_color: '#13294B',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        runtimeCaching: [],
      },
    }),
  ],
  base: './',
  build: {
    sourcemap: false,
    emptyOutDir: true,
  },
});
