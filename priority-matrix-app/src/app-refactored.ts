/**
 * GLX Systems Network Monitoring Platform
 * Production-Ready Application with Real Database Integration
 *
 * Copyright (c) 2025 rsl37
 * Dual-licensed under PolyForm Shield 1.0.0 OR PolyForm Noncommercial 1.0.0
 */

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import hpp from 'hpp';
import { config } from './config';
import { log } from './utils/logger';
import { db } from './database/connection';
import { redis } from './database/redis';
import { blockchain } from './blockchain/Blockchain';
import { pqc } from './crypto/pqc';
import { authenticate, optionalAuthenticate, authorize } from './middleware/auth';
import {
  apiRateLimiter,
  authRateLimiter,
  ddosProtection,
  speedLimiter,
} from './middleware/rateLimiter';
import { securityScan, limitBodySize } from './middleware/validation';
import { monitoringService } from './services/monitoring';

const app = express();
const PORT = config.app.port;

// Trust proxy (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    if (config.security.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      log.security('CORS blocked request from unauthorized origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Compression
app.use(compression());

// HTTP Parameter Pollution protection
app.use(hpp());

// DDoS protection
app.use(ddosProtection.middleware());

// Security scanning
app.use(securityScan);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    log.request(req, res, duration);

    // Record performance metric
    monitoringService.recordMetric(
      'api_response_time',
      'api',
      duration,
      'ms',
      { method: req.method, path: req.path, status: res.statusCode }
    ).catch(() => { /* ignore */ });
  });

  next();
});

