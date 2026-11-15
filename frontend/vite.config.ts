import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      cesium: path.resolve(__dirname, './node_modules/cesium/Source/Cesium.js'),
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Keep Cesium workers loadable from /cesium/ at runtime
      },
    },
  },
  server: {
    port: 5173,
    open: true,
    host: true,
  },
});
