import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Force Vite to pre-bundle the linked workspace package, so its
    // CommonJS exports get converted to ESM (via esbuild) instead of
    // being served raw through the /@fs/ symlink path.
    include: ['@chess4/engine'],
  },
  build: {
    commonjsOptions: {
      // Same idea for production builds: Rollup's commonjs plugin only
      // processes paths matching /node_modules/ by default, which excludes
      // the symlink's real underlying path (packages/engine/...).
      include: [/engine/, /node_modules/],
    },
  },
});