// Health check endpoint (no auth required)
app.get('/health', async (req: Request, res: Response) => {
  try {
    const [dbHealthy, redisHealthy] = await Promise.all([
      db.testConnection(),
      redis.testConnection(),
    ]);

    const healthy = dbHealthy && redisHealthy;
    const status = healthy ? 200 : 503;

    res.status(status).json({
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'GLX Systems Network Monitoring Platform',
      components: {
        database: dbHealthy ? 'operational' : 'degraded',
        redis: redisHealthy ? 'operational' : 'degraded',
        blockchain: config.blockchain.enabled ? 'operational' : 'disabled',
      },
    });
  } catch (error: any) {
    log.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Main dashboard (public)
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head>
        <title>GLX Systems Network Monitoring Platform</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 20px;
            background: #0f172a;
            color: #e2e8f0;
          }
          .container { max-width: 1200px; margin: 0 auto; }
          h1 { color: #60a5fa; margin-bottom: 10px; }
          .subtitle { color: #94a3b8; margin-bottom: 40px; }
          .card {
            background: #1e293b;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            border: 1px solid #334155;
          }
          .card h2 { color: #60a5fa; margin-top: 0; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 4px; }
          .status.operational { background: #10b98150; color: #10b981; }
          .link-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
          }
          a {
            display: block;
            padding: 15px;
            background: #1e293b;
            color: #60a5fa;
            text-decoration: none;
            border-radius: 8px;
            border: 1px solid #334155;
            transition: all 0.2s;
          }
          a:hover {
            background: #334155;
            border-color: #60a5fa;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🌐 GLX Systems Network Monitoring Platform</h1>
          <p class="subtitle">Real-time monitoring with blockchain security and post-quantum cryptography</p>

          <div class="card">
            <h2>System Status</h2>
            <p><span class="status operational">● Operational</span></p>
            <ul>
              <li>Blockchain: Enabled with ${config.blockchain.difficulty} difficulty</li>
              <li>Post-Quantum Crypto: Hybrid RSA-4096 (ML-KEM ready)</li>
              <li>Database: PostgreSQL with connection pooling</li>
              <li>Cache: Redis with session management</li>
            </ul>
          </div>

          <div class="card">
            <h2>🔗 API Endpoints</h2>
            <div class="link-grid">
              <a href="/health">Health Check</a>
              <a href="/api/v1/status">System Status (Auth Required)</a>
              <a href="/api/v1/blockchain/stats">Blockchain Stats</a>
              <a href="https://github.com/rsl37/GLX_Systems_Network">Documentation</a>
            </div>
          </div>

          <div class="card">
            <h2>🔒 Security Features</h2>
            <ul>
              <li><strong>Blockchain:</strong> Proof-of-Work with Merkle trees</li>
              <li><strong>Cryptography:</strong> Post-quantum ready (RSA-4096, future ML-KEM/ML-DSA)</li>
              <li><strong>Authentication:</strong> JWT with token blacklisting</li>
              <li><strong>Rate Limiting:</strong> Per-user and per-IP protection</li>
              <li><strong>DDoS Protection:</strong> Automatic IP blocking</li>
              <li><strong>Input Validation:</strong> SQL/command injection detection</li>
            </ul>
          </div>

          <p style="text-align: center; color: #64748b; margin-top: 40px;">
            Built with production-grade security and scalability<br>
            <small>PostgreSQL | Redis | Blockchain | Post-Quantum Crypto</small>
          </p>
        </div>
      </body>
    </html>
  `);
});

// Apply rate limiting to API routes
app.use('/api/', apiRateLimiter);
app.use('/api/', speedLimiter);

// API status endpoint (requires authentication)
app.get('/api/v1/status', authenticate, async (req: Request, res: Response) => {
  try {
    const status = await monitoringService.getSystemStatus();
    res.json(status);
  } catch (error: any) {
    log.error('Failed to get system status', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve system status' });
  }
});

// Blockchain statistics (public)
app.get('/api/v1/blockchain/stats', async (req: Request, res: Response) => {
  try {
    const stats = await blockchain.getStats();
    res.json(stats);
  } catch (error: any) {
    log.error('Failed to get blockchain stats', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve blockchain statistics' });
  }
});

// Supply Chain endpoints (requires authentication)
app.get('/api/v1/supply-chain', authenticate, async (req: Request, res: Response) => {
  try {
    const metrics = await monitoringService.getSupplyChainMetrics();
    res.json({
      module: 'supply-chain',
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    log.error('Failed to get supply chain data', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve supply chain data' });
  }
});

// ATC endpoints (requires authentication + admin role)
app.get('/api/v1/atc', authenticate, authorize('admin', 'operator'), async (req: Request, res: Response) => {
  try {
    const metrics = await monitoringService.getATCMetrics();
    res.json({
      module: 'air-traffic-control',
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    log.error('Failed to get ATC data', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve ATC data' });
  }
});

// Logistics endpoints (requires authentication)
app.get('/api/v1/logistics', authenticate, async (req: Request, res: Response) => {
  try {
    const metrics = await monitoringService.getLogisticsMetrics();
    res.json({
      module: 'logistics',
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    log.error('Failed to get logistics data', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve logistics data' });
  }
});

// Analytics endpoint (requires authentication)
app.get('/api/v1/analytics', authenticate, async (req: Request, res: Response) => {
  try {
    const performance = await monitoringService.getPerformanceMetrics();
    res.json({
      period: 'real-time',
      performance,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    log.error('Failed to get analytics data', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve analytics data' });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  log.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
  });

  res.status(500).json({
    error: config.app.env === 'production' ? 'Internal server error' : err.message,
  });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  log.info('Shutting down gracefully...');

  try {
    await Promise.all([
      db.close(),
      redis.close(),
    ]);

    log.info('All connections closed');
    process.exit(0);
  } catch (error: any) {
    log.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
async function startServer() {
  try {
    // Test connections
    log.info('Testing database connection...');
    const dbHealthy = await db.testConnection();
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }

    log.info('Testing Redis connection...');
    const redisHealthy = await redis.testConnection();
    if (!redisHealthy) {
      throw new Error('Redis connection failed');
    }

    // Initialize blockchain
    if (config.blockchain.enabled) {
      log.info('Initializing blockchain...');
      await blockchain.initialize();
    }

    // Start HTTP server
    app.listen(PORT, () => {
      log.info('Server started successfully', {
        port: PORT,
        env: config.app.env,
        blockchain: config.blockchain.enabled,
        pqc: config.pqc.enabled,
      });

      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║   GLX Systems Network Monitoring Platform                ║');
      console.log('╠═══════════════════════════════════════════════════════════╣');
      console.log(`║   Server:          http://localhost:${PORT}                    ║`);
      console.log('║   Blockchain:      Enabled                                ║');
      console.log('║   Post-Quantum:    Hybrid RSA-4096 (ML-KEM ready)        ║');
      console.log('║   Database:        PostgreSQL                             ║');
      console.log('║   Cache:           Redis                                  ║');
      console.log('╚═══════════════════════════════════════════════════════════╝');
    });
  } catch (error: any) {
    log.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  startServer();
}

export default app;
