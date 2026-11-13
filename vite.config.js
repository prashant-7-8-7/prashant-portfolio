import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      input: {
        workbench: resolve(import.meta.dirname, 'index.html'),
        legacyProjects: resolve(import.meta.dirname, 'rover/index.html'),
        laptop: resolve(import.meta.dirname, 'laptop/index.html'),
        portfolio: resolve(import.meta.dirname, 'portfolio/index.html'),
      },
    },
  },
});
