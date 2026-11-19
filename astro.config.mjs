// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://10-dashboard-ventas.vercel.app',
  // Inline CSS: no render-blocking stylesheet request on first paint.
  build: { inlineStylesheets: 'always' },
});
