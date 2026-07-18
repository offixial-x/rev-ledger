import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rawPort = process.env.PORT ?? '3000';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Base path for the app. In Replit the workflow sets BASE_PATH; for GitHub Pages
// we default to /rev-ledger/ so the static build works under the repository path.
const basePath = process.env.BASE_PATH ?? '/rev-ledger/';

export default defineConfig({
  base: basePath,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
