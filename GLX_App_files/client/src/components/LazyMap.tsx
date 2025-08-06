/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { Suspense, lazy } from 'react';
import { MapPin } from '@/lib/icons';

// Lazy load the actual map component to reduce initial bundle size
const OpenStreetMap = lazy(() => import('./OpenStreetMap'));

interface LazyMapProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  markers?: Array<{
    id: string;
    lat: number;
    lng: number;
    title?: string;
    description?: string;
  }>;
  className?: string;
  height?: string;
}

// Loading component for the map
const MapLoadingFallback = ({ height = '400px' }: { height?: string }) => (
  <div
    className='flex items-center justify-center bg-gray-100 rounded-lg border'
    style={{ height }}
  >
    <div className='text-center'>
      <MapPin className='h-8 w-8 text-gray-400 mx-auto mb-2' />
      <p className='text-gray-500 text-sm'>Loading map...</p>
    </div>
  </div>
);

// Main lazy map component
export const LazyMap: React.FC<LazyMapProps> = ({ height = '400px', ...props }) => {
  return (
    <Suspense fallback={<MapLoadingFallback height={height} />}>
      <OpenStreetMap {...props} />
    </Suspense>
  );
};

export default LazyMap;
