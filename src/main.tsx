import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './lib/i18n';
import { rabiriichi } from './net/client';
import { browserSoundPlayer } from './platform/soundBrowser';

// Composition root: install the browser (howler-backed) sound player onto the
// shared client. The client core defaults to no audio so it stays runnable on
// non-browser hosts; the web entry point opts into sound here.
rabiriichi.setSoundPlayer(browserSoundPlayer);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
