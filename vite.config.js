import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        //manualChunks: false,
        //inlineDynamicImports: true, // doesn't work with multiple entry points
        //assetFileNames: '[name].[ext]'/,
        inlineDynamicImports: false,
        format: 'iife',
        manualChunks: () => "_",
      },
      input:
      {
        page: 'src/page.ts',
        options: 'src/options.ts',
        // Add more entry points as needed
      },
    },
  },
});
