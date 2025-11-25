import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5555', // your Express backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Optimización del build
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'google-maps': ['@react-google-maps/api', '@googlemaps/markerclusterer'],
          'mui': ['@mui/material', '@mui/icons-material'],
        },
      },
    },
    // Optimización de assets
    assetsInlineLimit: 4096, // Inline assets menores a 4KB
    chunkSizeWarningLimit: 1000,
  },
  // Optimización de dependencias
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios'],
    exclude: ['@react-google-maps/api'], // Cargar bajo demanda
  },
});
