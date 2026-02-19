import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  base: '/SparkingZero/analyzer/',
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: '../../dist/analyzer',
    emptyOutDir: true
  },
  plugins: [
    react(),
    {
      name: 'copy-shared-referencedata',
      buildStart() {
        // Copy shared referencedata files during build for consistency
        const sharedPath = resolve(__dirname, '../../referencedata')
        const localPath = resolve(__dirname, 'referencedata')
        try {
          copyFileSync(`${sharedPath}/characters.csv`, `${localPath}/characters.csv`)
          copyFileSync(`${sharedPath}/capsules.csv`, `${localPath}/capsules.csv`)
        } catch (err) {
          console.warn('Could not copy shared referencedata files:', err.message)
        }
      }
    }
  ]
});
