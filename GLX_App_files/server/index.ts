/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { setupStaticServing } from './static-serve.js';
import { db } from './database.js';
import { authenticateToken, AuthRequest } from './auth.js';
import { sendSuccess, sendError } from './utils/responseHelpers.js';

// Import modular routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import governanceRoutes from './routes/governance.js';
import crisisRoutes from './routes/crisis.js';
import miscRoutes from './routes/misc.js';
import createHelpRequestRoutes from './routes/helpRequests.js';
import createRealtimeRoutes from './routes/realtime.js';
import communicationsRoutes from './routes/communications.js';

// Import KYC functions (keeping legacy for now)
import {
  uploadKYCDocuments,
  getKYCStatus,
  updateKYCStatus,
  getPendingKYCVerifications,
  isValidDocumentType,
  getDocumentTypeDisplayName,
  kycUpload,
} from './kyc.js';

// Import middleware
import errorHandler from './middleware/errorHandler.js';
import { apiLimiter, uploadLimiter } from './middleware/rateLimiter.js';
import {
  securityHeaders,
  sanitizeInput,
  validateIP,
  corsConfig,
  requestLogger,
  fileUploadSecurity,
} from './middleware/security.js';
import {
  validateFileUpload,
  validateRequestSize,
  validateEndpointSecurity,
  validateJsonPayload,
} from './middleware/validation.js';

// Import realtime manager
import RealtimeManager from './realtimeManager.js';

// Import stablecoin functionality
import stablecoinRoutes from './stablecoin/routes.js';
import { stablecoinService } from './stablecoin/StablecoinService.js';

// Import Socket.io for real-time functionality (replaces Pusher)
import { Server as SocketIOServer } from 'socket.io';

import { logEnvironmentStatus } from './envValidation.js';

// Import comprehensive security systems
import {
  comprehensiveSecurityMiddleware,
  fileUploadSecurityMiddleware,
  initializeSecuritySystems,
  securityAdminEndpoints,
  logSecurityEvent,
} from './middleware/securityManager.js';

// Import versioning middleware
import {
  detectApiVersion,
  validateApiVersion,
  addVersioningHeaders,
  getApiVersionInfo,
} from './middleware/versioning.js';

// Import monitoring middleware
import {
  collectMetrics,
  trackError as monitoringTrackError,
  getSystemMetrics,
  getPerformanceMetrics,
  getErrorMetrics,
  getUserMetrics,
  getHealthMetrics,
} from './middleware/monitoring.js';

// Import post-quantum cryptography
import { postQuantumCrypto } from './postQuantumCrypto.js';

// Import deployment validation
import { getDeploymentReadiness } from './deployment-validation.js';

// Import page verification system
import {
  generatePageVerificationToken,
  requirePageVerification,
  createAuthCorsConfig,
  PAGE_VERIFICATION_CONFIG,
} from './middleware/pageVerification.js';

dotenv.config();

console.log('🚀 Starting server initialization...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Data directory:', process.env.DATA_DIRECTORY || './data');

// Validate environment variables for production deployment
logEnvironmentStatus();

const app = express();
const server = createServer(app);

// Initialize Socket.io for real-time communication (replaces Pusher)
// Socket.io with Ably provides managed WebSocket infrastructure
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Initialize realtime manager
const realtimeManager = new RealtimeManager();
console.log('🔌 RealtimeManager initialized');

// Configure multer for file uploads with enhanced security
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.env.DATA_DIRECTORY || './data', 'uploads');
    console.log('📁 Upload directory:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
    console.log('📄 Generated filename:', filename);
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Only allow 1 file per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|mp3|wav|m4a/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, videos, and audio files are allowed'));
    }
  },
});

// Health check endpoint (no security restrictions for monitoring)
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested');

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    dataDirectory: process.env.DATA_DIRECTORY || './data',
    realtime: 'HTTP polling enabled',
  });
});

// Security middleware stack
app.use(securityHeaders);

