import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset paths relative so the site works on GitHub Pages
// (https://stevenchristie.github.io/DMZ/) without hard-coding the repo name.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: { environment: 'node' },
});
