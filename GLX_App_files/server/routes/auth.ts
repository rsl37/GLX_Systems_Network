/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import { Router } from 'express';
import { AuthRequest } from '../auth.js';
import {
  sendSuccess,
  sendError,
  validateAuthUser,
  StatusCodes,
  ErrorMessages,
} from '../utils/responseHelpers.js';
import { hashPassword, comparePassword, generateToken, authenticateToken } from '../auth.js';
import {
  generatePasswordResetToken,
  sendPasswordResetEmail,
  validatePasswordResetToken,
  markTokenAsUsed,
  generateEmailVerificationToken,
  sendEmailVerification,
  validateEmailVerificationToken,
  markEmailVerificationTokenAsUsed,
  markEmailAsVerified,
  resendEmailVerification,
} from '../email.js';
import {
  generatePhoneVerificationToken,
  validatePhoneVerificationCode,
  markPhoneVerificationTokenAsUsed,
  markPhoneAsVerified,
  sendPhoneVerification,
} from '../phone.js';
import { generate2FASecret, enable2FA, disable2FA, verify2FACode, get2FAStatus } from '../twofa.js';
import {
  authLimiter,
  emailLimiter,
  phoneLimiter,
  passwordResetLimiter,
} from '../middleware/rateLimiter.js';
import {
  validateRegistration,
  validateLogin,
  validatePasswordReset,
  validatePasswordResetConfirm,
  validateEmailVerification,
  validatePhoneVerification,
  validatePhoneVerificationConfirm,
} from '../middleware/validation.js';
import {
  accountLockoutMiddleware,
  recordFailedAttempt,
  recordSuccessfulAttempt,
} from '../middleware/accountLockout.js';
import { trackUserAction } from '../middleware/monitoring.js';
import { db } from '../database.js';

const router = Router();