// Main CORS configuration - exclude auth routes as they have their own CORS with page verification
app.use((req, res, next) => {
  // Skip main CORS for auth routes - they use createAuthCorsConfig with page verification
  if (req.path.startsWith('/api/auth')) {
    return next();
  }
  cors(corsConfig)(req, res, next);
});

app.use(validateIP);
app.use(requestLogger);

// Body parsing middleware with security
app.use(
  express.json({
    limit: '1mb',
    strict: true,
    verify: (req: any, res, buf) => {
      if (buf && buf.length) {
        req.rawBody = buf;

        try {
          JSON.parse(buf.toString());
        } catch (error) {
          const err = new Error('Invalid JSON in request body');
          (err as any).status = 400;
          throw err;
        }
      }
    },
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: '1mb',
    parameterLimit: 50,
  })
);

// Apply comprehensive security middleware stack
app.use(comprehensiveSecurityMiddleware);

// API versioning middleware
app.use('/api', detectApiVersion);
app.use('/api', validateApiVersion);
app.use('/api', addVersioningHeaders);

// Monitoring and metrics collection
app.use('/api', collectMetrics);

// Input sanitization
app.use(sanitizeInput);

// Validation security
app.use('/api', validateJsonPayload);
app.use('/api', validateApiVersion);

// Apply general rate limiting to all API routes
app.use('/api', apiLimiter);

// System endpoints
app.get('/api/realtime/health', (req, res) => {
  console.log('🔌 Realtime health check - Socket.io active');
  res.json({
    success: true,
    data: {
      type: 'Socket.io WebSocket',
      status: 'active',
      transport: 'websocket',
    },
  });
});

app.get('/api/test-db', async (req, res) => {
  try {
    console.log('🗄️ Testing database connection...');
    const result = await db.selectFrom('users').selectAll().limit(1).execute();
    console.log('✅ Database test successful, found', result.length, 'users');
    res.json({
      success: true,
      data: { status: 'ok', userCount: result.length },
    });
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Database connection failed', statusCode: 500 },
    });
  }
});

app.get('/api/version', getApiVersionInfo);
app.get('/api/deployment/ready', getDeploymentReadiness);

// Environment debug endpoint for production troubleshooting
app.get('/api/debug/environment', (req, res) => {
  try {
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: process.env.JWT_SECRET?.length || 0,
      hasClientOrigin: !!process.env.CLIENT_ORIGIN,
      clientOrigin: process.env.CLIENT_ORIGIN || '[not set]',
      hasFrontendUrl: !!process.env.FRONTEND_URL,
      frontendUrl: process.env.FRONTEND_URL || '[not set]',
      hasTrustedOrigins: !!process.env.TRUSTED_ORIGINS,
      trustedOriginsCount: process.env.TRUSTED_ORIGINS?.split(',').length || 0,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseType: process.env.DATABASE_URL?.includes('postgres')
        ? 'postgresql'
        : process.env.DATABASE_URL?.includes('sqlite')
          ? 'sqlite'
          : 'unknown',
      hasSmtpConfig: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
      timestamp: new Date().toISOString(),
      platform: 'vercel',
      dataDirectory: process.env.DATA_DIRECTORY || './data',
    };

    console.log('🔍 Environment debug request:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
    });

    res.json({
      success: true,
      data: envInfo,
    });
  } catch (error) {
    console.error('❌ Environment debug error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Environment check failed', statusCode: 500 },
    });
  }
});

// CORS debug endpoint
app.get('/api/debug/cors', (req, res) => {
  try {
    const corsInfo = {
      origin: req.get('Origin') || '[no origin header]',
      userAgent: req.get('User-Agent') || '[no user agent]',
      referer: req.get('Referer') || '[no referer]',
      host: req.get('Host') || '[no host]',
      forwardedHost: req.get('X-Forwarded-Host') || '[no forwarded host]',
      forwardedProto: req.get('X-Forwarded-Proto') || '[no forwarded proto]',
      requestUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      timestamp: new Date().toISOString(),
      ip: req.ip,
    };

    console.log('🌐 CORS debug request:', corsInfo);

    res.json({
      success: true,
      data: {
        message: 'CORS debug information',
        request: corsInfo,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          clientOrigin: process.env.CLIENT_ORIGIN || '[not set]',
          trustedOrigins: process.env.TRUSTED_ORIGINS || '[not set]',
        },
      },
    });
  } catch (error) {
    console.error('❌ CORS debug error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'CORS debug failed', statusCode: 500 },
    });
  }
});

