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
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface OpenStreetMapProps {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  markers?: Array<{
    id: string;
    lat: number;
    lng: number;
    title?: string;
    popup?: string;
  }>;
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
  className?: string;
}

export function OpenStreetMap({
  latitude = 40.7128,
  longitude = -74.006,
  zoom = 13,
  markers = [],
  onMapClick,
  height = '400px',
  className = '',
}: OpenStreetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    mapInstanceRef.current = L.map(mapRef.current).setView([latitude, longitude], zoom);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapInstanceRef.current);

    // Add click event listener
    if (onMapClick) {
      mapInstanceRef.current.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map center when coordinates change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], zoom);
    }
  }, [latitude, longitude, zoom]);

  // Update markers when markers prop changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    // Add new markers
    markers.forEach(markerData => {
      const marker = L.marker([markerData.lat, markerData.lng]);

      if (markerData.title) {
        marker.bindTooltip(markerData.title);
      }

      if (markerData.popup) {
        marker.bindPopup(markerData.popup);
      }

      marker.addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });
  }, [markers]);

  return (
    <div ref={mapRef} style={{ height }} className={`w-full rounded-lg border ${className}`} />
  );
}

export default OpenStreetMap;
