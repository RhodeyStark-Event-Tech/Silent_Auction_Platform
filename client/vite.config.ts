import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development the client proxies /api to the Express server so the app
// can be served from a single origin and avoid CORS during local dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
