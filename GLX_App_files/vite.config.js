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

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import compression from 'vite-plugin-compression';

export const vitePort = 3000;

// Asset inline limit - 4KB for production builds
const ASSET_INLINE_LIMIT_BYTES = 4096;

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const isDevelopment = mode === 'development';

  return {
    plugins: [
      react(),
      // Enable compression only for production builds
      ...(isProduction
        ? [
            compression({
              algorithm: 'gzip',
              threshold: 10240,
              deleteOriginFile: false,
            }),
            compression({
              algorithm: 'brotliCompress',
              ext: '.br',
              threshold: 10240,
              deleteOriginFile: false,
            }),
          ]
        : []),
      // Custom plugin to handle source map requests
      {
        name: 'handle-source-map-requests',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Check if the request is for a source map file
            if (req.url && req.url.endsWith('.map')) {
              // Rewrite the URL to remove the query string that's causing the issue
              const cleanUrl = req.url.split('?')[0];
              req.url = cleanUrl;
            }
            next();
          });
        },
      },
      // Custom plugin to add CORS headers
      {
        name: 'add-cors-headers',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Add CORS headers to all responses
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.setHeader(
              'Access-Control-Allow-Headers',
              'Content-Type, Authorization, X-Requested-With'
            );

            // Handle OPTIONS requests
            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              return res.end();
            }

            next();
          });
        },
      },
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './client/src'),
      },
    },
    root: path.join(process.cwd(), 'client'),
    build: {
      outDir: path.join(process.cwd(), 'dist/public'),
      emptyOutDir: true,
      minify: isProduction ? 'esbuild' : false, // Enable minification
      target: 'es2020', // Modern target for better optimization
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: [
              '@radix-ui/react-avatar',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-dialog',
              '@radix-ui/react-label',
              '@radix-ui/react-popover',
              '@radix-ui/react-progress',
              '@radix-ui/react-select',
              '@radix-ui/react-slider',
              '@radix-ui/react-slot',
              '@radix-ui/react-switch',
              '@radix-ui/react-toggle',
              '@radix-ui/react-tooltip',
            ],
            icons: ['lucide-react'], // Separate icons chunk
            maps: ['@googlemaps/js-api-loader', 'leaflet'],
            animation: ['framer-motion'],
            analytics: ['@vercel/analytics', '@vercel/speed-insights'], // Vercel monitoring tools
          },
        },
      },
      chunkSizeWarningLimit: 300, // Smaller chunks for better loading
      sourcemap: isProduction ? false : true, // Disable sourcemaps in production
      
      // Optimize CSS splitting
      cssCodeSplit: true,
    },
    clearScreen: false,
    server: {
      hmr: {
        overlay: false,
      },
      host: true,
      port: vitePort,
      allowedHosts: true,
      cors: true, // Enable CORS in the dev server
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    // Optimize CSS
    css: {
      devSourcemap: !isProduction,
    },
    // Optimize build with better tree-shaking and production settings
    esbuild: {
      sourcemap: !isProduction,
      drop: isProduction ? ['console', 'debugger'] : [], // Remove console logs in production
      legalComments: isProduction ? 'none' : 'eof', // Remove legal comments in production
      minifyIdentifiers: isProduction,
      minifySyntax: isProduction,
      minifyWhitespace: isProduction,
    },
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom', // Pre-bundle router since it's critical
      ],
      exclude: [
        '@googlemaps/js-api-loader', // Lazy load maps
        '@vercel/analytics', // Lazy load analytics
        '@vercel/speed-insights', // Lazy load speed insights
        'framer-motion', // Load on demand for animations
      ],
    },
  };
});
