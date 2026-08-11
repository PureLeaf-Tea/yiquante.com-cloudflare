// GET/PUT /api/config/social — 社交媒体链接（05 号文档 §十二）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { socialLinks } from '@/drizzle/schema';
import { ok, parseBody, requireUser, isFail, logOperation, rateLimitPublic } from '@/lib/api-helpers';

export const runtime = 'nodejs';

// GET：社交链接列表（公开，页脚渲染用）
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const rows = await db.select().from(socialLinks).orderBy(asc(socialLinks.sortOrder));
  return ok(rows);
}

const itemSchema = z.object({
  platform: z.string().min(1).max(30),
  labelZh: z.string().max(50).optional().nullable(),
  labelEn: z.string().max(50).optional().nullable(),
  url: z.string().min(1).max(500),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// PUT：保存社交链接（整表替换）
export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const parsed = await parseBody(z.object({ items: z.array(itemSchema).min(0).max(20) }), req);
  if ('error' in parsed) return parsed.error;

  await db.delete(socialLinks);
  let order = 0;
  for (const item of parsed.data.items) {
    await db.insert(socialLinks).values({
      ...item,
      labelZh: item.labelZh ?? null,
      labelEn: item.labelEn ?? null,
      sortOrder: item.sortOrder ?? order,
      isActive: item.isActive ?? true,
      updatedAt: new Date(),
    });
    order++;
  }

  await logOperation(auth, 'update', 'social_links');
  return ok({ count: parsed.data.items.length });
}

