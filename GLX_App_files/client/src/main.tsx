/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';

import './index.css';

// Lazy load analytics for better initial load performance
const AnalyticsWrapper = React.lazy(() =>
const AnalyticsWrapper = React.lazy(() =>
  import('@vercel/analytics/react').then(module => ({
    default: () => <module.Analytics />,
  }))
);

const SpeedInsightsWrapper = React.lazy(() =>
const SpeedInsightsWrapper = React.lazy(() =>
  import('@vercel/speed-insights/react').then(module => ({
    default: () => <module.SpeedInsights />,
  }))
);

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function updateDarkClass(e = null) {
  const isDark = e ? e.matches : darkQuery.matches;
  document.documentElement.classList.toggle('dark', isDark);
}

updateDarkClass();
darkQuery.addEventListener('change', updateDarkClass);

// Register service worker for lean civic data caching
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('🌟 Service Worker registered for lean civic caching:', registration.scope);
      })
      .catch(error => {
        console.warn('⚠️ Service Worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <React.Suspense fallback={null}>
      <AnalyticsWrapper />
      <SpeedInsightsWrapper />
    </React.Suspense>
  </React.StrictMode>
);