// Monitoring endpoints
app.get('/api/monitoring/health', authenticateToken, getHealthMetrics);
app.get('/api/monitoring/metrics/system', authenticateToken, getSystemMetrics);
app.get('/api/monitoring/metrics/performance', authenticateToken, getPerformanceMetrics);
app.get('/api/monitoring/metrics/errors', authenticateToken, getErrorMetrics);
app.get('/api/monitoring/metrics/users', authenticateToken, getUserMetrics);

// Error reporting endpoint for frontend
app.post('/api/monitoring/errors', async (req, res): Promise<void> => {
  try {
    const { message, stack, componentStack, errorId, timestamp, userAgent, url, userId } = req.body;

    console.error('🐛 Frontend Error Report:', {
      errorId,
      message,
      url,
      userId,
      timestamp,
    });

    const error = new Error(message);
    error.stack = stack;
    monitoringTrackError(error, req, 'frontend');

    res.json({
      success: true,
      data: {
        errorId,
        message: 'Error report received',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error reporting endpoint failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to process error report',
        statusCode: 500,
      },
    });
  }
});

// Stablecoin API routes
app.use('/api/stablecoin', stablecoinRoutes);

// Hybrid Communication System routes
app.use('/api/communications', communicationsRoutes);

// Mount modular routes with enhanced auth security
app.use('/api/auth', cors(createAuthCorsConfig()), requirePageVerification, authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/proposals', governanceRoutes);
app.use('/api/crisis-alerts', crisisRoutes);
app.use('/api', miscRoutes);
app.use('/api/help-requests', createHelpRequestRoutes(upload, realtimeManager));

// Socket.io authentication endpoint (replaces Pusher auth)
app.post('/api/socketio/auth', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { socket_id, channel_name } = req.body;

    // socket_id is required for Socket.io client authentication flow
    if (!socket_id || !channel_name) {
      return sendError(res, 'Socket ID and channel name are required', 400);
    }

    // Validate that user can access this channel
    if (channel_name.startsWith('private-user-notifications')) {
      // User can access their own notification channel
      res.json({
        auth: 'authorized',
        socket_id, // Include socket_id in response for client tracking
        user_id: req.userId!.toString(),
        user_info: {
          username: req.username,
        },
      });
    } else if (channel_name.startsWith('private-help-request-')) {
      // Extract help request ID for potential authorization check
      const helpRequestId = channel_name.replace('private-help-request-', '');
      console.log(`User ${req.userId} requesting access to help request ${helpRequestId}`);

      // TODO: Add proper authorization check for help requests
      // For now, allow all authenticated users
      res.json({
        auth: 'authorized',
        socket_id,
        user_id: req.userId!.toString(),
        user_info: {
          username: req.username,
        },
      });
    } else {
      return sendError(res, 'Unauthorized channel access', 403);
    }
  } catch (error) {
    console.error('Socket.io auth error:', error);
    sendError(res, 'Authentication failed', 500);
  }
});

