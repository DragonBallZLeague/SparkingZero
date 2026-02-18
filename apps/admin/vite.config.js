import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/SparkingZero/admin/',
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://sparking-zero-iota.vercel.app',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../../dist/admin',
    emptyOutDir: true
  },
  plugins: [react()]
});
