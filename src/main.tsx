import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import i18n from './lib/i18n';
import { rabiriichi } from './net/client';
import { browserSoundPlayer } from './platform/soundBrowser';

// Composition root: install the browser (howler-backed) sound player onto the
// shared client. The client core defaults to no audio so it stays runnable on
// non-browser hosts; the web entry point opts into sound here.
rabiriichi.setSoundPlayer(browserSoundPlayer);
// Install the app localizer so cached chat sender names resolve AI display
// names; the core defaults to an identity translator.
rabiriichi.setTranslate((key) => i18n.t(key));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
