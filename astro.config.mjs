// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://chillaxcreek.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
