import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './styles/globals.css';

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
});

console.log('[RAFIQ GUI] Starting application...');

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('[RAFIQ GUI] ERROR: Root element not found!');
  document.body.innerHTML = '<div style="color: white; padding: 20px;">Error: Root element not found</div>';
} else {
  console.log('[RAFIQ GUI] Root element found, mounting React...');

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );

  console.log('[RAFIQ GUI] React mounted successfully');
}