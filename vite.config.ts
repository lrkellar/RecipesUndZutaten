import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// base './' lets the built site work from any GitHub Pages sub-path.
export default defineConfig({
  base: './',
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,wasm,png,svg}'], maximumFileSizeToCacheInBytes: 8_000_000 },
      manifest: {
        name: 'Recipes und Zutaten',
        short_name: 'R&Z',
        start_url: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#b5532d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  // The package's default entry is browser-only; tests use its Node build.
  test: {
    environment: 'node',
    alias: {
      '@sqlite.org/sqlite-wasm': fileURLToPath(
        new URL('./node_modules/@sqlite.org/sqlite-wasm/sqlite-wasm/jswasm/sqlite3-node.mjs', import.meta.url)
      )
    }
  }
});
