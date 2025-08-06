/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useEffect, useState } from 'react';

// Extended interface for PerformanceEventTiming
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart?: number;
  processingEnd?: number;
}

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
}

interface PerformanceMonitorProps {
  onMetricsUpdate?: (metrics: Partial<PerformanceMetrics>) => void;
  reportToConsole?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  onMetricsUpdate,
  reportToConsole = process.env.NODE_ENV === 'development',
}) => {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});

  useEffect(() => {
    const measurePerformance = () => {
      // Get navigation timing
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      if (navigation) {
        const newMetrics: Partial<PerformanceMetrics> = {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded:
            navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        };

        // Get paint timing
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            newMetrics.firstContentfulPaint = entry.startTime;
          }
        });

        setMetrics(prev => ({ ...prev, ...newMetrics }));
        onMetricsUpdate?.(newMetrics);

        if (reportToConsole) {
          console.log('🚀 Performance Metrics:', newMetrics);
        }
      }
    };

    // Measure immediately if DOM is already loaded
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
    }

    // Measure LCP using PerformanceObserver if available
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver(entryList => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];

          if (lastEntry) {
            const lcpMetric = { largestContentfulPaint: lastEntry.startTime };
            setMetrics(prev => ({ ...prev, ...lcpMetric }));
            onMetricsUpdate?.(lcpMetric);

            if (reportToConsole) {
              console.log('📊 LCP:', lastEntry.startTime.toFixed(2), 'ms');
            }
          }
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // Measure FID
        const fidObserver = new PerformanceObserver(entryList => {
          const entries = entryList.getEntries();
          entries.forEach(entry => {
            // Cast to PerformanceEventTiming for first-input entries
            const eventEntry = entry as PerformanceEventTiming;
            if (eventEntry.processingStart) {
              const fidMetric = {
                firstInputDelay: eventEntry.processingStart - eventEntry.startTime,
              };
              setMetrics(prev => ({ ...prev, ...fidMetric }));
              onMetricsUpdate?.(fidMetric);

              if (reportToConsole) {
                console.log(
                  '⚡ FID:',
                  (eventEntry.processingStart - eventEntry.startTime).toFixed(2),
                  'ms'
                );
              }
            }
          });
        });

        fidObserver.observe({ entryTypes: ['first-input'] });

        // Measure CLS
        const clsObserver = new PerformanceObserver(entryList => {
          let clsValue = 0;
          entryList.getEntries().forEach(entry => {
            // Only count unexpected layout shifts
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          });

          if (clsValue > 0) {
            const clsMetric = { cumulativeLayoutShift: clsValue };
            setMetrics(prev => ({ ...prev, ...clsMetric }));
            onMetricsUpdate?.(clsMetric);

            if (reportToConsole) {
              console.log('📐 CLS:', clsValue.toFixed(4));
            }
          }
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] });

        return () => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
        };
      } catch (error) {
        console.warn('Performance monitoring not fully supported:', error);
      }
    }

    return () => {
      window.removeEventListener('load', measurePerformance);
    };
  }, [onMetricsUpdate, reportToConsole]);

  // Report bundle size in development
  useEffect(() => {
    if (reportToConsole && process.env.NODE_ENV === 'development') {
      // Estimate bundle size from performance entries
      const resourceEntries = performance.getEntriesByType(
        'resource'
      ) as PerformanceResourceTiming[];
      const jsEntries = resourceEntries.filter(
        entry => entry.name.includes('.js') && !entry.name.includes('node_modules')
      );

      const totalSize = jsEntries.reduce((total, entry) => {
        return total + (entry.transferSize || 0);
      }, 0);

      if (totalSize > 0) {
        console.log('📦 Estimated Bundle Size:', (totalSize / 1024).toFixed(2), 'KB');
      }
    }
  }, [reportToConsole]);

  // Don't render anything in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // Development performance display
  return (
    <div className='fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded font-mono z-50 max-w-xs'>
      <div className='font-bold mb-1'>Performance</div>
      {metrics.firstContentfulPaint && <div>FCP: {metrics.firstContentfulPaint.toFixed(0)}ms</div>}
      {metrics.largestContentfulPaint && (
        <div>LCP: {metrics.largestContentfulPaint.toFixed(0)}ms</div>
      )}
      {metrics.firstInputDelay && <div>FID: {metrics.firstInputDelay.toFixed(1)}ms</div>}
      {metrics.cumulativeLayoutShift && <div>CLS: {metrics.cumulativeLayoutShift.toFixed(3)}</div>}
    </div>
  );
};

export default PerformanceMonitor;
