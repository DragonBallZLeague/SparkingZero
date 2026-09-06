import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: '/SparkingZero/calculator/',
  resolve: {
    alias: {
      '@szl/ui': resolve(__dirname, '../../packages/ui/src'),
    },
  },
  plugins: [react()],
  build: {
    outDir: '../../dist/calculator',
    emptyOutDir: true,
  },
  server: {
    port: 5175,
    strictPort: true,
  },
});
