import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1600,
    modulePreload: {
      resolveDependencies: (_filename, deps) => {
        return deps.filter(
          (dep) =>
            !dep.includes('vendor-office') &&
            !dep.includes('vendor-pdf') &&
            !dep.includes('vendor-ocr') &&
            !dep.includes('GenericPdfWorkspace') &&
            !dep.includes('OcrWorkspace') &&
            !dep.includes('blogs')
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdf-lib') || id.includes('pdfjs-dist') || id.includes('@pdfsmaller')) {
              return 'vendor-pdf';
            }
            if (id.includes('docx') || id.includes('mammoth') || id.includes('xlsx') || id.includes('pptxgenjs')) {
              return 'vendor-office';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
});
