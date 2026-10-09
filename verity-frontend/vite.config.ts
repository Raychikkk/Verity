import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true, // для ngrok / cloudflared
    proxy: { '/api': 'http://localhost:3001' },
  },
});
