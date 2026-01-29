/**
 * CMPLX Systems Monitor - Enterprise Network Management
 * Main Application Component
 *
 * Copyright (c) 2026 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SystemsMonitorPage } from './pages/SystemsMonitorPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SystemsMonitorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
