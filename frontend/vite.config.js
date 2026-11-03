import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// API requests are proxied to the backend in development so no CORS setup is
// needed locally. In production set VITE_API_URL to the deployed API origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
