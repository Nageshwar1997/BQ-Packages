import { fileURLToPath } from 'node:url';

import { tryOnVitePlugin } from '@beautinique/frontend-tryon/vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// A page that uses the package the way an app does (through its public import paths and the Vite
// plugin it gives), to look at the try-on in a real browser. It is not part of the package: "files" in
// package.json leaves it out. Build the package first (`npm run build`): the page uses `dist`.
//
// The models and the images are served from the assets package of this monorepo (`publicDir`), so
// `assets={{ baseUrl: '/' }}` reaches `/models/face_landmarker.task` and `/images/...`. The WebAssembly
// of MediaPipe comes from the CDN, as in an app.
export default defineConfig({
  root: import.meta.dirname,
  publicDir: fileURLToPath(new URL('../../tryon-assets', import.meta.url)),
  plugins: [react(), tailwindcss(), tryOnVitePlugin()],
  resolve: { dedupe: ['react', 'react-dom'] },
  server: { port: 4202, strictPort: true },
});
