// Site statique : tout est calculé au build, à partir des JSON exportés par le pipeline.
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://vote-assemblee.pages.dev',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
