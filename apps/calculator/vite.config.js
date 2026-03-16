import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/SparkingZero/calculator/',
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
