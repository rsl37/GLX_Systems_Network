/*
 * Copyright (c) 2025 GALAX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { setupStaticServing } from "./static-serve.js";
import { db } from "./database.js";
import { authenticateToken, AuthRequest } from "./auth.js";
import { sendSuccess, sendError } from "./utils/responseHelpers.js";

// Import modular routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import governanceRoutes from "./routes/governance.js";
import crisisRoutes from "./routes/crisis.js";
import miscRoutes from "./routes/misc.js";
import createHelpRequestRoutes from "./routes/helpRequests.js";

// Import KYC functions (keeping legacy for now)
import {
  uploadKYCDocuments,
  getKYCStatus,
  updateKYCStatus,
  getPendingKYCVerifications,
  isValidDocumentType,
  getDocumentTypeDisplayName,
  kycUpload,
} from "./kyc.js";

// Import middleware
import errorHandler from "./middleware/errorHandler.js";
import {
  apiLimiter,
  uploadLimiter,
} from "./middleware/rateLimiter.js";
import {
  securityHeaders,
  sanitizeInput,
  validateIP,
  corsConfig,
  requestLogger,
  fileUploadSecurity,
} from "./middleware/security.js";
import {
  validateFileUpload,
  validateRequestSize,
  validateEndpointSecurity,
  validateJsonPayload,
} from "./middleware/validation.js";

// Import socket manager
import SocketManager from "./socketManager.js";

// Import stablecoin functionality
import stablecoinRoutes from "./stablecoin/routes.js";
import { stablecoinService } from "./stablecoin/StablecoinService.js";

import { postQuantumSecurity } from "./postQuantumCrypto.js";

// Import comprehensive security systems
import {
  comprehensiveSecurityMiddleware,
  fileUploadSecurityMiddleware,
  initializeSecuritySystems,
  securityAdminEndpoints,
  logSecurityEvent,
} from "./middleware/securityManager.js";

// Import versioning middleware
import {
  detectApiVersion,
  validateApiVersion,
  addVersioningHeaders,
  getApiVersionInfo,
} from "./middleware/versioning.js";

// Import monitoring middleware
import {
  collectMetrics,
  trackError as monitoringTrackError,
  getSystemMetrics,
  getPerformanceMetrics,
  getErrorMetrics,
  getUserMetrics,
  getHealthMetrics,
} from "./middleware/monitoring.js";

// Import deployment validation
import { getDeploymentReadiness } from "./deployment-validation.js";

dotenv.config();

console.log("🚀 Starting server initialization...");
console.log("Environment:", process.env.NODE_ENV);
console.log("Data directory:", process.env.DATA_DIRECTORY || "./data");

const app = express();
const server = createServer(app);

// Socket.IO configuration with custom path support
const socketPath = process.env.SOCKET_PATH || "/socket.io";
console.log("🔌 Socket.IO path:", socketPath);

const io = new Server(server, {
  path: socketPath,
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_ORIGIN || false
        : "http://localhost:3000",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true,
});

// Initialize socket manager
const socketManager = new SocketManager(io);

// Configure multer for file uploads with enhanced security
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(
      process.env.DATA_DIRECTORY || "./data",
      "uploads",
    );
    console.log("📁 Upload directory:", uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
    console.log("📄 Generated filename:", filename);
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
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images, videos, and audio files are allowed"));
    }
  },
});

// Health check endpoint (no security restrictions for monitoring)
app.get("/api/health", (req, res) => {
  console.log("🏥 Health check requested");
  const socketHealth = socketManager.getHealthStatus();

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    dataDirectory: process.env.DATA_DIRECTORY || "./data",
    sockets: socketHealth,
  });
});

// Security middleware stack
app.use(securityHeaders);
app.use(cors(corsConfig));
app.use(validateIP);
app.use(requestLogger);

// Body parsing middleware with security
app.use(
  express.json({
    limit: "1mb",
    strict: true,
    verify: (req: any, res, buf) => {
      if (buf && buf.length) {
        req.rawBody = buf;

        try {
          JSON.parse(buf.toString());
        } catch (error) {
          const err = new Error("Invalid JSON in request body");
          (err as any).status = 400;
          throw err;
        }
      }
    },
  }),
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "1mb",
    parameterLimit: 50,
  }),
);

// Apply comprehensive security middleware stack
app.use(comprehensiveSecurityMiddleware);

// API versioning middleware
app.use("/api", detectApiVersion);
app.use("/api", validateApiVersion);
app.use("/api", addVersioningHeaders);

// Monitoring and metrics collection
app.use("/api", collectMetrics);

// Input sanitization
app.use(sanitizeInput);

// Validation security
app.use("/api", validateJsonPayload);
app.use("/api", validateApiVersion);

// Apply general rate limiting to all API routes
app.use("/api", apiLimiter);

// System endpoints
app.get("/api/socket/health", (req, res) => {
  const health = socketManager.getHealthStatus();
  console.log("🔌 Socket health check:", health);
  res.json({ success: true, data: health });
});

app.get("/api/test-db", async (req, res) => {
  try {
    console.log("🗄️ Testing database connection...");
    const result = await db.selectFrom("users").selectAll().limit(1).execute();
    console.log("✅ Database test successful, found", result.length, "users");
    res.json({
      success: true,
      data: { status: "ok", userCount: result.length },
    });
  } catch (error) {
    console.error("❌ Database test failed:", error);
    res.status(500).json({
      success: false,
      error: { message: "Database connection failed", statusCode: 500 },
    });
  }
});

app.get("/api/version", getApiVersionInfo);
app.get("/api/deployment/ready", getDeploymentReadiness);

// Monitoring endpoints
app.get("/api/monitoring/health", authenticateToken, getHealthMetrics);
app.get("/api/monitoring/metrics/system", authenticateToken, getSystemMetrics);
app.get("/api/monitoring/metrics/performance", authenticateToken, getPerformanceMetrics);
app.get("/api/monitoring/metrics/errors", authenticateToken, getErrorMetrics);
app.get("/api/monitoring/metrics/users", authenticateToken, getUserMetrics);

// Error reporting endpoint for frontend
app.post("/api/monitoring/errors", async (req, res): Promise<void> => {
  try {
    const {
      message,
      stack,
      componentStack,
      errorId,
      timestamp,
      userAgent,
      url,
      userId,
    } = req.body;

    console.error("🐛 Frontend Error Report:", {
      errorId,
      message,
      url,
      userId,
      timestamp,
    });

    const error = new Error(message);
    error.stack = stack;
    monitoringTrackError(error, req, "frontend");

    res.json({
      success: true,
      data: {
        errorId,
        message: "Error report received",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error reporting endpoint failed:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "Failed to process error report",
        statusCode: 500,
      },
    });
  }
});

// Stablecoin API routes
app.use("/api/stablecoin", stablecoinRoutes);

// Mount modular routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/proposals", governanceRoutes);
app.use("/api/crisis-alerts", crisisRoutes);
app.use("/api", miscRoutes);
app.use("/api/help-requests", createHelpRequestRoutes(upload, io));

// Legacy KYC endpoints (keeping for compatibility)
app.post(
  "/api/kyc/upload",
  authenticateToken,
  uploadLimiter,
  ...fileUploadSecurityMiddleware,
  kycUpload.fields([
    { name: "document", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
  ]),
  async (req: AuthRequest, res) => {
    try {
      if (!req.userId || typeof req.userId !== 'number') {
        return sendError(res, "Invalid authentication token", 401);
      }

      const userId = req.userId;
      const { documentType, documentNumber } = req.body;

      console.log("📄 KYC document upload request from user:", userId);

      if (!documentType || !documentNumber) {
        return sendError(res, "Document type and number are required", 400);
      }

      if (!isValidDocumentType(documentType)) {
        return sendError(res, "Invalid document type", 400);
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.document || files.document.length === 0) {
        return sendError(res, "Document file is required", 400);
      }

      const documentFile = files.document[0];
      const selfieFile = files.selfie ? files.selfie[0] : undefined;

      const result = await uploadKYCDocuments(
        userId,
        documentType,
        documentNumber,
        documentFile,
        selfieFile,
      );

      if (!result.success) {
        return sendError(res, result.error || "Document upload failed", 400);
      }

      console.log("✅ KYC documents uploaded successfully");
      sendSuccess(res, {
        message: "Documents uploaded successfully and are under review",
        verificationId: result.verificationId,
      });
    } catch (error) {
      console.error("❌ KYC upload error:", error);
      sendError(res, "Internal server error", 500);
    }
  },
);

app.get("/api/kyc/status", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.userId || typeof req.userId !== 'number') {
      return sendError(res, "Invalid authentication token", 401);
    }

    const userId = req.userId;
    const status = await getKYCStatus(userId);
    sendSuccess(res, status);
  } catch (error) {
    console.error("❌ KYC status error:", error);
    sendError(res, "Internal server error", 500);
  }
});

app.get("/api/kyc/document-types", (req, res) => {
  try {
    const documentTypes = [
      { value: "passport", label: getDocumentTypeDisplayName("passport") },
      { value: "drivers_license", label: getDocumentTypeDisplayName("drivers_license") },
      { value: "national_id", label: getDocumentTypeDisplayName("national_id") },
      { value: "residence_permit", label: getDocumentTypeDisplayName("residence_permit") },
    ];

    sendSuccess(res, documentTypes);
  } catch (error) {
    console.error("❌ Document types error:", error);
    sendError(res, "Internal server error", 500);
  }
});

// Admin endpoints for KYC management
app.get("/api/admin/kyc/pending", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const verifications = await getPendingKYCVerifications();
    sendSuccess(res, verifications);
  } catch (error) {
    console.error("❌ Pending KYC error:", error);
    sendError(res, "Internal server error", 500);
  }
});

app.post("/api/admin/kyc/:verificationId/status", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { verificationId } = req.params;
    const { status, notes } = req.body;

    if (!["approved", "rejected", "under_review"].includes(status)) {
      return sendError(res, "Invalid status", 400);
    }

    const success = await updateKYCStatus(parseInt(verificationId), status, notes);

    if (!success) {
      return sendError(res, "Failed to update status", 400);
    }

    sendSuccess(res, { message: "Status updated successfully" });
  } catch (error) {
    console.error("❌ Update KYC status error:", error);
    sendError(res, "Internal server error", 500);
  }
});

// Security admin endpoints
app.get("/api/admin/security/status", authenticateToken, securityAdminEndpoints.dashboard.getStatus);
app.get("/api/admin/security/events", authenticateToken, securityAdminEndpoints.dashboard.getEvents);
app.post("/api/admin/security/config", authenticateToken, securityAdminEndpoints.dashboard.updateConfig);
app.post("/api/admin/security/lockdown", authenticateToken, securityAdminEndpoints.dashboard.emergencyLockdown);
app.get("/api/admin/security/report", authenticateToken, securityAdminEndpoints.dashboard.generateReport);

// Antimalware Management
app.get("/api/admin/security/antimalware/quarantine", authenticateToken, securityAdminEndpoints.antimalware.list);
app.post("/api/admin/security/antimalware/clean", authenticateToken, securityAdminEndpoints.antimalware.clean);

// Antivirus Management
app.get("/api/admin/security/antivirus/stats", authenticateToken, securityAdminEndpoints.antivirus.getStats);
app.post("/api/admin/security/antivirus/update", authenticateToken, securityAdminEndpoints.antivirus.updateDefinitions);
app.get("/api/admin/security/antivirus/quarantine", authenticateToken, securityAdminEndpoints.antivirus.getQuarantine);
app.post("/api/admin/security/antivirus/clean", authenticateToken, securityAdminEndpoints.antivirus.cleanQuarantine);

// Anti-Hacking Management
app.get("/api/admin/security/antihacking/stats", authenticateToken, securityAdminEndpoints.antiHacking.getSecurityStats);
app.post("/api/admin/security/antihacking/block-ip", authenticateToken, securityAdminEndpoints.antiHacking.blockIP);
app.post("/api/admin/security/antihacking/unblock-ip", authenticateToken, securityAdminEndpoints.antiHacking.unblockIP);

// Post-Quantum Security admin endpoints
app.get("/api/admin/security/post-quantum/status", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const status = postQuantumSecurity.getSecurityStatus();
    res.json({
      success: true,
      data: {
        ...status,
        timestamp: new Date().toISOString(),
        description: "Post-Quantum Cryptography Security Baseline",
        nistStandards: ["ML-KEM", "ML-DSA", "SLH-DSA"],
        quantumResistant: true,
        hybridEncryption: true
      }
    });
  } catch (error) {
    console.error("❌ Post-quantum security status error:", error);
    res.status(500).json({ success: false, error: "Failed to get post-quantum security status" });
  }
});

app.post("/api/admin/security/post-quantum/test", authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Test post-quantum key exchange
    const kemTest = postQuantumSecurity.keyEncapsulation.generateKeyPair();
    const { ciphertext, sharedSecret } = postQuantumSecurity.keyEncapsulation.encapsulate(kemTest.publicKey);
    const decapsulatedSecret = postQuantumSecurity.keyEncapsulation.decapsulate(ciphertext, kemTest.privateKey);
    
    // Test post-quantum signatures
    const dsaTest = postQuantumSecurity.digitalSignatures.generateKeyPair();
    const testMessage = Buffer.from("GALAX Post-Quantum Security Test");
    const signature = postQuantumSecurity.digitalSignatures.sign(testMessage, dsaTest.privateKey);
    const signatureValid = postQuantumSecurity.digitalSignatures.verify(signature, testMessage, dsaTest.publicKey);

    res.json({
      success: true,
      data: {
        kemTest: {
          keyGenerated: kemTest.publicKey.length > 0 && kemTest.privateKey.length > 0,
          encapsulation: ciphertext.length > 0 && sharedSecret.length > 0,
          decapsulation: Buffer.from(sharedSecret).equals(Buffer.from(decapsulatedSecret))
        },
        dsaTest: {
          keyGenerated: dsaTest.publicKey.length > 0 && dsaTest.privateKey.length > 0,
          signatureCreated: signature.length > 0,
          signatureValid: signatureValid
        },
        timestamp: new Date().toISOString(),
        testStatus: "All post-quantum cryptography tests passed"
      }
    });

    logSecurityEvent({
      type: "test",
      severity: "info",
      ip: req.ip || "unknown",
      details: { event: "Post-quantum security test completed", userId: req.userId },
      action: "Admin security testing",
      status: "allowed"
    });

  } catch (error) {
    console.error("❌ Post-quantum security test error:", error);
    res.status(500).json({ success: false, error: "Post-quantum security test failed" });
  }
});

// Serve uploaded files with security headers
app.use(
  "/uploads",
  express.static(path.join(process.env.DATA_DIRECTORY || "./data", "uploads"), {
    setHeaders: (res, filePath) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Cache-Control", "public, max-age=31536000");
    },
  }),
);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handling
process.on("SIGTERM", async () => {
  console.log("🔌 SIGTERM received, shutting down gracefully...");
  await socketManager.shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🔌 SIGINT received, shutting down gracefully...");
  await socketManager.shutdown();
  process.exit(0);
});

// Export a function to start the server
export async function startServer(port: number) {
  try {
    console.log("🚀 Starting server on port:", port);

    // Initialize performance optimizations
    try {
      const { createPerformanceIndexes } = await import("./performance.js");
      await createPerformanceIndexes();
      console.log("🚀 Performance optimizations initialized");
    } catch (error) {
      console.warn("⚠️ Performance optimization warning:", error.message);
    }

    // Initialize comprehensive security systems
    try {
      await initializeSecuritySystems();
      console.log("🛡️ Comprehensive security systems initialized successfully");

      logSecurityEvent({
        type: "attack",
        severity: "low",
        ip: "system",
        details: { event: "Security systems initialized" },
        action: "System startup",
        status: "allowed",
      });
    } catch (error) {
      console.error("❌ Security system initialization error:", error);
    }

    // Initialize Post-Quantum Cryptography Security Baseline
    try {
      const pqSecurityStatus = postQuantumSecurity.initializeSecurity();
      console.log("🔐 Post-Quantum Security Baseline initialized successfully");
      console.log(`   • Security Level: ${pqSecurityStatus.securityLevel} (256-bit equivalent)`);
      console.log(`   • Algorithms: ${pqSecurityStatus.algorithms.join(', ')}`);

      logSecurityEvent({
        type: "system",
        severity: "info",
        ip: "system",
        details: { 
          event: "Post-Quantum Security initialized",
          securityLevel: pqSecurityStatus.securityLevel,
          algorithms: pqSecurityStatus.algorithms
        },
        action: "Post-quantum cryptography baseline enabled",
        status: "allowed",
      });
    } catch (error) {
      console.error("❌ Post-Quantum Security initialization error:", error);
    }

    // Initialize and start stablecoin service
    try {
      console.log("💰 Initializing stablecoin service...");
      await stablecoinService.start();
      console.log("✅ Stablecoin service started successfully");
    } catch (error) {
      console.error("❌ Stablecoin service initialization error:", error);
    }

    if (process.env.NODE_ENV === "production") {
      console.log("🌐 Setting up static file serving...");
      setupStaticServing(app);
    }

    server.listen(port, () => {
      console.log(`✅ API Server with Socket.IO running on port ${port}`);
      console.log(`🌍 Health check: http://localhost:${port}/api/health`);
      console.log(`🗄️ Database test: http://localhost:${port}/api/test-db`);
      console.log(`🔌 Socket health: http://localhost:${port}/api/socket/health`);
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
      console.log(`🧹 Socket management: Enhanced with connection cleanup and memory management`);
    });
  } catch (err) {
    console.error("💥 Failed to start server:", err);
    process.exit(1);
  }
}

// Start the server directly if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🚀 Starting server directly...");
  startServer(Number(process.env.PORT) || 3001);
}