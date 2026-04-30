import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    open: true,
    host: true, // Listen on all addresses
    strictPort: true,
    allowedHosts: [
      '.ngrok-free.app', // Allow all ngrok-free.app subdomains
      '.ngrok.io', // Allow all ngrok.io subdomains (paid ngrok)
    ],
    // HMR config - only set clientPort for ngrok (when using HTTPS)
    // For local dev, it will use default (same as server port)
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
