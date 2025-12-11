# GLX Authentication System - Beta Ready

## Overview

The GLX authentication system is a comprehensive, production-ready authentication solution supporting multiple authentication methods, session management, and advanced security features.

## Features

### ✅ Core Authentication
- **Password-based Authentication**: Bcrypt hashing with configurable salt rounds
- **JWT Tokens**: Access tokens (15min) and refresh tokens (7 days)
- **Token Refresh**: Automatic token rotation on refresh for enhanced security
- **Server-Side Token Storage**: Refresh tokens stored in database for validation
- **Token Blacklisting**: Immediate token revocation on logout or security events

### ✅ Multi-Factor Authentication
- **2FA Support**: Time-based one-time passwords (TOTP)
- **Email Verification**: Secure email verification flow
- **Phone Verification**: SMS-based phone number verification

### ✅ Modern Authentication Methods
- **OAuth 2.0**: Support for Google, GitHub, Facebook, and Twitter
- **Passkey/WebAuthn**: Passwordless authentication with FIDO2 support
- **Multi-Provider**: Users can link multiple OAuth providers to one account

### ✅ Session Management
- **Multi-Device Sessions**: Track and manage sessions across devices
- **Session Statistics**: View active sessions, devices, and last activity
- **Selective Revocation**: Revoke individual sessions or all sessions
- **Automatic Cleanup**: Expired sessions cleaned up automatically

### ✅ Security Features
- **Account Lockout**: Automatic lockout after failed login attempts
- **Rate Limiting**: Endpoint-specific rate limits
- **CSRF Protection**: State validation for OAuth flows
- **Replay Attack Prevention**: Counter-based verification for passkeys
- **Secure Secret Management**: Production/development environment validation
- **IP Tracking**: Monitor login locations
- **Server-Side Token Validation**: Refresh tokens validated against database storage
- **Token Audit Trail**: Track token usage with last_used_at timestamps
- **Automatic Token Cleanup**: Periodic cleanup of expired tokens

## API Endpoints

### Registration & Login

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "phone": "+1234567890",
  "password": "SecurePassword123!",
  "username": "johndoe",
  "walletAddress": "0x..." // Optional Web3 wallet
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "sessionId": "abc123...",
    "userId": 123,
    "emailVerificationRequired": true,
    "phoneVerificationRequired": true
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com", // or phone or walletAddress
  "password": "SecurePassword123!"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

### Token Management

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...", // New rotated refresh token
    "message": "Tokens refreshed successfully"
  }
}
```

### OAuth Authentication

#### Initialize OAuth Flow
```http
POST /api/auth/oauth/init
Content-Type: application/json

{
  "provider": "google" // or "github", "facebook", "twitter"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "state": "abc123...",
    "provider": "google"
  }
}
```

#### OAuth Callback
```http
POST /api/auth/oauth/callback
Content-Type: application/json

{
  "provider": "google",
  "state": "abc123...",
  "providerData": {
    "provider": "google",
    "providerId": "123456789",
    "providerEmail": "user@gmail.com",
    "providerName": "John Doe"
  }
}
```

#### List OAuth Accounts
```http
GET /api/auth/oauth/accounts
Authorization: Bearer <access_token>
```

#### Unlink OAuth Account
```http
DELETE /api/auth/oauth/:provider
Authorization: Bearer <access_token>
```

### Passkey/WebAuthn

#### Start Passkey Registration
```http
POST /api/auth/passkey/register/challenge
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "challenge": "abc123..."
  }
}
```

#### Complete Passkey Registration
```http
POST /api/auth/passkey/register
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "challenge": "abc123...",
  "credentialId": "xyz789...",
  "publicKey": "...",
  "deviceName": "iPhone 15 Pro"
}
```

#### Start Passkey Login
```http
POST /api/auth/passkey/login/challenge
```

#### Complete Passkey Login
```http
POST /api/auth/passkey/login
Content-Type: application/json

{
  "challenge": "abc123...",
  "credentialId": "xyz789...",
  "counter": 5
}
```

#### List Passkeys
```http
GET /api/auth/passkey/list
Authorization: Bearer <access_token>
```

#### Delete Passkey
```http
DELETE /api/auth/passkey/:credentialId
Authorization: Bearer <access_token>
```

#### Rename Passkey
```http
PATCH /api/auth/passkey/:credentialId
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "deviceName": "My MacBook Pro"
}
```

### Session Management

#### List Active Sessions
```http
GET /api/auth/sessions
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "abc123...",
        "deviceInfo": "iPhone",
        "ipAddress": "192.168.1.1",
        "lastActivity": "2025-12-10T00:00:00.000Z",
        "createdAt": "2025-12-09T12:00:00.000Z"
      }
    ]
  }
}
```

#### Get Session Statistics
```http
GET /api/auth/sessions/stats
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 3,
    "active": 2,
    "devices": ["iPhone", "Chrome Browser"],
    "lastActivity": "2025-12-10T00:00:00.000Z"
  }
}
```

#### Revoke Session
```http
DELETE /api/auth/sessions/:sessionId
Authorization: Bearer <access_token>
```

#### Revoke All Other Sessions
```http
POST /api/auth/sessions/revoke-all
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentSessionId": "abc123..." // Optional: keep this session active
}
```

### Password Reset

#### Request Password Reset
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Validate Reset Token
```http
POST /api/auth/validate-reset-token
Content-Type: application/json

