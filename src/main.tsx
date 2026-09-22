import './polyfills';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DesktopApp from './desktop/DesktopApp';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <DesktopApp />
    </ErrorBoundary>
  </StrictMode>
);
