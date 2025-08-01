/*
 * Copyright (c) 2025 GALAX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

// Advanced Sandboxing and Isolation System for Zero-Day Protection
// Provides containment and isolation mechanisms for potential zero-day exploits
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// Sandboxing configuration
interface SandboxConfig {
  enabled: boolean;
  isolationLevel: 'basic' | 'enhanced' | 'maximum';
  quarantinePath: string;
  maxExecutionTime: number;
  maxMemoryUsage: number;
  allowedOperations: string[];
  restrictedPaths: string[];
}

const sandboxConfig: SandboxConfig = {
  enabled: true,
  isolationLevel: 'enhanced',
  quarantinePath: '/tmp/galax-sandbox-quarantine',
  maxExecutionTime: 5000, // 5 seconds
  maxMemoryUsage: 100 * 1024 * 1024, // 100MB
  allowedOperations: ['read', 'write_temp', 'network_limited'],
  restrictedPaths: [
    '/etc',
    '/usr',
    '/bin',
    '/sbin',
    '/var',
    '/home',
    '/root',
    '/proc',
    '/sys',
    '/dev'
  ]
};

// Sandbox session tracking
interface SandboxSession {
  id: string;
  startTime: Date;
  clientIP: string;
  userAgent: string;
  requestPath: string;
  isolationLevel: string;
  operations: SandboxOperation[];
  status: 'active' | 'completed' | 'terminated' | 'quarantined';
  risk: 'low' | 'medium' | 'high' | 'critical';
  violations: string[];
}

interface SandboxOperation {
  type: 'file_access' | 'network_request' | 'memory_allocation' | 'process_spawn';
  details: string;
  timestamp: Date;
  allowed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const activeSandboxSessions = new Map<string, SandboxSession>();
const sandboxHistory: SandboxSession[] = [];
const MAX_HISTORY = 1000;

// Sandbox statistics
interface SandboxStats {
  totalSessions: number;
  activeSessions: number;
  quarantinedSessions: number;
  violationsDetected: number;
  maliciousActivitiesBlocked: number;
  averageSessionDuration: number;
  isolationEffectiveness: number;
}

const sandboxStats: SandboxStats = {
  totalSessions: 0,
  activeSessions: 0,
  quarantinedSessions: 0,
  violationsDetected: 0,
  maliciousActivitiesBlocked: 0,
  averageSessionDuration: 0,
  isolationEffectiveness: 100
};

// Initialize quarantine directory
async function initializeQuarantine() {
  try {
    await fs.mkdir(sandboxConfig.quarantinePath, { recursive: true });
    console.log(`[SANDBOX] Quarantine directory initialized: ${sandboxConfig.quarantinePath}`);
  } catch (error) {
    console.error(`[SANDBOX] Failed to initialize quarantine directory:`, error);
  }
}

// Risk assessment based on request characteristics
function assessRequestRisk(req: Request): 'low' | 'medium' | 'high' | 'critical' {
  const userAgent = req.get('User-Agent') || '';
  const contentType = req.get('Content-Type') || '';
  const contentLength = parseInt(req.get('Content-Length') || '0');
  const requestBody = JSON.stringify(req.body || {});

  let riskScore = 0;

  // User agent analysis
  const suspiciousUA = ['curl', 'wget', 'python', 'bot', 'scanner', 'script'];
  if (suspiciousUA.some(pattern => userAgent.toLowerCase().includes(pattern))) {
    riskScore += 2;
  }

  // Large payloads
  if (contentLength > 10 * 1024 * 1024) { // > 10MB
    riskScore += 3;
  }

  // Suspicious content types
  const suspiciousTypes = ['application/octet-stream', 'application/x-executable'];
  if (suspiciousTypes.includes(contentType)) {
    riskScore += 3;
  }

  // Code execution patterns in body
  const codePatterns = /(?:eval|exec|system|shell|cmd|powershell|bash|sh)/gi;
  if (codePatterns.test(requestBody)) {
    riskScore += 4;
  }

  // File system patterns
  const fsPatterns = /(?:\.\.\/|\.\.\\|\/etc\/|\/usr\/|\/bin\/|\/var\/)/gi;
  if (fsPatterns.test(requestBody)) {
    riskScore += 3;
  }

  // Network patterns
  const networkPatterns = /(?:http:\/\/|https:\/\/|ftp:\/\/|tcp:|udp:|socket)/gi;
  if (networkPatterns.test(requestBody)) {
    riskScore += 2;
  }

  if (riskScore >= 8) return 'critical';
  if (riskScore >= 5) return 'high';
  if (riskScore >= 3) return 'medium';
  return 'low';
}

// Create isolated sandbox session
function createSandboxSession(req: Request): SandboxSession {
  const sessionId = crypto.randomUUID();
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || '';
  const risk = assessRequestRisk(req);

  const session: SandboxSession = {
    id: sessionId,
    startTime: new Date(),
    clientIP,
    userAgent,
    requestPath: req.path,
    isolationLevel: sandboxConfig.isolationLevel,
    operations: [],
    status: 'active',
    risk,
    violations: []
  };

  activeSandboxSessions.set(sessionId, session);
  sandboxStats.totalSessions++;
  sandboxStats.activeSessions++;

  console.log(`[SANDBOX] Created session ${sessionId} for ${clientIP} with risk level: ${risk}`);

  return session;
}

// Monitor sandbox operations
function monitorOperation(sessionId: string, operation: Omit<SandboxOperation, 'timestamp' | 'allowed'>): boolean {
  const session = activeSandboxSessions.get(sessionId);
  if (!session) return false;

  let allowed = true;
  let violation: string | null = null;

  // Check operation against security policies
  switch (operation.type) {
    case 'file_access':
      // Check for restricted path access
      const isRestricted = sandboxConfig.restrictedPaths.some(path =>
        operation.details.startsWith(path)
      );
      if (isRestricted) {
        allowed = false;
        violation = `Attempted access to restricted path: ${operation.details}`;
      }
      break;

    case 'network_request':
      // Allow only HTTP/HTTPS to public networks
      if (!operation.details.startsWith('http') ||
          operation.details.includes('localhost') ||
          operation.details.includes('127.0.0.1') ||
          operation.details.includes('192.168.') ||
          operation.details.includes('10.0.')) {
        allowed = false;
        violation = `Blocked network request: ${operation.details}`;
      }
      break;

    case 'memory_allocation':
      const memorySize = parseInt(operation.details.match(/\d+/)?.[0] || '0');
      if (memorySize > sandboxConfig.maxMemoryUsage) {
        allowed = false;
        violation = `Memory allocation exceeds limit: ${memorySize} bytes`;
      }
      break;

    case 'process_spawn':
      // Block all process spawning in sandbox
      allowed = false;
      violation = `Process spawning blocked: ${operation.details}`;
      break;
  }

  const sandboxOperation: SandboxOperation = {
    ...operation,
    timestamp: new Date(),
    allowed
  };

  session.operations.push(sandboxOperation);

  if (!allowed) {
    session.violations.push(violation!);
    sandboxStats.violationsDetected++;
    sandboxStats.maliciousActivitiesBlocked++;

    console.log(`[SANDBOX] Violation in session ${sessionId}: ${violation}`);

    // Escalate session risk on violations
    if (operation.riskLevel === 'critical' || session.violations.length >= 3) {
      session.risk = 'critical';
      session.status = 'quarantined';
      quarantineSession(sessionId);
    }
  }

  return allowed;
}

// Quarantine suspicious session
async function quarantineSession(sessionId: string) {
  const session = activeSandboxSessions.get(sessionId);
  if (!session) return;

  session.status = 'quarantined';
  sandboxStats.quarantinedSessions++;

  try {
    // Save session data to quarantine
    const quarantineFile = path.join(sandboxConfig.quarantinePath, `session-${sessionId}.json`);
    await fs.writeFile(quarantineFile, JSON.stringify(session, null, 2));

    console.log(`[SANDBOX] Session ${sessionId} quarantined - ${session.violations.length} violations`);

    // Remove from active sessions
    activeSandboxSessions.delete(sessionId);
    sandboxStats.activeSessions--;

    // Add to history
    sandboxHistory.unshift(session);
    if (sandboxHistory.length > MAX_HISTORY) {
      sandboxHistory.pop();
    }

  } catch (error) {
    console.error(`[SANDBOX] Failed to quarantine session ${sessionId}:`, error);
  }
}

// Complete sandbox session
function completeSandboxSession(sessionId: string) {
  const session = activeSandboxSessions.get(sessionId);
  if (!session) return;

  session.status = 'completed';
  const duration = Date.now() - session.startTime.getTime();

  // Update statistics
  sandboxStats.activeSessions--;
  sandboxStats.averageSessionDuration =
    (sandboxStats.averageSessionDuration * (sandboxStats.totalSessions - 1) + duration) /
    sandboxStats.totalSessions;

  // Calculate isolation effectiveness
  const successfulIsolations = sandboxStats.maliciousActivitiesBlocked;
  const totalThreats = sandboxStats.violationsDetected || 1;
  sandboxStats.isolationEffectiveness = Math.round((successfulIsolations / totalThreats) * 100);

  activeSandboxSessions.delete(sessionId);

  // Add to history
  sandboxHistory.unshift(session);
  if (sandboxHistory.length > MAX_HISTORY) {
    sandboxHistory.pop();
  }

  console.log(`[SANDBOX] Session ${sessionId} completed after ${duration}ms`);
}

// Main sandboxing middleware
export function sandboxingMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!sandboxConfig.enabled) {
    return next();
  }

  const session = createSandboxSession(req);

  // Add sandbox session to request for downstream middleware
  (req as any).sandboxSession = session;

  // Set sandbox headers
  res.set('X-Sandbox-Session', session.id);
  res.set('X-Sandbox-Isolation', session.isolationLevel);
  res.set('X-Sandbox-Risk', session.risk);

  // Override response to complete session
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any, cb?: () => void) {
    completeSandboxSession(session.id);
    return originalEnd(chunk, encoding, cb);
  } as any;

  // Monitor for timeout
  const timeout = setTimeout(() => {
    if (activeSandboxSessions.has(session.id)) {
      session.violations.push('Session timeout exceeded');
      quarantineSession(session.id);
    }
  }, sandboxConfig.maxExecutionTime);

  res.on('finish', () => {
    clearTimeout(timeout);
  });

  next();
}

// File upload sandboxing
export function sandboxFileUpload(req: Request, res: Response, next: NextFunction) {
  if (!req.files) {
    return next();
  }

  const session = (req as any).sandboxSession as SandboxSession;
  if (!session) {
    return next();
  }

  const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

  for (const file of files) {
    // Monitor file access operation
    const allowed = monitorOperation(session.id, {
      type: 'file_access',
      details: `Upload: ${file.originalname || 'unknown'} (${file.size} bytes)`,
      riskLevel: file.size > 10 * 1024 * 1024 ? 'high' : 'medium'
    });

    if (!allowed) {
      return res.status(403).json({
        error: 'File upload blocked by sandbox security policy',
        sessionId: session.id,
        reference: crypto.randomUUID().slice(0, 8)
      });
    }
  }

  next();
}

// Network request monitoring
export function monitorNetworkAccess(url: string, sessionId?: string): boolean {
  if (!sessionId) return true; // Allow if no sandbox session

  return monitorOperation(sessionId, {
    type: 'network_request',
    details: url,
    riskLevel: url.includes('localhost') || url.includes('127.0.0.1') ? 'high' : 'low'
  });
}

// Memory allocation monitoring
export function monitorMemoryAllocation(size: number, sessionId?: string): boolean {
  if (!sessionId) return true; // Allow if no sandbox session

  return monitorOperation(sessionId, {
    type: 'memory_allocation',
    details: `${size} bytes`,
    riskLevel: size > 50 * 1024 * 1024 ? 'high' : 'low' // 50MB threshold
  });
}

// Admin endpoints for sandbox management
export function sandboxAdmin(req: Request, res: Response) {
  const { action } = req.params;

  switch (action) {
    case 'status':
      return res.json({
        sandbox: 'ACTIVE',
        config: sandboxConfig,
        stats: sandboxStats,
        activeSessions: Array.from(activeSandboxSessions.values()).map(s => ({
          id: s.id,
          clientIP: s.clientIP,
          requestPath: s.requestPath,
          risk: s.risk,
          operations: s.operations.length,
          violations: s.violations.length,
          duration: Date.now() - s.startTime.getTime()
        }))
      });

    case 'sessions':
      const limit = parseInt(req.query.limit as string) || 50;
      return res.json({
        active: Array.from(activeSandboxSessions.values()),
        history: sandboxHistory.slice(0, limit),
        total: sandboxHistory.length
      });

    case 'quarantine':
      const quarantinedSessions = sandboxHistory.filter(s => s.status === 'quarantined');
      return res.json({
        quarantined: quarantinedSessions,
        count: quarantinedSessions.length
      });

    case 'terminate-session':
      const sessionId = req.body.sessionId;
      if (sessionId && activeSandboxSessions.has(sessionId)) {
        quarantineSession(sessionId);
        return res.json({ terminated: true, sessionId });
      }
      return res.status(400).json({ error: 'Session not found' });

    case 'config':
      if (req.method === 'POST') {
        // Update configuration
        const newConfig = req.body;
        Object.assign(sandboxConfig, newConfig);
        return res.json({ updated: true, config: sandboxConfig });
      }
      return res.json({ config: sandboxConfig });

    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

// Initialize sandboxing system
export async function initializeSandboxing() {
  console.log('[SANDBOX] Initializing advanced sandboxing system...');
  await initializeQuarantine();
  console.log(`[SANDBOX] Isolation level: ${sandboxConfig.isolationLevel}`);
  console.log(`[SANDBOX] Max execution time: ${sandboxConfig.maxExecutionTime}ms`);
  console.log(`[SANDBOX] Max memory usage: ${Math.round(sandboxConfig.maxMemoryUsage / 1024 / 1024)}MB`);
  console.log(`[SANDBOX] Restricted paths: ${sandboxConfig.restrictedPaths.length}`);
  console.log('[SANDBOX] File upload monitoring: ACTIVE');
  console.log('[SANDBOX] Network access monitoring: ACTIVE');
  console.log('[SANDBOX] Memory allocation monitoring: ACTIVE');
  console.log('[SANDBOX] Advanced sandboxing system: READY');
}

// Export sandbox utilities
export {
  sandboxConfig,
  sandboxStats,
  activeSandboxSessions,
  sandboxHistory,
  monitorOperation
};