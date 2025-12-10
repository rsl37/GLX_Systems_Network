/*
 * Copyright (c) 2025 GLX Civic Networking App
 *
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

/**
 * Community Links Management Module
 * Handles Discord, Telegram, and other community platform integrations
 */

import { Router, Request, Response } from 'express';
import { db } from '../database.js';
import { authenticateToken, AuthRequest } from '../auth.js';
import { sendSuccess, sendError } from '../utils/responseHelpers.js';
import { sql } from 'kysely';

const router = Router();

// Community platform types
export type CommunityPlatform = 'discord' | 'telegram' | 'twitter' | 'github' | 'youtube' | 'website' | 'forum' | 'other';

export interface CommunityLink {
  id?: number;
  platform: CommunityPlatform;
  name: string;
  url: string;
  description?: string;
  icon_url?: string;
  member_count?: number;
  is_primary: boolean;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

// Default community links (configurable via environment)
const DEFAULT_COMMUNITY_LINKS: Omit<CommunityLink, 'id'>[] = [
  {
    platform: 'discord',
    name: 'GLX Community Discord',
    url: process.env.COMMUNITY_DISCORD_URL || 'https://discord.gg/glx-civic',
    description: 'Join our Discord server for real-time discussions, support, and community events.',
    is_primary: true,
    is_active: true,
    display_order: 1,
  },
  {
    platform: 'telegram',
    name: 'GLX Telegram',
    url: process.env.COMMUNITY_TELEGRAM_URL || 'https://t.me/glxcivic',
    description: 'Follow us on Telegram for announcements and quick updates.',
    is_primary: true,
    is_active: true,
    display_order: 2,
  },
  {
    platform: 'twitter',
    name: 'GLX on Twitter/X',
    url: process.env.COMMUNITY_TWITTER_URL || 'https://twitter.com/glxcivic',
    description: 'Follow us on Twitter for the latest news and announcements.',
    is_primary: false,
    is_active: true,
    display_order: 3,
  },
  {
    platform: 'github',
    name: 'GLX GitHub',
    url: 'https://github.com/rsl37/GLX_Civic_Networking_App',
    description: 'Contribute to our open-source civic networking platform.',
    is_primary: false,
    is_active: true,
    display_order: 4,
  },
];

/**
 * Initialize community links table
 */
export async function initializeCommunityLinksTable(): Promise<void> {
  try {
    console.log('🔧 Initializing community links table...');

    // Create community_links table
    await db.schema
      .createTable('community_links')
      .ifNotExists()
      .addColumn('id', 'integer', col => col.primaryKey().autoIncrement())
      .addColumn('platform', 'varchar(50)', col => col.notNull())
      .addColumn('name', 'varchar(255)', col => col.notNull())
      .addColumn('url', 'varchar(500)', col => col.notNull())
      .addColumn('description', 'text')
      .addColumn('icon_url', 'varchar(500)')
      .addColumn('member_count', 'integer')
      .addColumn('is_primary', 'integer', col => col.defaultTo(0))
      .addColumn('is_active', 'integer', col => col.defaultTo(1))
      .addColumn('display_order', 'integer', col => col.defaultTo(0))
      .addColumn('created_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'datetime', col => col.defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Check if there are any existing links
    const existingCount = await db
      .selectFrom('community_links' as any)
      .select(sql<number>`COUNT(*)`.as('count'))
      .executeTakeFirst();

    // Seed default links if table is empty
    if (!existingCount?.count || existingCount.count === 0) {
      console.log('📝 Seeding default community links...');

      for (const link of DEFAULT_COMMUNITY_LINKS) {
        await db
          .insertInto('community_links' as any)
          .values({
            ...link,
            is_primary: link.is_primary ? 1 : 0,
            is_active: link.is_active ? 1 : 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .execute();
      }

      console.log(`✅ Seeded ${DEFAULT_COMMUNITY_LINKS.length} default community links`);
    }

    console.log('✅ Community links table initialized');
  } catch (error) {
    console.error('❌ Failed to initialize community links table:', error);
    throw error;
  }
}

/**
 * Get all active community links
 * GET /api/community/links
 */
router.get('/links', async (req: Request, res: Response): Promise<void> => {
  try {
    const links = await db
      .selectFrom('community_links' as any)
      .select([
        'id',
        'platform',
        'name',
        'url',
        'description',
        'icon_url',
        'member_count',
        'is_primary',
        'display_order',
      ])
      .where('is_active', '=', 1)
      .orderBy('display_order', 'asc')
      .execute();

    sendSuccess(res, {
      links: links.map(link => ({
        ...link,
        isPrimary: !!link.is_primary,
      })),
    });
  } catch (error) {
    console.error('❌ Get community links error:', error);
    sendError(res, 'Failed to get community links', 500);
  }
});

/**
 * Get primary community links (for quick access)
 * GET /api/community/links/primary
 */
router.get('/links/primary', async (req: Request, res: Response): Promise<void> => {
  try {
    const links = await db
      .selectFrom('community_links' as any)
      .select(['id', 'platform', 'name', 'url', 'description'])
      .where('is_active', '=', 1)
      .where('is_primary', '=', 1)
      .orderBy('display_order', 'asc')
      .execute();

    sendSuccess(res, { links });
  } catch (error) {
    console.error('❌ Get primary links error:', error);
    sendError(res, 'Failed to get primary links', 500);
  }
});

/**
 * Get link by platform
 * GET /api/community/links/:platform
 */
router.get('/links/:platform', async (req: Request, res: Response): Promise<void> => {
  try {
    const { platform } = req.params;

    const link = await db
      .selectFrom('community_links' as any)
      .select(['id', 'platform', 'name', 'url', 'description', 'member_count'])
      .where('platform', '=', platform)
      .where('is_active', '=', 1)
      .executeTakeFirst();

    if (!link) {
      sendError(res, 'Community link not found', 404);
      return;
    }

    sendSuccess(res, { link });
  } catch (error) {
    console.error('❌ Get platform link error:', error);
    sendError(res, 'Failed to get community link', 500);
  }
});

// Admin endpoints

/**
 * Get all community links (including inactive) - admin
 * GET /api/community/admin/links
 */
router.get(
  '/admin/links',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const links = await db
        .selectFrom('community_links' as any)
        .selectAll()
        .orderBy('display_order', 'asc')
        .execute();

      sendSuccess(res, { links });
    } catch (error) {
      console.error('❌ Admin get links error:', error);
      sendError(res, 'Failed to get community links', 500);
    }
  }
);

/**
 * Create a new community link - admin
 * POST /api/community/admin/links
 */
router.post(
  '/admin/links',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { platform, name, url, description, iconUrl, isPrimary, displayOrder } = req.body;

      if (!platform || !name || !url) {
        sendError(res, 'Platform, name, and URL are required', 400);
        return;
      }

      const result = await db
        .insertInto('community_links' as any)
        .values({
          platform,
          name,
          url,
          description: description || null,
          icon_url: iconUrl || null,
          is_primary: isPrimary ? 1 : 0,
          is_active: 1,
          display_order: displayOrder || 99,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .execute();

      // Sanitize user input for log safety (remove newlines, wrap in quotes)
      const sanitizedName = typeof name === 'string' ? name.replace(/\r?\n/g, '') : '';
      console.log(`✅ Created community link: "${sanitizedName}"`);

      sendSuccess(res, {
        message: 'Community link created',
        id: result[0]?.insertId,
      }, { statusCode: 201 });
    } catch (error) {
      console.error('❌ Create link error:', error);
      sendError(res, 'Failed to create community link', 500);
    }
  }
);

/**
 * Update a community link - admin
 * PUT /api/community/admin/links/:id
 */
router.put(
  '/admin/links/:id',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { platform, name, url, description, iconUrl, memberCount, isPrimary, isActive, displayOrder } = req.body;

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (platform !== undefined) updateData.platform = platform;
      if (name !== undefined) updateData.name = name;
      if (url !== undefined) updateData.url = url;
      if (description !== undefined) updateData.description = description;
      if (iconUrl !== undefined) updateData.icon_url = iconUrl;
      if (memberCount !== undefined) updateData.member_count = memberCount;
      if (isPrimary !== undefined) updateData.is_primary = isPrimary ? 1 : 0;
      if (isActive !== undefined) updateData.is_active = isActive ? 1 : 0;
      if (displayOrder !== undefined) updateData.display_order = displayOrder;

      await db
        .updateTable('community_links' as any)
        .set(updateData)
        .where('id', '=', parseInt(id))
        .execute();

      console.log(`✅ Updated community link: ${String(id).replace(/\r?\n|\r/g, '')}`);

      sendSuccess(res, { message: 'Community link updated' });
    } catch (error) {
      console.error('❌ Update link error:', error);
      sendError(res, 'Failed to update community link', 500);
    }
  }
);

/**
 * Delete a community link - admin
 * DELETE /api/community/admin/links/:id
 */
router.delete(
  '/admin/links/:id',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await db
        .deleteFrom('community_links' as any)
        .where('id', '=', parseInt(id))
        .execute();

      console.log(`✅ Deleted community link: ${String(id).replace(/[\x00-\x1F\x7F]/g, '')}`);

      sendSuccess(res, { message: 'Community link deleted' });
    } catch (error) {
      console.error('❌ Delete link error:', error);
      sendError(res, 'Failed to delete community link', 500);
    }
  }
);

/**
 * Update member count for a platform - admin
 * POST /api/community/admin/links/:id/member-count
 */
router.post(
  '/admin/links/:id/member-count',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { memberCount } = req.body;

      if (typeof memberCount !== 'number') {
        sendError(res, 'Member count must be a number', 400);
        return;
      }

      await db
        .updateTable('community_links' as any)
        .set({
          member_count: memberCount,
          updated_at: new Date().toISOString(),
        })
        .where('id', '=', parseInt(id))
        .execute();

      sendSuccess(res, { message: 'Member count updated' });
    } catch (error) {
      console.error('❌ Update member count error:', error);
      sendError(res, 'Failed to update member count', 500);
    }
  }
);

export default router;
