import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
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