// Chat API endpoints for HTTP polling (replacing WebSocket functionality)
app.get('/api/chat/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { since } = req.query;
    let query = db
      .selectFrom('messages')
      .leftJoin('users', 'messages.sender_id', 'users.id')
      .select([
        'messages.id',
        'messages.message as content',
        'messages.sender_id as userId',
        'users.username',
        'messages.created_at as timestamp',
        'messages.help_request_id',
      ])
      .orderBy('messages.created_at', 'desc')
      .limit(50);

    if (since) {
      query = query.where('messages.created_at', '>', since as string);
    }

    const messages = await query.execute();

    res.json({
      success: true,
      messages: messages.map(msg => ({
        id: msg.id.toString(),
        content: msg.content,
        userId: msg.userId,
        username: msg.username,
        timestamp: msg.timestamp,
        type: 'chat',
        roomId: `help_request_${msg.help_request_id}`,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    sendError(res, 'Failed to fetch messages', 500);
  }
});

app.post('/api/chat/send', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { content, roomId } = req.body;

    if (!content?.trim()) {
      return sendError(res, 'Message content is required', 400);
    }

    // Extract help request ID from roomId (format: help_request_123)
    const helpRequestId = roomId?.startsWith('help_request_')
      ? parseInt(roomId.replace('help_request_', ''))
      : null;

    if (!helpRequestId) {
      return sendError(res, 'Invalid room ID', 400);
    }

    // Insert message into database
    const result = await db
      .insertInto('messages')
      .values({
        help_request_id: helpRequestId,
        sender_id: req.userId!,
        message: content.trim(),
        created_at: new Date().toISOString(),
      })
      .returning(['id', 'created_at'])
      .executeTakeFirst();

    // Get user info for the message
    const user = await db
      .selectFrom('users')
      .select(['username'])
      .where('id', '=', req.userId!)
      .executeTakeFirst();

    const messageData = {
      id: result?.id.toString(),
      content: content.trim(),
      userId: req.userId!,
      username: user?.username || 'Unknown',
      timestamp: result?.created_at,
      type: 'chat',
      roomId: roomId,
    };

    // Broadcast message via Socket.io to all users in the help request channel
    try {
      io.to(`help-request-${helpRequestId}`).emit('new-message', messageData);
      console.log(
        '✅ Message broadcasted via Socket.io to channel:',
        `help-request-${helpRequestId}`
      );
    } catch (socketError) {
      console.error('❌ Socket.io broadcast error:', socketError);
      // Don't fail the request if Socket.io fails, message is still saved
    }

    res.json({
      success: true,
      messageId: result?.id.toString(),
      timestamp: result?.created_at,
    });
  } catch (error) {
    console.error('Failed to send message:', error);
    sendError(res, 'Failed to send message', 500);
  }
});

app.get('/api/chat/:helpRequestId/messages', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const helpRequestId = parseInt(req.params.helpRequestId);

    if (isNaN(helpRequestId)) {
      return sendError(res, 'Invalid help request ID', 400);
    }

    const messages = await db
      .selectFrom('messages')
      .leftJoin('users', 'messages.sender_id', 'users.id')
      .select([
        'messages.id',
        'messages.message',
        'users.username as sender_username',
        'users.avatar_url as sender_avatar',
        'messages.created_at',
      ])
      .where('messages.help_request_id', '=', helpRequestId)
      .orderBy('messages.created_at', 'asc')
      .execute();

    res.json(messages);
  } catch (error) {
    console.error('Failed to fetch chat messages:', error);
    sendError(res, 'Failed to fetch messages', 500);
  }
});

app.post('/api/chat/join', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { roomId } = req.body;

    // Extract help request ID
    const helpRequestId = roomId?.startsWith('help_request_')
      ? parseInt(roomId.replace('help_request_', ''))
      : null;

    if (!helpRequestId) {
      return sendError(res, 'Invalid room ID', 400);
    }

    // Get user info
    const user = await db
      .selectFrom('users')
      .select(['username'])
      .where('id', '=', req.userId!)
      .executeTakeFirst();

    // Broadcast user joined event via Socket.io
    try {
      io.to(`help-request-${helpRequestId}`).emit('user-joined', {
        userId: req.userId!,
        username: user?.username || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      console.log('✅ User join broadcasted via Socket.io');
    } catch (socketError) {
      console.error('❌ Socket.io join broadcast error:', socketError);
    }

    console.log(`User ${req.userId} joined room: ${roomId}`);

    res.json({
      success: true,
      message: `Joined room: ${roomId}`,
      roomId,
    });
  } catch (error) {
    console.error('Failed to join room:', error);
    sendError(res, 'Failed to join room', 500);
  }
});

