import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import './shared/theme.css';
import App from './App.jsx';
import { initElectronCloseHandler } from './shared/electronCloseHandler';

registerSW({ immediate: true });

if (window.isElectron) {
  document.documentElement.classList.add('is-electron');
}

initElectronCloseHandler();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
