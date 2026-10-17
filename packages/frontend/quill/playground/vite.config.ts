import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// A page that uses the package the way an app does (through its public import paths), to look at the
// editor and the viewer in a real browser. It is not part of the package: "files" in package.json
// leaves it out. Build the package first (`npm run build`): the page uses `dist`.
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  resolve: { dedupe: ['react', 'react-dom', 'quill'] },
  server: { port: 4203, strictPort: true },
});