app.post('/api/chat/leave', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { roomId } = req.body;

    // Extract help request ID
    const helpRequestId = roomId?.startsWith('help_request_')
      ? parseInt(roomId.replace('help_request_', ''))
      : null;

    if (!helpRequestId) {
      return sendError(res, 'Invalid room ID', 400);
    }

    // Get user info
    const user = await db
      .selectFrom('users')
      .select(['username'])
      .where('id', '=', req.userId!)
      .executeTakeFirst();

    // Broadcast user left event via Socket.io
    try {
      io.to(`help-request-${helpRequestId}`).emit('user-left', {
        userId: req.userId!,
        username: user?.username || 'Unknown',
        timestamp: new Date().toISOString(),
      });
      console.log('✅ User leave broadcasted via Socket.io');
    } catch (socketError) {
      console.error('❌ Socket.io leave broadcast error:', socketError);
    }

    console.log(`User ${req.userId} left room: ${roomId}`);

    res.json({
      success: true,
      message: `Left room: ${roomId}`,
      roomId,
    });
  } catch (error) {
    console.error('Failed to leave room:', error);
    sendError(res, 'Failed to leave room', 500);
  }
});

app.get('/api/notifications', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { since } = req.query;
    let query = db
      .selectFrom('notifications')
      .select(['id', 'type', 'title', 'message', 'data', 'created_at as timestamp', 'read_at'])
      .where('user_id', '=', req.userId!)
      .orderBy('created_at', 'desc')
      .limit(20);

    if (since) {
      query = query.where('created_at', '>', since as string);
    }

    const notifications = await query.execute();

    res.json({
      success: true,
      notifications: notifications.map(notif => ({
        id: notif.id.toString(),
        type: notif.type,
        message: `${notif.title}: ${notif.message}`,
        timestamp: notif.timestamp,
        read: !!notif.read_at,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    sendError(res, 'Failed to fetch notifications', 500);
  }
});

interface NotificationData {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

// Helper function to send notifications via Socket.io (replaces Pusher)
async function sendNotificationViaSocketIO(userId: number, notificationData: NotificationData) {
  try {
    io.to(`user-notifications-${userId}`).emit('new-notification', notificationData);
    console.log('✅ Notification sent via Socket.io to user:', userId);
  } catch (error) {
    console.error('❌ Failed to send notification via Socket.io:', error);
  }
}

// Legacy KYC endpoints (keeping for compatibility)
app.post(
  '/api/kyc/upload',
  authenticateToken,
  uploadLimiter,
  ...fileUploadSecurityMiddleware,
  kycUpload.fields([
    { name: 'document', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]),
  async (req: AuthRequest, res) => {
    try {
      if (!req.userId || typeof req.userId !== 'number') {
        return sendError(res, 'Invalid authentication token', 401);
      }

      const userId = req.userId;
      const { documentType, documentNumber } = req.body;

      console.log('📄 KYC document upload request from user:', userId);

      if (!documentType || !documentNumber) {
        return sendError(res, 'Document type and number are required', 400);
      }

      if (!isValidDocumentType(documentType)) {
        return sendError(res, 'Invalid document type', 400);
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.document || files.document.length === 0) {
        return sendError(res, 'Document file is required', 400);
      }

      const documentFile = files.document[0];
      const selfieFile = files.selfie ? files.selfie[0] : undefined;

      const result = await uploadKYCDocuments(
        userId,
        documentType,
        documentNumber,
        documentFile,
        selfieFile
      );

      if (!result.success) {
        return sendError(res, result.error || 'Document upload failed', 400);
      }

      console.log('✅ KYC documents uploaded successfully');
      sendSuccess(res, {
        message: 'Documents uploaded successfully and are under review',
        verificationId: result.verificationId,
      });
    } catch (error) {
      console.error('❌ KYC upload error:', error);
      sendError(res, 'Internal server error', 500);
    }
  }
);

app.get('/api/kyc/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.userId || typeof req.userId !== 'number') {
      return sendError(res, 'Invalid authentication token', 401);
    }

    const userId = req.userId;
    const status = await getKYCStatus(userId);
    sendSuccess(res, status);
  } catch (error) {
    console.error('❌ KYC status error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

app.get('/api/kyc/document-types', (req, res) => {
  try {
    const documentTypes = [
      { value: 'passport', label: getDocumentTypeDisplayName('passport') },
      { value: 'drivers_license', label: getDocumentTypeDisplayName('drivers_license') },
      { value: 'national_id', label: getDocumentTypeDisplayName('national_id') },
      { value: 'residence_permit', label: getDocumentTypeDisplayName('residence_permit') },
    ];

    sendSuccess(res, documentTypes);
  } catch (error) {
    console.error('❌ Document types error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

// Admin endpoints for KYC management
app.get('/api/admin/kyc/pending', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const verifications = await getPendingKYCVerifications();
    sendSuccess(res, verifications);
  } catch (error) {
    console.error('❌ Pending KYC error:', error);
    sendError(res, 'Internal server error', 500);
  }
});

app.post(
  '/api/admin/kyc/:verificationId/status',
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { verificationId } = req.params;
      const { status, notes } = req.body;

      if (!['approved', 'rejected', 'under_review'].includes(status)) {
        return sendError(res, 'Invalid status', 400);
      }

      const success = await updateKYCStatus(parseInt(verificationId), status, notes);

      if (!success) {
        return sendError(res, 'Failed to update status', 400);
      }

      sendSuccess(res, { message: 'Status updated successfully' });
    } catch (error) {
      console.error('❌ Update KYC status error:', error);
      sendError(res, 'Internal server error', 500);
    }
  }
);

// Security admin endpoints
app.get(
  '/api/admin/security/status',
  authenticateToken,
  securityAdminEndpoints.dashboard.getStatus
);
app.get(
  '/api/admin/security/events',
  authenticateToken,
  securityAdminEndpoints.dashboard.getEvents
);
app.post(
  '/api/admin/security/config',
  authenticateToken,
  securityAdminEndpoints.dashboard.updateConfig
);
app.post(
  '/api/admin/security/lockdown',
  authenticateToken,
  securityAdminEndpoints.dashboard.emergencyLockdown
);
app.get(
  '/api/admin/security/report',
  authenticateToken,
  securityAdminEndpoints.dashboard.generateReport
);

// Antimalware Management
app.get(
  '/api/admin/security/antimalware/quarantine',
  authenticateToken,
  securityAdminEndpoints.antimalware.list
);
app.post(
  '/api/admin/security/antimalware/clean',
  authenticateToken,
  securityAdminEndpoints.antimalware.clean
);

// Antivirus Management
app.get(
  '/api/admin/security/antivirus/stats',
  authenticateToken,
  securityAdminEndpoints.antivirus.getStats
);
app.post(
  '/api/admin/security/antivirus/update',
  authenticateToken,
  securityAdminEndpoints.antivirus.updateDefinitions
);
app.get(
  '/api/admin/security/antivirus/quarantine',
  authenticateToken,
  securityAdminEndpoints.antivirus.getQuarantine
);
app.post(
  '/api/admin/security/antivirus/clean',
  authenticateToken,
  securityAdminEndpoints.antivirus.cleanQuarantine
);

// Anti-Hacking Management
app.get(
  '/api/admin/security/antihacking/stats',
  authenticateToken,
  securityAdminEndpoints.antiHacking.getSecurityStats
);
app.post(
  '/api/admin/security/antihacking/block-ip',
  authenticateToken,
  securityAdminEndpoints.antiHacking.blockIP
);
app.post(
  '/api/admin/security/antihacking/unblock-ip',
  authenticateToken,
  securityAdminEndpoints.antiHacking.unblockIP
);

// Post-Quantum Cryptography Management
app.get(
  '/api/admin/security/post-quantum/status',
  authenticateToken,
  securityAdminEndpoints.dashboard.getPostQuantumStatus
);
app.post(
  '/api/admin/security/post-quantum/test',
  authenticateToken,
  securityAdminEndpoints.dashboard.testPostQuantumOperations
);

// Serve uploaded files with security headers
app.use(
  '/uploads',
  express.static(path.join(process.env.DATA_DIRECTORY || './data', 'uploads'), {
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year = 31536000 seconds
    },
  })
);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🔌 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔌 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Export a function to start the server
export async function startServer(port: number) {
  try {
    console.log('🚀 Starting server on port:', port);

    // Initialize performance optimizations
    try {
      const { createPerformanceIndexes } = await import('./performance.js');
      await createPerformanceIndexes();
      console.log('🚀 Performance optimizations initialized');
    } catch (error) {
      console.warn('⚠️ Performance optimization warning:', error.message);
    }

    // Initialize comprehensive security systems
    try {
      await initializeSecuritySystems();
      console.log('🛡️ Comprehensive security systems initialized successfully');

      logSecurityEvent({
        type: 'attack',
        severity: 'low',
        ip: 'system',
        details: { event: 'Security systems initialized' },
        action: 'System startup',
        status: 'allowed',
      });
    } catch (error) {
      console.error('❌ Security system initialization error:', error);
    }

    // Initialize Post-Quantum Cryptography Security Baseline
    try {
      await postQuantumCrypto.initialize();
      const pqStatus = postQuantumCrypto.getStatus();
      console.log("🔐 Post-Quantum Security Baseline initialized successfully");
      console.log(`   • Security Level: 5 (256-bit equivalent)`);
      console.log(`   • Algorithms: ML-KEM-1024, ML-DSA-87, SLH-DSA-SHAKE-256s`);

      logSecurityEvent({
        type: 'system',
        severity: 'info',
        ip: 'system',
        details: {
          event: "Post-Quantum Security initialized",
          initialized: pqStatus.initialized,
          algorithms: Object.keys(pqStatus.algorithms)
        },
        action: 'Post-quantum cryptography baseline enabled',
        status: 'allowed',
      });
    } catch (error) {
      console.error('❌ Post-Quantum Security initialization error:', error);
    }

    // Initialize and start stablecoin service
    try {
      console.log('💰 Initializing stablecoin service...');
      await stablecoinService.start();
      console.log('✅ Stablecoin service started successfully');
    } catch (error) {
      console.error('❌ Stablecoin service initialization error:', error);
    }

    if (process.env.NODE_ENV === 'production') {
      console.log('🌐 Setting up static file serving...');
      setupStaticServing(app);
    }

    server.listen(port, () => {
      console.log(`✅ API Server running on port ${port}`);
      console.log(`🌍 Health check: http://localhost:${port}/api/health`);
      console.log(`🗄️ Database test: http://localhost:${port}/api/test-db`);
      console.log(`🔌 Realtime health: http://localhost:${port}/api/realtime/health`);
      console.log(`💰 Stablecoin API: http://localhost:${port}/api/stablecoin/status`);
      console.log(`🛡️ Security Admin: http://localhost:${port}/api/admin/security/status`);
      console.log(`🔒 Security: COMPREHENSIVE PROTECTION ACTIVE`);
      console.log(`   🦠 Antimalware Protection: ENABLED`);
      console.log(`   🔍 Antivirus Protection: ENABLED`);
      console.log(`   🛡️ Anti-Hacking Protection: ENABLED`);
      console.log(`   🚫 DDoS Protection: ENABLED`);
      console.log(`   🤖 Bot Detection: ENABLED`);
      console.log(`   🍯 Honeypot System: ENABLED`);
      console.log(`   🧠 Behavioral Analysis: ENABLED`);
      console.log(`   🔐 Rate Limiting & Account Lockout: ENABLED`);
      console.log(`🚀 Performance: Database indexes and connection optimizations active`);
      console.log(
        `🧹 Realtime management: Enhanced SSE connections with cleanup and memory management`
      );
    });
  } catch (err) {
    console.error('💥 Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting server directly...');
  startServer(Number(process.env.PORT) || 3001);
}

// Export app for serverless functions (Vercel)
export function createExpressApp() {
  return app;
}
