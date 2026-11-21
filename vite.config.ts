import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Cursor-Hackathon-Mendoza/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: asset => asset.names.includes('spa.traineddata.gz')
          ? 'assets/ocr/spa.traineddata.gz'
          : 'assets/[name]-[hash][extname]',
      },
    },
  },
});
