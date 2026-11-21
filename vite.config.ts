import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
