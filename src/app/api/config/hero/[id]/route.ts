import type { AuthUser } from '@/lib/auth';
// PUT/DELETE /api/config/hero/[id] — Hero 轮播图单项（阶段 17 新增，admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { heroImages } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const heroSchema = z.object({
  imageUrl: z.string().min(1).max(500).optional(),
  titleZh: z.string().max(200).optional().nullable(),
  titleEn: z.string().max(200).optional().nullable(),
  subtitleZh: z.string().max(300).optional().nullable(),
  subtitleEn: z.string().max(300).optional().nullable(),
  linkUrl: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const PUT = withAuth(async (req: NextRequest, { params }: { params: { id: string } }, auth: AuthUser) => {
  const parsed = await parseBody(heroSchema, req);
  if ('error' in parsed) return parsed.error;

  const rows = await db
    .update(heroImages)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(heroImages.id, params.id))
    .returning();
  if (!rows[0]) return fail('Hero 图不存在', 404);
  await logOperation(auth, 'update', 'hero_image', params.id);
  return ok(rows[0]);
}, ['admin']);

export const DELETE = withAuth(async (_req: NextRequest, { params }: { params: { id: string } }, auth: AuthUser) => {
  const rows = await db.delete(heroImages).where(eq(heroImages.id, params.id)).returning();
  if (!rows[0]) return fail('Hero 图不存在', 404);
  await logOperation(auth, 'delete', 'hero_image', params.id);
  return ok({ deleted: true });
}, ['admin']);
