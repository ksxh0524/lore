import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { DeviceSelector } from './app.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DeviceSelector />
  </StrictMode>,
);
