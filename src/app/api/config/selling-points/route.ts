import type { AuthUser } from '@/lib/auth';
// GET/POST /api/config/selling-points — 卖点管理（阶段 17 新增，admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sellingPoints } from '@/drizzle/schema';
import { ok, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export const GET = withAuth(async () => {
  const rows = await db.select().from(sellingPoints);
  return ok(rows.sort((a, b) => a.sortOrder - b.sortOrder));
}, ['admin', 'editor']);

const spSchema = z.object({
  icon: z.string().max(50).optional().nullable(),
  titleZh: z.string().min(1).max(100),
  titleEn: z.string().min(1).max(100),
  descriptionZh: z.string().max(500).optional().nullable(),
  descriptionEn: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const POST = withAuth(async (req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {
  const parsed = await parseBody(spSchema, req);
  if ('error' in parsed) return parsed.error;
  const rows = await db.insert(sellingPoints).values({ ...parsed.data, updatedAt: new Date() }).returning();
  await logOperation(auth, 'create', 'selling_point', rows[0].id, parsed.data.titleZh);
  return ok(rows[0]);
}, ['admin']);
