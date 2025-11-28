/*
 * Copyright © 2025 GLX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 * "GLX" and related concepts are inspired by Gatchaman Crowds © Tatsunoko Production.
 * This project is unaffiliated with Tatsunoko Production or the original anime.
 */


/*
 * Vercel Serverless Function Entry Point
 * Routes all API requests to the Express server
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Get allowed CORS origin for the current request
 * Uses the same configuration system as the main server
 */
function getAllowedCorsOrigin(requestOrigin?: string): string {
  // If no origin in request, handle based on environment
  if (!requestOrigin) {
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
    const isTest = process.env.NODE_ENV === 'test';
    
    // Allow in development/test, block in production (unless explicitly allowed)
    if (isDevelopment || isTest || process.env.ALLOW_NO_ORIGIN_IN_PRODUCTION === 'true') {
      return '*';
    } else {
      return ''; // Will cause CORS to be blocked
    }
  }

  // Get configured origins
  const allowedOrigins: string[] = [];

  // Primary configurable CORS origins
  if (process.env.CORS_ALLOWED_ORIGINS) {
    allowedOrigins.push(...process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()));
  }

  // Environment-specific origins
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  if (isDevelopment && process.env.CORS_DEVELOPMENT_ORIGINS) {
    allowedOrigins.push(...process.env.CORS_DEVELOPMENT_ORIGINS.split(',').map(o => o.trim()));
  }
  if (isProduction && process.env.CORS_PRODUCTION_ORIGINS) {
    allowedOrigins.push(...process.env.CORS_PRODUCTION_ORIGINS.split(',').map(o => o.trim()));
  }
  if (isTest && process.env.CORS_TEST_ORIGINS) {
    allowedOrigins.push(...process.env.CORS_TEST_ORIGINS.split(',').map(o => o.trim()));
  }

  // Legacy environment variables
  [
    process.env.CLIENT_ORIGIN,
    process.env.FRONTEND_URL,
    process.env.PRODUCTION_FRONTEND_URL,
    process.env.STAGING_FRONTEND_URL,
  ].forEach(origin => {
    if (origin) allowedOrigins.push(origin);
  });

  if (process.env.TRUSTED_ORIGINS) {
    allowedOrigins.push(...process.env.TRUSTED_ORIGINS.split(',').map(o => o.trim()));
  }

  // Check if request origin is allowed
  const uniqueOrigins = [...new Set(allowedOrigins.filter(Boolean))];
  
  if (uniqueOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Check pattern matching for dynamic deployment URLs
  if (isProduction || isTest) {
    const customPatterns = process.env.CORS_PATTERN_DOMAINS 
      ? process.env.CORS_PATTERN_DOMAINS.split(',').map(domain => {
          const escaped = domain.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`^https://${escaped}-.*\\.vercel\\.app$`);
        })
      : [
          // Default patterns
          /^https:\/\/glx-civic-networking-.*\.vercel\.app$/,
          /^https:\/\/glx-.*\.vercel\.app$/,
          /^https:\/\/.*glx.*\.vercel\.app$/,
        ];

    if (customPatterns.some(pattern => pattern.test(requestOrigin))) {
      return requestOrigin;
    }
  }

  // Fallback behavior based on environment
  if (isDevelopment || isTest) {
    // In development/test, be more permissive
    return requestOrigin;
  }

  return ''; // Block the request
}

// We need to import and configure the Express app for serverless
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get the appropriate CORS origin for this request
  const allowedOrigin = getAllowedCorsOrigin(req.headers.origin as string);
  
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Dynamically import the Express app
    // @ts-expect-error - Dynamic import resolved at runtime after build
    const { createExpressApp } = await import('../GLX_App_files/dist/server/index.js');
    const app = createExpressApp();
    
    // Convert Vercel request to Express-compatible format
    const expressReq = req as any;
    const expressRes = res as any;
    
    // Let Express handle the request
    app(expressReq, expressRes);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        message: 'Internal server error',
        statusCode: 500 
      } 
    });
  }
}