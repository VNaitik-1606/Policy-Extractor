import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

/** Vite plugin: copy manifest.json into dist after every build */
function copyManifest() {
  return {
    name: 'copy-manifest',
    closeBundle() {
      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(__dirname, 'dist/manifest.json')
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), copyManifest()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.js'),
        content: resolve(__dirname, 'src/content/content.js'),
      },
      output: {
        entryFileNames: (chunk) => {
          // Keep service-worker and content script paths stable
          if (chunk.name === 'service-worker') return 'src/background/service-worker.js';
          if (chunk.name === 'content') return 'src/content/content.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