// Registration endpoint
router.post('/register', authLimiter, validateRegistration, async (req, res) => {
  try {
    const { email, phone, password, username, walletAddress } = req.body;

    console.log('📝 Registration attempt:', {
      email,
      phone,
      username,
      walletAddress,
    });

    // Check if user already exists
    const existingUser = await db
      .selectFrom('users')
      .selectAll()
      .where((eb) =>
        eb.or(
          [
            email ? eb('email', '=', email) : undefined,
            phone ? eb('phone', '=', phone) : undefined,
            eb('username', '=', username),
            walletAddress ? eb('wallet_address', '=', walletAddress) : undefined,
          ].filter(Boolean),
        ),
      )
      .executeTakeFirst();

    if (existingUser) {
      console.log('❌ Registration failed: User already exists');
      return sendError(res, 'User already exists with this email, phone, username, or wallet address', StatusCodes.BAD_REQUEST);
    }

    const passwordHash = password ? await hashPassword(password) : null;

    const user = await db
      .insertInto('users')
      .values({
        email: email || null,
        phone: phone || null,
        password_hash: passwordHash,
        wallet_address: walletAddress || null,
        username,
        reputation_score: 0,
        ap_balance: 1000,
        crowds_balance: 0,
        gov_balance: 0,
        roles: 'helper,requester,voter',
        skills: '[]',
        badges: '[]',
        email_verified: 0,
        phone_verified: 0,
      })
      .returning('id')
      .executeTakeFirst();

    if (!user) {
      console.log('❌ Registration failed: Failed to create user');
      return sendError(res, 'Failed to create user account', StatusCodes.INTERNAL_ERROR);
    }

    // Send email verification if email provided
    if (email) {
      console.log('📧 Sending email verification for new user');
      const verificationToken = await generateEmailVerificationToken(user.id);
      if (verificationToken) {
        await sendEmailVerification(email, verificationToken, username);
      }
    }

    // Send phone verification if phone provided
    if (phone) {
      console.log('📱 Sending phone verification for new user');
      const verificationCode = await generatePhoneVerificationToken(user.id, phone);
      if (verificationCode) {
        await sendPhoneVerification(phone, verificationCode);
      }
    }

    const token = generateToken(user.id);
    trackUserAction('registration', user.id);

    console.log('✅ User registered successfully:', user.id);
    sendSuccess(res, {
      token,
      userId: user.id,
      emailVerificationRequired: !!email,
      phoneVerificationRequired: !!phone,
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    throw error;
  }
});

// Login endpoint
router.post('/login', authLimiter, accountLockoutMiddleware, validateLogin, async (req, res) => {
  try {
    const { email, phone, password, walletAddress } = req.body;

    console.log('🔐 Login attempt:', { email, phone, walletAddress });

    let user;
    if (email) {
      user = await db
        .selectFrom('users')
        .selectAll()
        .where('email', '=', email)
        .executeTakeFirst();

      if (!user) {
        user = await db
          .selectFrom('users')
          .selectAll()
          .where('username', '=', email)
          .executeTakeFirst();
      }
    } else if (phone) {
      user = await db
        .selectFrom('users')
        .selectAll()
        .where('phone', '=', phone)
        .executeTakeFirst();
    } else {
      user = await db
        .selectFrom('users')
        .selectAll()
        .where('wallet_address', '=', walletAddress)
        .executeTakeFirst();
    }

    if (!user) {
      console.log('❌ Login failed: User not found');
      if ((req as any).lockoutKey) {
        recordFailedAttempt((req as any).lockoutKey);
      }
      return sendError(res, ErrorMessages.INVALID_CREDENTIALS, StatusCodes.UNAUTHORIZED);
    }

    // Verify password for email/phone login
    if ((email || phone) && password) {
      if (!user.password_hash) {
        console.log('❌ Login failed: No password hash for user');
        if ((req as any).lockoutKey) {
          recordFailedAttempt((req as any).lockoutKey);
        }
        return sendError(res, ErrorMessages.INVALID_CREDENTIALS, StatusCodes.UNAUTHORIZED);
      }

      const isValid = await comparePassword(password, user.password_hash);
      if (!isValid) {
        console.log('❌ Login failed: Invalid password');
        if ((req as any).lockoutKey) {
          recordFailedAttempt((req as any).lockoutKey);
        }
        return sendError(res, ErrorMessages.INVALID_CREDENTIALS, StatusCodes.UNAUTHORIZED);
      }
    }

    const token = generateToken(user.id);

    if ((req as any).lockoutKey) {
      recordSuccessfulAttempt((req as any).lockoutKey);
    }

    trackUserAction('login', user.id);

    console.log('✅ Login successful:', user.id);
    sendSuccess(res, {
      token,
      userId: user.id,
      emailVerified: user.email_verified === 1,
      phoneVerified: user.phone_verified === 1,
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

// Password reset request
router.post('/forgot-password', passwordResetLimiter, validatePasswordReset, async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔐 Password reset request for:', email);

    const token = await generatePasswordResetToken(email);

    if (!token) {
      console.log('⚠️ Password reset requested for non-existent user');
    } else {
      const emailSent = await sendPasswordResetEmail(email, token);
      if (!emailSent) {
        console.log('❌ Failed to send password reset email');
      }
    }

    console.log('✅ Password reset email sent successfully');
    sendSuccess(res, {
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('❌ Password reset request error:', error);
    throw error;
  }
});

// Validate reset token
router.post('/validate-reset-token', passwordResetLimiter, async (req, res) => {
  try {
    const { token } = req.body;

    console.log('🔍 Validating reset token');

    if (!token) {
      return sendError(res, 'Token is required', StatusCodes.BAD_REQUEST);
    }

    const userId = await validatePasswordResetToken(token);

    if (!userId) {
      return sendError(res, 'Invalid or expired token', StatusCodes.BAD_REQUEST);
    }

    console.log('✅ Reset token is valid');
    sendSuccess(res, { valid: true });
  } catch (error) {
    console.error('❌ Token validation error:', error);
    throw error;
  }
});

// Reset password
router.post('/reset-password', passwordResetLimiter, validatePasswordResetConfirm, async (req, res) => {
  try {
    const { token, password } = req.body;

    console.log('🔐 Password reset attempt');

    const userId = await validatePasswordResetToken(token);

    if (!userId) {
      return sendError(res, 'Invalid or expired token', StatusCodes.BAD_REQUEST);
    }

    const passwordHash = await hashPassword(password);

    await db
      .updateTable('users')
      .set({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .where('id', '=', userId)
      .execute();

    await markTokenAsUsed(token);

    console.log('✅ Password reset successful for user:', userId);
    sendSuccess(res, { message: 'Password reset successfully' });
  } catch (error) {
    console.error('❌ Password reset error:', error);
    throw error;
  }
});

// Email verification endpoints
router.post('/send-email-verification', emailLimiter, authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);

    console.log('📧 Email verification request from user:', userId);

    const success = await resendEmailVerification(userId);

    if (!success) {
      return sendError(res, 'Failed to send verification email', StatusCodes.BAD_REQUEST);
    }

    console.log('✅ Email verification sent successfully');
    sendSuccess(res, { message: 'Verification email sent successfully' });
  } catch (error) {
    console.error('❌ Email verification send error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    throw error;
  }
});

router.post('/verify-email', validateEmailVerification, async (req, res) => {
  try {
    const { token } = req.body;

    console.log('🔍 Email verification attempt');

    const userId = await validateEmailVerificationToken(token);

    if (!userId) {
      return sendError(res, 'Invalid or expired verification token', StatusCodes.BAD_REQUEST);
    }

    await markEmailAsVerified(userId);
    await markEmailVerificationTokenAsUsed(token);

    console.log('✅ Email verified successfully for user:', userId);
    sendSuccess(res, { message: 'Email verified successfully' });
  } catch (error) {
    console.error('❌ Email verification error:', error);
    throw error;
  }
});

// Phone verification endpoints
router.post('/send-phone-verification', phoneLimiter, authenticateToken, validatePhoneVerification, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { phone } = req.body;

    console.log('📱 Phone verification request from user:', userId);

    const code = await generatePhoneVerificationToken(userId, phone);

    if (!code) {
      return sendError(res, 'Failed to generate verification code', StatusCodes.BAD_REQUEST);
    }

    const success = await sendPhoneVerification(phone, code);

    if (!success) {
      return sendError(res, 'Failed to send verification SMS', StatusCodes.INTERNAL_ERROR);
    }

    console.log('✅ Phone verification code sent successfully');
    sendSuccess(res, {
      message: 'Verification code sent to your phone',
      expiresIn: '10 minutes',
    });
  } catch (error) {
    console.error('❌ Phone verification send error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

router.post('/verify-phone', phoneLimiter, authenticateToken, validatePhoneVerificationConfirm, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { phone, code } = req.body;

    console.log('🔍 Phone verification attempt for user:', userId);

    const isValid = await validatePhoneVerificationCode(userId, phone, code);

    if (!isValid) {
      return sendError(res, 'Invalid or expired verification code', StatusCodes.BAD_REQUEST);
    }

    await markPhoneAsVerified(userId, phone);
    await markPhoneVerificationTokenAsUsed(userId);

    console.log('✅ Phone verified successfully for user:', userId);
    sendSuccess(res, { message: 'Phone verified successfully' });
  } catch (error) {
    console.error('❌ Phone verification error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

// 2FA endpoints
router.post('/2fa/setup', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);

    console.log('🔐 2FA setup request from user:', userId);

    const user = await db
      .selectFrom('users')
      .select(['username'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      return sendError(res, ErrorMessages.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    const result = await generate2FASecret(userId, user.username);

    if (!result) {
      return sendError(res, 'Failed to generate 2FA secret', StatusCodes.INTERNAL_ERROR);
    }

    console.log('✅ 2FA setup data generated successfully');
    sendSuccess(res, {
      secret: result.secret,
      qrCode: result.qrCode,
      message: 'Scan the QR code with your authenticator app',
    });
  } catch (error) {
    console.error('❌ 2FA setup error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

router.post('/2fa/enable', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { code } = req.body;

    console.log('🔒 2FA enable request from user:', userId);

    if (!code || code.length !== 6) {
      return sendError(res, 'Please provide a 6-digit verification code', StatusCodes.BAD_REQUEST);
    }

    const success = await enable2FA(userId, code);

    if (!success) {
      return sendError(res, 'Invalid verification code. Please try again.', StatusCodes.BAD_REQUEST);
    }

    console.log('✅ 2FA enabled successfully for user:', userId);
    sendSuccess(res, { message: 'Two-factor authentication enabled successfully' });
  } catch (error) {
    console.error('❌ 2FA enable error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

router.post('/2fa/disable', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { code } = req.body;

    console.log('🔓 2FA disable request from user:', userId);

    if (!code || code.length !== 6) {
      return sendError(res, 'Please provide a 6-digit verification code', StatusCodes.BAD_REQUEST);
    }

    const success = await disable2FA(userId, code);

    if (!success) {
      return sendError(res, 'Invalid verification code. Please try again.', StatusCodes.BAD_REQUEST);
    }

    console.log('✅ 2FA disabled successfully for user:', userId);
    sendSuccess(res, { message: 'Two-factor authentication disabled successfully' });
  } catch (error) {
    console.error('❌ 2FA disable error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

router.post('/2fa/verify', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { code } = req.body;

    console.log('🔍 2FA verification request from user:', userId);

    if (!code || typeof code !== 'string' || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return sendError(res, 'Please provide a valid 6-digit numeric verification code', StatusCodes.BAD_REQUEST);
    }

    const isValid = await verify2FACode(userId, code);

    sendSuccess(res, {
      valid: isValid,
      message: isValid ? 'Code verified successfully' : 'Invalid verification code',
    });
  } catch (error) {
    console.error('❌ 2FA verification error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

router.get('/2fa/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);

    const status = await get2FAStatus(userId);

    sendSuccess(res, status);
  } catch (error) {
    console.error('❌ 2FA status error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

export default router;
      .select(['id', 'email', 'phone', 'username', 'wallet_address'])
      .where((eb) => {
      .where(eb => {
        const conditions = [];
        if (email) conditions.push(eb('email', '=', email));
        if (phone) conditions.push(eb('phone', '=', phone));
        conditions.push(eb('username', '=', username));
        if (walletAddress) conditions.push(eb('wallet_address', '=', walletAddress));
        if (username) conditions.push(eb('username', '=', username));
        if (walletAddress) conditions.push(eb('walletAddress', '=', walletAddress));
        return eb.or(conditions);
      })
      .selectAll()
      .where((eb) => eb.or([
        email ? eb('email', '=', email) : eb.lit(false),
        phone ? eb('phone', '=', phone) : eb.lit(false),
        eb('username', '=', username),
        walletAddress ? eb('wallet_address', '=', walletAddress) : eb.lit(false)
      ]))
      .selectAll()
      .where(eb => eb.or([
        eb('email', '=', email),
        eb('phone', '=', phone),
        eb('username', '=', username),
        eb('wallet_address', '=', walletAddress)
      ]))
      .executeTakeFirst();

    const conflictField = null;
    const conflictMessage: string = ErrorMessages.REGISTRATION_USER_EXISTS;

    if (existingUser) {
      console.log('❌ Registration failed: User already exists', {
        conflictField:
          email && existingUser.email === email
            ? 'email'
            : phone && existingUser.phone === phone
              ? 'phone'
              : existingUser.username === username
                ? 'username'
                : 'wallet',
        ip: req.ip,
      });
      return sendError(
        res,
        'User already exists with this email, phone, username, or wallet address',
        StatusCodes.BAD_REQUEST
      );
    }

    const passwordHash = password ? await hashPassword(password) : null;

    const user = await db
      .insertInto('users')
      .values({
        email: email || null,
        phone: phone || null,
        password_hash: passwordHash,
        wallet_address: walletAddress || null,
        username,
        reputation_score: 0,
        ap_balance: 1000,
        crowds_balance: 0,
        gov_balance: 0,
        roles: 'helper,requester,voter',
        skills: '[]',
        badges: '[]',
        email_verified: 0,
        phone_verified: 0,
      })
      .returning('id')
      .executeTakeFirst();

    if (!user) {
      console.log('❌ Registration failed: Failed to create user', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      return sendError(res, 'Failed to create user account', StatusCodes.INTERNAL_ERROR);
    }

    // Send email verification if email provided
    if (email) {
      console.log('📧 Sending email verification for new user');
      const verificationToken = await generateEmailVerificationToken(user.id);
      if (verificationToken) {
        await sendEmailVerification(email, verificationToken, username);
      }
    }

    // Send phone verification if phone provided
    if (phone) {
      console.log('📱 Sending phone verification for new user');
      const verificationCode = await generatePhoneVerificationToken(user.id, phone);
      if (verificationCode) {
        await sendPhoneVerification(phone, verificationCode);
      }
    }

    const token = generateToken(user.id);
    trackUserAction('registration', user.id);

    console.log('✅ User registered successfully:', {
      userId: user.id,
      method: email ? 'email' : phone ? 'phone' : 'wallet',
      ip: req.ip,
    });

    sendSuccess(res, {
      token,
      userId: user.id,
      emailVerificationRequired: !!email,
      phoneVerificationRequired: !!phone,
    });
  } catch (error) {
    console.error('❌ Registration error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      timestamp: new Date().toISOString(),
    });

    // Don't expose internal error details to client
    sendError(res, 'Registration failed. Please try again.', StatusCodes.INTERNAL_ERROR);
  }
});

// Login endpoint
router.post('/login', authLimiter, accountLockoutMiddleware, validateLogin, async (req, res) => {
  try {
    const { email, phone, password, walletAddress } = req.body;

    console.log('🔐 Login attempt:', {
      email: email ? `${email.substring(0, 3)}***` : null,
      phone: phone ? `${phone.substring(0, 3)}***` : null,
      walletAddress: walletAddress ? `${walletAddress.substring(0, 6)}***` : null,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      ip: req.ip,
    });

    let user;
    if (email) {
      user = await db.selectFrom('users').selectAll().where('email', '=', email).executeTakeFirst();

      if (!user) {
        user = await db
          .selectFrom('users')
          .selectAll()
          .where('username', '=', email)
          .executeTakeFirst();
      }
    } else if (phone) {
      user = await db.selectFrom('users').selectAll().where('phone', '=', phone).executeTakeFirst();
    } else {
      user = await db
        .selectFrom('users')
        .selectAll()
        .where('wallet_address', '=', walletAddress)
        .executeTakeFirst();
    }

    if (!user) {
      console.log('❌ Login failed: User not found', {
        method: email ? 'email' : phone ? 'phone' : 'wallet',
        ip: req.ip,
      });
      if ((req as any).lockoutKey) {
        recordFailedAttempt((req as any).lockoutKey);
      }
      return sendError(res, ErrorMessages.LOGIN_ACCOUNT_NOT_FOUND, StatusCodes.UNAUTHORIZED);
    }

    // Verify password for email/phone login
    if ((email || phone) && password) {
      if (!user.password_hash) {
        console.log('❌ Login failed: No password hash for user', {
          userId: user.id,
          ip: req.ip,
        });
        if ((req as any).lockoutKey) {
          recordFailedAttempt((req as any).lockoutKey);
        }
        return sendError(res, ErrorMessages.LOGIN_ACCOUNT_NOT_FOUND, StatusCodes.UNAUTHORIZED);
      }

      const isValid = await comparePassword(password, user.password_hash);
      if (!isValid) {
        console.log('❌ Login failed: Invalid password', {
          userId: user.id,
          ip: req.ip,
        });
        if ((req as any).lockoutKey) {
          recordFailedAttempt((req as any).lockoutKey);
        }
        return sendError(res, ErrorMessages.LOGIN_INVALID_PASSWORD, StatusCodes.UNAUTHORIZED);
      }
    }

    const token = generateToken(user.id);

    if ((req as any).lockoutKey) {
      recordSuccessfulAttempt((req as any).lockoutKey);
    }

    trackUserAction('login', user.id);

    console.log('✅ Login successful:', {
      userId: user.id,
      method: email ? 'email' : phone ? 'phone' : 'wallet',
      ip: req.ip,
    });

    sendSuccess(res, {
      token,
      userId: user.id,
      emailVerified: user.email_verified === 1,
      phoneVerified: user.phone_verified === 1,
    });
  } catch (error) {
    console.error('❌ Login error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
      timestamp: new Date().toISOString(),
    });

    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

// Password reset request
router.post('/forgot-password', passwordResetLimiter, validatePasswordReset, async (req, res) => {
  try {
    const { email } = req.body;

    console.log('🔐 Password reset request for:', email);

    const token = await generatePasswordResetToken(email);

    if (!token) {
      console.log('⚠️ Password reset requested for non-existent user');
    } else {
      const emailSent = await sendPasswordResetEmail(email, token);
      if (!emailSent) {
        console.log('❌ Failed to send password reset email');
      }
    }

    console.log('✅ Password reset email sent successfully');
    sendSuccess(res, {
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('❌ Password reset request error:', error);
    throw error;
  }
});

// Validate reset token
router.post('/validate-reset-token', passwordResetLimiter, async (req, res) => {
  try {
    const { token } = req.body;

    console.log('🔍 Validating reset token');

    if (!token) {
      return sendError(res, 'Token is required', StatusCodes.BAD_REQUEST);
    }

    const userId = await validatePasswordResetToken(token);

    if (!userId) {
      return sendError(res, 'Invalid or expired token', StatusCodes.BAD_REQUEST);
    }

    console.log('✅ Reset token is valid');
    sendSuccess(res, { valid: true });
  } catch (error) {
    console.error('❌ Token validation error:', error);
    throw error;
  }
});

// Reset password
router.post(
  '/reset-password',
  passwordResetLimiter,
  validatePasswordResetConfirm,
  async (req, res) => {
    try {
      const { token, password } = req.body;

      console.log('🔐 Password reset attempt');

      const userId = await validatePasswordResetToken(token);

      if (!userId) {
        return sendError(res, 'Invalid or expired token', StatusCodes.BAD_REQUEST);
      }

      const passwordHash = await hashPassword(password);

      await db
        .updateTable('users')
        .set({
          password_hash: passwordHash,
          updated_at: new Date().toISOString(),
        })
        .where('id', '=', userId)
        .execute();

      await markTokenAsUsed(token);

      console.log('✅ Password reset successful for user:', userId);
      sendSuccess(res, { message: 'Password reset successfully' });
    } catch (error) {
      console.error('❌ Password reset error:', error);
      throw error;
    }
  }
);

// Email verification endpoints
router.post(
  '/send-email-verification',
  emailLimiter,
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const userId = validateAuthUser(req.userId);

      console.log('📧 Email verification request from user:', userId);

      const success = await resendEmailVerification(userId);

      if (!success) {
        return sendError(res, 'Failed to send verification email', StatusCodes.BAD_REQUEST);
      }

      console.log('✅ Email verification sent successfully');
      sendSuccess(res, { message: 'Verification email sent successfully' });
    } catch (error) {
      console.error('❌ Email verification send error:', error);
      if (error.message === ErrorMessages.INVALID_TOKEN) {
        return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
      }
      throw error;
    }
  }
);

router.post('/verify-email', validateEmailVerification, async (req, res) => {
  try {
    const { token } = req.body;

    console.log('🔍 Email verification attempt');

    const userId = await validateEmailVerificationToken(token);

    if (!userId) {
      return sendError(res, 'Invalid or expired verification token', StatusCodes.BAD_REQUEST);
    }

    await markEmailAsVerified(userId);
    await markEmailVerificationTokenAsUsed(token);

    console.log('✅ Email verified successfully for user:', userId);
    sendSuccess(res, { message: 'Email verified successfully' });
  } catch (error) {
    console.error('❌ Email verification error:', error);
    throw error;
  }
});

// Phone verification endpoints
router.post(
  '/send-phone-verification',
  phoneLimiter,
  authenticateToken,
  validatePhoneVerification,
  async (req: AuthRequest, res) => {
    try {
      const userId = validateAuthUser(req.userId);
      const { phone } = req.body;

      console.log('📱 Phone verification request from user:', userId);

      const code = await generatePhoneVerificationToken(userId, phone);

      if (!code) {
        return sendError(res, 'Failed to generate verification code', StatusCodes.BAD_REQUEST);
      }

      const success = await sendPhoneVerification(phone, code);

      if (!success) {
        return sendError(res, 'Failed to send verification SMS', StatusCodes.INTERNAL_ERROR);
      }

      console.log('✅ Phone verification code sent successfully');
      sendSuccess(res, {
        message: 'Verification code sent to your phone',
        expiresIn: '10 minutes',
      });
    } catch (error) {
      console.error('❌ Phone verification send error:', error);
      if (error.message === ErrorMessages.INVALID_TOKEN) {
        return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
      }
      sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
    }
  }
);

router.post(
  '/verify-phone',
  phoneLimiter,
  authenticateToken,
  validatePhoneVerificationConfirm,
  async (req: AuthRequest, res) => {
    try {
      const userId = validateAuthUser(req.userId);
      const { phone, code } = req.body;

      console.log('🔍 Phone verification attempt for user:', userId);

      const isValid = await validatePhoneVerificationCode(userId, phone, code);

      if (!isValid) {
        return sendError(res, 'Invalid or expired verification code', StatusCodes.BAD_REQUEST);
      }

      await markPhoneAsVerified(userId, phone);
      await markPhoneVerificationTokenAsUsed(userId);

      console.log('✅ Phone verified successfully for user:', userId);
      sendSuccess(res, { message: 'Phone verified successfully' });
    } catch (error) {
      console.error('❌ Phone verification error:', error);
      if (error.message === ErrorMessages.INVALID_TOKEN) {
        return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
      }
      sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
    }
  }
);

// 2FA endpoints
router.post('/2fa/setup', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);

    console.log('🔐 2FA setup request from user:', userId);

    const user = await db
      .selectFrom('users')
      .select(['username'])
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      return sendError(res, ErrorMessages.USER_NOT_FOUND, StatusCodes.NOT_FOUND);
    }

    const result = await generate2FASecret(userId, user.username);

    if (!result) {
      return sendError(res, 'Failed to generate 2FA secret', StatusCodes.INTERNAL_ERROR);
    }

    console.log('✅ 2FA setup data generated successfully');
    sendSuccess(res, {
      secret: result.secret,
      qrCode: result.qrCode,
      message: 'Scan the QR code with your authenticator app',
    });
  } catch (error) {
    console.error('❌ 2FA setup error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

router.post('/2fa/enable', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { code } = req.body;

    console.log('🔒 2FA enable request from user:', userId);

    if (!code || code.length !== 6) {
      return sendError(res, 'Please provide a 6-digit verification code', StatusCodes.BAD_REQUEST);
    }

    const success = await enable2FA(userId, code);

    if (!success) {
      return sendError(
        res,
        'Invalid verification code. Please try again.',
        StatusCodes.BAD_REQUEST
      );
    }

    console.log('✅ 2FA enabled successfully for user:', userId);
    sendSuccess(res, { message: 'Two-factor authentication enabled successfully' });
  } catch (error) {
    console.error('❌ 2FA enable error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

router.post('/2fa/disable', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { code } = req.body;

    console.log('🔓 2FA disable request from user:', userId);

    if (!code || code.length !== 6) {
      return sendError(res, 'Please provide a 6-digit verification code', StatusCodes.BAD_REQUEST);
    }

    const success = await disable2FA(userId, code);

    if (!success) {
      return sendError(
        res,
        'Invalid verification code. Please try again.',
        StatusCodes.BAD_REQUEST
      );
    }

    console.log('✅ 2FA disabled successfully for user:', userId);
    sendSuccess(res, { message: 'Two-factor authentication disabled successfully' });
  } catch (error) {
    console.error('❌ 2FA disable error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

router.post('/2fa/verify', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);
    const { code } = req.body;

    console.log('🔍 2FA verification request from user:', userId);

    if (!code || typeof code !== 'string' || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return sendError(
        res,
        'Please provide a valid 6-digit numeric verification code',
        StatusCodes.BAD_REQUEST
      );
    }

    const isValid = await verify2FACode(userId, code);

    sendSuccess(res, {
      valid: isValid,
      message: isValid ? 'Code verified successfully' : 'Invalid verification code',
    });
  } catch (error) {
    console.error('❌ 2FA verification error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

router.get('/2fa/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = validateAuthUser(req.userId);

    const status = await get2FAStatus(userId);

    sendSuccess(res, status);
  } catch (error) {
    console.error('❌ 2FA status error:', error);
    if (error.message === ErrorMessages.INVALID_TOKEN) {
      return sendError(res, ErrorMessages.INVALID_TOKEN, StatusCodes.UNAUTHORIZED);
    }
    sendError(res, ErrorMessages.INTERNAL_ERROR, StatusCodes.INTERNAL_ERROR);
  }
});

export default router;
