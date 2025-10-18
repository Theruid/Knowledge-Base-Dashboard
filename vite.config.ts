import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true
    },
    proxy: {
      '/api': {
        target: 'http://server:3001',
        changeOrigin: true,
        secure: false,
        // Don't rewrite the path since the server expects /api prefix
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  define: {
    // Make sure the environment variables are available
    'process.env': {}
  }
});
