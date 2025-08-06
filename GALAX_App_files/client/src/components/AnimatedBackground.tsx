/*
 * Copyright (c) 2025 GALAX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';

// Lazy load motion for better initial performance
const MotionDiv = React.lazy(() =>
  import('framer-motion').then(module => ({ default: module.motion.div }))
);

// Memoized particle component for better performance
const Particle = React.memo(
  ({ x, y, delay, duration }: { x: number; y: number; delay: number; duration: number }) => (
    <React.Suspense fallback={null}>
      <MotionDiv
        className='absolute w-1 h-1 bg-blue-400/20 rounded-full'
        initial={{ x, y, opacity: 0 }}
        animate={{
          x: [x, x + 100, x - 50, x],
          y: [y, y - 100, y + 50, y],
          opacity: [0, 0.6, 0.3, 0],
        }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </React.Suspense>
  )
);

Particle.displayName = 'Particle';

// Performance-optimized animated background
export const AnimatedBackground = React.memo(() => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isReduced, setIsReduced] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReduced(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsReduced(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();

    // Throttle resize events for better performance
    let timeoutId: NodeJS.Timeout;
    const throttledUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDimensions, 100);
    };

    window.addEventListener('resize', throttledUpdate);
    return () => {
      window.removeEventListener('resize', throttledUpdate);
      clearTimeout(timeoutId);
    };
  }, []);

  // Memoize particles generation for better performance
  const particles = useMemo(() => {
    if (isReduced || dimensions.width === 0) return [];

    // Reduce particle count on smaller screens for better performance
    const particleCount = dimensions.width < 768 ? 8 : 15;

    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * dimensions.width,
      y: Math.random() * dimensions.height,
      delay: Math.random() * 5,
      duration: 10 + Math.random() * 10,
    }));
  }, [dimensions.width, dimensions.height, isReduced]);

  // Don't render if user prefers reduced motion
  if (isReduced) {
    return (
      <div className='fixed inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/30 to-green-50/30 pointer-events-none -z-10' />
    );
  }

  return (
    <div className='fixed inset-0 pointer-events-none overflow-hidden -z-10'>
      {/* Gradient Background */}
      <div className='absolute inset-0 bg-gradient-to-br from-purple-50/50 via-blue-50/50 to-pink-50/50' />

      {/* Animated Particles */}
      {particles.map(particle => (
        <Particle
          key={particle.id}
          x={particle.x}
          y={particle.y}
          delay={particle.delay}
          duration={particle.duration}
        />
      ))}
    </div>
  );
});

AnimatedBackground.displayName = 'AnimatedBackground';
