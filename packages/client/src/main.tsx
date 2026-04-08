import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorldPage } from './app.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorldPage />
  </StrictMode>,
);
