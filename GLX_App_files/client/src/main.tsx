/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 * 
 * ⚠️  TERMS:
 * - Commercial use strictly prohibited without written permission from copyright holder
 * - Forking/derivative works prohibited without written permission
 * - Violations subject to legal action and damages
 * 
 * See LICENSE file in repository root for full terms.
 * Contact: roselleroberts@pm.me for licensing inquiries
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';

import './index.css';

// Lazy load analytics for better initial load performance
const AnalyticsWrapper = React.lazy(() =>
  import('@vercel/analytics/react').then(module => ({
    default: () => <module.Analytics />,
  }))
);

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