{
  "token": "reset_token_here"
}
```

#### Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_here",
  "password": "NewSecurePassword123!"
}
```

### Email Verification

#### Send Verification Email
```http
POST /api/auth/send-email-verification
Authorization: Bearer <access_token>
```

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification_token_here"
}
```

### Phone Verification

#### Send Verification Code
```http
POST /api/auth/send-phone-verification
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "phone": "+1234567890"
}
```

#### Verify Phone
```http
POST /api/auth/verify-phone
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "phone": "+1234567890",
  "code": "123456"
}
```

### Two-Factor Authentication

#### Setup 2FA
```http
POST /api/auth/2fa/setup
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,...",
    "message": "Scan the QR code with your authenticator app"
  }
}
```

#### Enable 2FA
```http
POST /api/auth/2fa/enable
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "123456"
}
```

#### Disable 2FA
```http
POST /api/auth/2fa/disable
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "123456"
}
```

#### Verify 2FA Code
```http
POST /api/auth/2fa/verify
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "code": "123456"
}
```

#### Get 2FA Status
```http
GET /api/auth/2fa/status
Authorization: Bearer <access_token>
```

## Environment Variables

### Required
```env
# JWT Secrets (min 32 chars for dev, 64 for production)
JWT_SECRET=your-secure-jwt-secret-here-min-32-characters
JWT_REFRESH_SECRET=your-secure-refresh-secret-here-min-32-characters

# Database
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Optional
```env
# Email Service
RESEND_API_KEY=your-resend-api-key

# SMS Service (Vonage)
VONAGE_API_KEY=your-vonage-api-key
VONAGE_API_SECRET=your-vonage-api-secret
VONAGE_FROM_NUMBER=+1234567890

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## Security Best Practices

### Production Deployment

1. **Use Strong Secrets**: Generate cryptographically secure random strings for JWT secrets
   ```bash
   # Generate secure secret
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Use Redis for Distributed Storage**: Replace in-memory stores with Redis
   - Session storage
   - OAuth state storage
   - Passkey challenge storage

3. **Enable HTTPS**: Always use HTTPS in production

4. **Configure CORS**: Set appropriate CORS origins

5. **Rate Limiting**: Configure appropriate rate limits based on your traffic

6. **Monitor Failed Attempts**: Set up alerts for suspicious activity

### Token Best Practices

- Access tokens: Short-lived (15 minutes)
- Refresh tokens: Longer-lived (7 days) with automatic rotation
- All refresh tokens stored server-side in database for validation
- Tokens include unique JWT IDs (jti) to prevent collisions
- Always revoke tokens on logout (both from blacklist and refresh_tokens table)
- Implement token refresh before expiration
- Periodic cleanup runs hourly to remove expired tokens

### Password Requirements

- Minimum 8 characters
- Mix of uppercase, lowercase, numbers, and symbols recommended
- Bcrypt with 12 salt rounds (adjustable)

## Production Considerations

### Scaling

⚠️ **Important**: The current implementation uses in-memory storage for:
- Sessions
- OAuth state
- Passkey challenges

For production with multiple server instances:

1. **Implement Redis Storage**:
   ```typescript
   import Redis from 'ioredis';
   const redis = new Redis(process.env.REDIS_URL);
   ```

2. **Session Storage**:
   ```typescript
   // Store session
   await redis.setex(`session:${sessionId}`, 604800, JSON.stringify(session));
   
   // Retrieve session
   const data = await redis.get(`session:${sessionId}`);
   const session = JSON.parse(data);
   ```

3. **OAuth State**:
   ```typescript
   await redis.setex(`oauth:state:${state}`, 600, JSON.stringify({ timestamp, userId }));
   ```

4. **Passkey Challenges**:
   ```typescript
   await redis.setex(`passkey:challenge:${challenge}`, 300, JSON.stringify(data));
   ```

### Database

- Use PostgreSQL for production
- SQLite is suitable for development only
- Ensure proper indexing on:
  - `users.email`
  - `users.username`
  - `oauth_accounts.provider` + `oauth_accounts.provider_id`
  - `token_blacklist.token`
  - `refresh_tokens.token` (unique index)
  - `refresh_tokens.user_id` + `refresh_tokens.revoked`

## Testing

The authentication system includes comprehensive test coverage for:
- Registration and login flows
- Token refresh and rotation
- OAuth authentication
- Passkey registration and login
- Session management
- Security features (rate limiting, account lockout)

## Beta Readiness Checklist

- [x] Password-based authentication
- [x] JWT token generation and validation
- [x] Refresh token system with rotation
- [x] Token blacklisting
- [x] OAuth authentication (Google, GitHub, Facebook, Twitter)
- [x] Passkey/WebAuthn support
- [x] Session management
- [x] Multi-device tracking
- [x] Email verification
- [x] Phone verification
- [x] Two-factor authentication
- [x] Password reset flow
- [x] Account lockout protection
- [x] Rate limiting
- [x] Security validation
- [x] Production environment handling

## Support

For issues or questions:
- Email: roselleroberts@pm.me
- Documentation: See inline code comments for detailed implementation notes
