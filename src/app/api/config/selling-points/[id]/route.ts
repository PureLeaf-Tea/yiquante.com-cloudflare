import type { AuthUser } from '@/lib/auth';
// PUT/DELETE /api/config/selling-points/[id] — 卖点单项（阶段 17 新增，admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sellingPoints } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const spSchema = z.object({
  icon: z.string().max(50).optional().nullable(),
  titleZh: z.string().min(1).max(100).optional(),
  titleEn: z.string().min(1).max(100).optional(),
  descriptionZh: z.string().max(500).optional().nullable(),
  descriptionEn: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const PUT = withAuth(async (req: NextRequest, { params }: { params: { id: string } }, auth: AuthUser) => {
  const parsed = await parseBody(spSchema, req);
  if ('error' in parsed) return parsed.error;
  const rows = await db
    .update(sellingPoints)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(sellingPoints.id, params.id))
    .returning();
  if (!rows[0]) return fail('卖点不存在', 404);
  await logOperation(auth, 'update', 'selling_point', params.id);
  return ok(rows[0]);
}, ['admin']);

export const DELETE = withAuth(async (_req: NextRequest, { params }: { params: { id: string } }, auth: AuthUser) => {
  const rows = await db.delete(sellingPoints).where(eq(sellingPoints.id, params.id)).returning();
  if (!rows[0]) return fail('卖点不存在', 404);
  await logOperation(auth, 'delete', 'selling_point', params.id);
  return ok({ deleted: true });
}, ['admin']);
