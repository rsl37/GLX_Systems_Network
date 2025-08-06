/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import compression from 'vite-plugin-compression';

export const vitePort = 3000;

// Asset inline limit - 4KB for production builds
const ASSET_INLINE_LIMIT_BYTES = 4096;

// Asset inline limit - 4KB for production builds
const ASSET_INLINE_LIMIT_BYTES = 4096;

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
<<<<<<< HEAD
  const isDevelopment = mode === 'development';

<<<<<<< HEAD
=======
  const isDevelopment = !isProduction;
  
>>>>>>> origin/copilot/fix-257
=======
>>>>>>> origin/copilot/fix-470
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
<<<<<<< HEAD
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
<<<<<<< HEAD
            analytics: ['@vercel/analytics', '@vercel/speed-insights'] // Vercel monitoring tools
          }
=======
          // More granular chunk splitting for better caching and loading
          manualChunks: (id) => {
            // Vendor dependencies
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/react-router-dom')) {
              return 'vendor-router';
            }
            
            // UI library chunks - split by usage frequency
            if (id.includes('@radix-ui/react-dialog') || 
                id.includes('@radix-ui/react-popover') ||
                id.includes('@radix-ui/react-select')) {
              return 'ui-overlays'; // Heavy overlay components
            }
            if (id.includes('@radix-ui')) {
              return 'ui-core'; // Lighter UI components
            }
            
            // Feature-specific chunks for lazy loading
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('framer-motion')) {
              return 'animation';
            }
            if (id.includes('@vercel/analytics') || id.includes('@vercel/speed-insights')) {
              return 'analytics';
            }
            
            // Heavy/optional features that can be loaded separately
            if (id.includes('@googlemaps/js-api-loader') || id.includes('leaflet')) {
              return 'maps';
            }
            
            // Other vendor libraries
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
          
          // Optimize chunk naming for better caching
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId ? 
              chunkInfo.facadeModuleId.split('/').pop().replace(/\.[^/.]+$/, '') : 'chunk';
            return `assets/[name]-[hash].js`;
          },
          
          // Optimize asset naming
          assetFileNames: 'assets/[name]-[hash][extname]',
          entryFileNames: 'assets/[name]-[hash].js'
>>>>>>> origin/copilot/fix-175
        }
=======
            analytics: ['@vercel/analytics', '@vercel/speed-insights'], // Vercel monitoring tools
          },
        },
>>>>>>> origin/copilot/fix-488
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
<<<<<<< HEAD
<<<<<<< HEAD
        'react',
=======
        'react', 
>>>>>>> origin/copilot/fix-175
=======
        'react',
>>>>>>> origin/copilot/fix-470
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
