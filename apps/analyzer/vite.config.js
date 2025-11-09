import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
  plugins: [react()]
});
