import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import './index.css';
import App from './App';

// Track input modality so the focus ring shows for keyboard users only.
const root = document.documentElement;
window.addEventListener(
  'keydown',
  (e) => {
    if (!e.metaKey && !e.ctrlKey && !e.altKey) root.dataset.input = 'keyboard';
  },
  true,
);
window.addEventListener('pointerdown', () => (root.dataset.input = 'pointer'), true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
