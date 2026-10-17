import './index.css';
// From JavaScript, as the apps do: it brings Quill's own css with it (`@import url('quill/dist/quill.snow.css')`),
// which Tailwind's `@import` would leave out.
import '@beautinique/frontend-styles/quill-input.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';

const root = document.getElementById('root');

// StrictMode runs every effect twice in development: the editor has to be made once all the same
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
