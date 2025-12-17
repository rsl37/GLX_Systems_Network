/**
 * @file lib/auth-checker.js
 * Authorization enforcement for sensitive operations.
 * Integrates with JWT server to validate permissions before execution.
 */

const crypto = require('crypto');

/**
 * Represents a permission/scope required by a tool.
 */
class Permission {
  constructor(scope, resource = '*', action = '*') {
    this.scope = scope; // e.g., 'write:database', 'read:civic', 'admin:system'
    this.resource = resource; // e.g., specific table, API endpoint
    this.action = action; // e.g., 'SELECT', 'INSERT', 'DELETE'
  }

  matches(granted) {
    // Wildcard matching: 'admin:system' grants all 'system:*' permissions
    if (this.scope === granted.scope || granted.scope === '*') return true;
    if (granted.scope === '*') return true;
    return false;
  }
}

/**
 * Authorization context passed to sensitive operations.
 */
class AuthContext {
  constructor(userId = null, scopes = [], tokenHash = null) {
    this.userId = userId;
    this.scopes = scopes || [];
    this.tokenHash = tokenHash;
    this.timestamp = Date.now();
  }

  /**
   * Check if context has required permission.
   * @param {Permission|string} required - Permission or scope string
   * @returns {boolean} True if permitted
   */
  hasPermission(required) {
    if (typeof required === 'string') {
      required = new Permission(required);
    }

    return this.scopes.some(granted => {
      if (typeof granted === 'string') {
        granted = new Permission(granted);
      }
      return required.matches(granted);
    });
  }

  /**
   * Require permission or throw error.
   * @param {Permission|string} required
   * @throws {Error} If not permitted
   */
  require(required) {
    if (!this.hasPermission(required)) {
      const scope = typeof required === 'string' ? required : required.scope;
      throw new Error(
        `Permission denied. Required scope: ${scope}. User scopes: ${this.scopes.join(', ')}`
      );
    }
  }

  /**
   * Get an audit trail string for logging.
   */
  audit() {
    return `user:${this.userId || 'anonymous'} scopes:[${this.scopes.join(', ')}] token:${this.tokenHash || 'none'}`;
  }
}

/**
 * Middleware to extract and validate JWT token from request headers.
 * @param {Object} headers - HTTP headers
 * @param {string} jwtSecret - Secret for verification
 * @returns {AuthContext}
 */
function extractAuthContext(headers = {}, jwtSecret = null) {
  const authHeader = headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (!token || scheme !== 'Bearer') {
    // Unauthenticated context: limited permissions
    return new AuthContext(null, ['public:read'], null);
  }

  if (!jwtSecret) {
    throw new Error('JWT validation required but secret not configured');
  }

  try {
    // Simplified JWT parsing (in production, use 'jsonwebtoken' library)
    const [headerB64, payloadB64, signature] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'));

    // Verify signature
    const verified = verifyJwtSignature(`${headerB64}.${payloadB64}`, signature, jwtSecret);
    if (!verified) {
      throw new Error('Invalid JWT signature');
    }

    // Extract claims
    const { sub, scopes = [] } = payload;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex').substring(0, 8);

    return new AuthContext(sub, scopes, tokenHash);
  } catch (err) {
    throw new Error(`JWT validation failed: ${err.message}`);
  }
}

/**
 * Simple HMAC verification of JWT signature.
 * (In production, use a proper JWT library like 'jsonwebtoken')
 */
function verifyJwtSignature(message, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const actual = signature.replace(/=/g, '');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

module.exports = {
  Permission,
  AuthContext,
  extractAuthContext,
};
