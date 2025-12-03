/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Beta User Management Module
 * Handles waitlist signups, invite codes, and beta user management
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../database.js';
import { authenticateToken, AuthRequest } from '../auth.js';
import { sendSuccess, sendError } from '../utils/responseHelpers.js';
import { sql } from 'kysely';

const router = Router();

// Types for beta user management
export interface WaitlistEntry {
  id?: number;
  email: string;
  name?: string;
  referral_source?: string;
  interest_areas?: string;
  status: 'pending' | 'approved' | 'invited' | 'registered';
  invite_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InviteCode {
  id?: number;
  code: string;
  created_by?: number;
  max_uses: number;
  current_uses: number;
  expires_at?: string;
  is_active: boolean;
  created_at?: string;
}

/**
 * Generate a unique invite code
 */
function generateInviteCode(prefix: string = 'GLX'): string {
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${randomPart}`;
}

/**
 * Initialize beta user management tables
 */
export async function initializeBetaUserTables(): Promise<void> {
  try {
    console.log('🔧 Initializing beta user management tables...');

    // Create waitlist table
    await db.schema
      .createTable('waitlist')
      .ifNotExists()
      .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
      .addColumn('email', 'varchar(255)', col => col.notNull().unique())
      .addColumn('name', 'varchar(255)')
      .addColumn('referral_source', 'varchar(100)')
      .addColumn('interest_areas', 'text')
      .addColumn('status', 'varchar(20)', col => col.defaultTo('pending'))
      .addColumn('invite_code', 'varchar(50)')
      .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Create invite codes table
    await db.schema
      .createTable('invite_codes')
      .ifNotExists()
      .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
      .addColumn('code', 'varchar(50)', col => col.notNull().unique())
      .addColumn('created_by', 'integer', col => col.references('users.id'))
      .addColumn('max_uses', 'integer', col => col.defaultTo(1))
      .addColumn('current_uses', 'integer', col => col.defaultTo(0))
      .addColumn('expires_at', 'datetime')
      .addColumn('is_active', 'integer', col => col.defaultTo(1))
      .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    console.log('✅ Beta user management tables initialized');
  } catch (error) {
    console.error('❌ Failed to initialize beta user tables:', error);
    throw error;
  }
}

/**
 * Join waitlist endpoint
 * POST /api/beta/waitlist
 */
router.post('/waitlist', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name, referralSource, interestAreas } = req.body;

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      sendError(res, 'Valid email is required', 400);
      return;
    }

    // Check if email is already on waitlist
    const existing = await db
      .selectFrom('waitlist' as any)
      .select('id')
      .where('email', '=', email.toLowerCase())
      .executeTakeFirst();

    if (existing) {
      sendError(res, 'Email is already on the waitlist', 409);
      return;
    }

    // Add to waitlist
    const result = await db
      .insertInto('waitlist' as any)
      .values({
        email: email.toLowerCase(),
        name: name || null,
        referral_source: referralSource || null,
        interest_areas: interestAreas ? JSON.stringify(interestAreas) : null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    console.log(`✅ New waitlist signup: ${email}`);

    sendSuccess(res, {
      message: 'Successfully joined the waitlist!',
      position: result[0]?.insertId || 0,
    }, { statusCode: 201 });
  } catch (error) {
    console.error('❌ Waitlist signup error:', error);
    sendError(res, 'Failed to join waitlist', 500);
  }
});

/**
 * Check waitlist status by email
 * GET /api/beta/waitlist/status
 */
router.get('/waitlist/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      sendError(res, 'Email is required', 400);
      return;
    }

    const entry = await db
      .selectFrom('waitlist' as any)
      .select(['id', 'status', 'invite_code', 'created_at'])
      .where('email', '=', email.toLowerCase())
      .executeTakeFirst();

    if (!entry) {
      sendError(res, 'Email not found on waitlist', 404);
      return;
    }

    sendSuccess(res, {
      status: entry.status,
      hasInvite: !!entry.invite_code,
      inviteCode: entry.status === 'invited' ? entry.invite_code : undefined,
      joinedAt: entry.created_at,
    });
  } catch (error) {
    console.error('❌ Waitlist status error:', error);
    sendError(res, 'Failed to check waitlist status', 500);
  }
});

/**
 * Validate invite code
 * POST /api/beta/invite/validate
 */
router.post('/invite/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      sendError(res, 'Invite code is required', 400);
      return;
    }

    const invite = await db
      .selectFrom('invite_codes' as any)
      .select(['id', 'code', 'max_uses', 'current_uses', 'expires_at', 'is_active'])
      .where('code', '=', code.toUpperCase())
      .executeTakeFirst();

    if (!invite) {
      sendError(res, 'Invalid invite code', 404);
      return;
    }

    // Check if code is active
    if (!invite.is_active) {
      sendError(res, 'Invite code is no longer active', 400);
      return;
    }

    // Check if code has uses remaining
    if (invite.current_uses >= invite.max_uses) {
      sendError(res, 'Invite code has reached maximum uses', 400);
      return;
    }

    // Check if code has expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      sendError(res, 'Invite code has expired', 400);
      return;
    }

    sendSuccess(res, {
      valid: true,
      code: invite.code,
      usesRemaining: invite.max_uses - invite.current_uses,
    });
  } catch (error) {
    console.error('❌ Invite validation error:', error);
    sendError(res, 'Failed to validate invite code', 500);
  }
});

/**
 * Use invite code (during registration)
 * POST /api/beta/invite/use
 */
router.post('/invite/use', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, email } = req.body;

    if (!code || typeof code !== 'string') {
      sendError(res, 'Invite code is required', 400);
      return;
    }

    const invite = await db
      .selectFrom('invite_codes' as any)
      .select(['id', 'max_uses', 'current_uses', 'expires_at', 'is_active'])
      .where('code', '=', code.toUpperCase())
      .executeTakeFirst();

    if (!invite || !invite.is_active || invite.current_uses >= invite.max_uses) {
      sendError(res, 'Invalid or expired invite code', 400);
      return;
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      sendError(res, 'Invite code has expired', 400);
      return;
    }

    // Increment usage count
    await db
      .updateTable('invite_codes' as any)
      .set({ current_uses: invite.current_uses + 1 })
      .where('id', '=', invite.id)
      .execute();

    // Update waitlist entry if email is provided
    if (email) {
      await db
        .updateTable('waitlist' as any)
        .set({
          status: 'registered',
          updated_at: new Date().toISOString(),
        })
        .where('email', '=', email.toLowerCase())
        .execute();
    }

    console.log(`✅ Invite code used: ${code}`);

    sendSuccess(res, {
      success: true,
      message: 'Invite code accepted',
    });
  } catch (error) {
    console.error('❌ Invite use error:', error);
    sendError(res, 'Failed to use invite code', 500);
  }
});

// Admin endpoints (require authentication)

/**
 * Get waitlist entries (admin)
 * GET /api/beta/admin/waitlist
 */
router.get(
  '/admin/waitlist',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status, limit = '50', offset = '0' } = req.query;

      let query = db
        .selectFrom('waitlist' as any)
        .select(['id', 'email', 'name', 'status', 'invite_code', 'created_at'])
        .orderBy('created_at', 'desc')
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      if (status) {
        query = query.where('status', '=', status as string);
      }

      const entries = await query.execute();

      // Get total count
      const countResult = await db
        .selectFrom('waitlist' as any)
        .select(sql<number>`COUNT(*)`.as('count'))
        .executeTakeFirst();

      sendSuccess(res, {
        entries,
        total: countResult?.count || 0,
      });
    } catch (error) {
      console.error('❌ Admin waitlist error:', error);
      sendError(res, 'Failed to get waitlist', 500);
    }
  }
);

/**
 * Generate invite codes (admin)
 * POST /api/beta/admin/invite/generate
 */
router.post(
  '/admin/invite/generate',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { count = 1, maxUses = 1, expiresInDays, prefix = 'GLX' } = req.body;

      const codes: string[] = [];
      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      for (let i = 0; i < Math.min(count, 100); i++) {
        const code = generateInviteCode(prefix);

        await db
          .insertInto('invite_codes' as any)
          .values({
            code,
            created_by: req.userId || null,
            max_uses: maxUses,
            current_uses: 0,
            expires_at: expiresAt,
            is_active: 1,
            created_at: new Date().toISOString(),
          })
          .execute();

        codes.push(code);
      }

      console.log(`✅ Generated ${codes.length} invite codes`);

      sendSuccess(res, {
        codes,
        expiresAt,
        maxUses,
      }, { statusCode: 201 });
    } catch (error) {
      console.error('❌ Invite generation error:', error);
      sendError(res, 'Failed to generate invite codes', 500);
    }
  }
);

/**
 * Send invite to waitlist user (admin)
 * POST /api/beta/admin/waitlist/:id/invite
 */
router.post(
  '/admin/waitlist/:id/invite',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { expiresInDays = 7 } = req.body;

      // Get waitlist entry
      const entry = await db
        .selectFrom('waitlist' as any)
        .select(['id', 'email', 'status'])
        .where('id', '=', parseInt(id))
        .executeTakeFirst();

      if (!entry) {
        sendError(res, 'Waitlist entry not found', 404);
        return;
      }

      if (entry.status !== 'pending' && entry.status !== 'approved') {
        sendError(res, 'User has already been invited or registered', 400);
        return;
      }

      // Generate invite code
      const code = generateInviteCode('INV');
      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

      // Create invite code
      await db
        .insertInto('invite_codes' as any)
        .values({
          code,
          created_by: req.userId || null,
          max_uses: 1,
          current_uses: 0,
          expires_at: expiresAt,
          is_active: 1,
          created_at: new Date().toISOString(),
        })
        .execute();

      // Update waitlist entry
      await db
        .updateTable('waitlist' as any)
        .set({
          status: 'invited',
          invite_code: code,
          updated_at: new Date().toISOString(),
        })
        .where('id', '=', parseInt(id))
        .execute();

      console.log(`✅ Invited waitlist user: ${entry.email} with code: ${code}`);

      sendSuccess(res, {
        message: 'Invite sent successfully',
        email: entry.email,
        inviteCode: code,
        expiresAt,
      });
    } catch (error) {
      console.error('❌ Invite send error:', error);
      sendError(res, 'Failed to send invite', 500);
    }
  }
);

/**
 * Get invite code statistics (admin)
 * GET /api/beta/admin/invite/stats
 */
router.get(
  '/admin/invite/stats',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Get total codes
      const totalResult = await db
        .selectFrom('invite_codes' as any)
        .select(sql<number>`COUNT(*)`.as('count'))
        .executeTakeFirst();

      // Get active codes
      const activeResult = await db
        .selectFrom('invite_codes' as any)
        .select(sql<number>`COUNT(*)`.as('count'))
        .where('is_active', '=', 1)
        .where(eb => 
          eb.or([
            eb('expires_at', 'is', null),
            eb('expires_at', '>', new Date().toISOString()),
          ])
        )
        .executeTakeFirst();

      // Get total uses
      const usesResult = await db
        .selectFrom('invite_codes' as any)
        .select(sql<number>`SUM(current_uses)`.as('total'))
        .executeTakeFirst();

      // Get waitlist stats
      const waitlistStats = await db
        .selectFrom('waitlist' as any)
        .select([
          sql<number>`COUNT(*)`.as('total'),
          sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`.as('pending'),
          sql<number>`SUM(CASE WHEN status = 'invited' THEN 1 ELSE 0 END)`.as('invited'),
          sql<number>`SUM(CASE WHEN status = 'registered' THEN 1 ELSE 0 END)`.as('registered'),
        ])
        .executeTakeFirst();

      sendSuccess(res, {
        inviteCodes: {
          total: totalResult?.count || 0,
          active: activeResult?.count || 0,
          totalUses: usesResult?.total || 0,
        },
        waitlist: {
          total: waitlistStats?.total || 0,
          pending: waitlistStats?.pending || 0,
          invited: waitlistStats?.invited || 0,
          registered: waitlistStats?.registered || 0,
        },
      });
    } catch (error) {
      console.error('❌ Invite stats error:', error);
      sendError(res, 'Failed to get statistics', 500);
    }
  }
);

export default router;
