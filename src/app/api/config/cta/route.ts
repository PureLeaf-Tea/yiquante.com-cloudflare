import type { AuthUser } from '@/lib/auth';
// GET/POST /api/config/cta — CTA 按钮管理（阶段 17 新增，admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ctaButtons } from '@/drizzle/schema';
import { ok, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export const GET = withAuth(async () => {
  const rows = await db.select().from(ctaButtons);
  return ok(rows.sort((a, b) => a.sortOrder - b.sortOrder));
}, ['admin', 'editor']);

const ctaSchema = z.object({
  textZh: z.string().min(1).max(100),
  textEn: z.string().min(1).max(100),
  linkUrl: z.string().min(1).max(500),
  variant: z.enum(['light', 'outline']).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const POST = withAuth(async (req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {
  const parsed = await parseBody(ctaSchema, req);
  if ('error' in parsed) return parsed.error;
  const rows = await db.insert(ctaButtons).values({ ...parsed.data, updatedAt: new Date() }).returning();
  await logOperation(auth, 'create', 'cta_button', rows[0].id, parsed.data.textZh);
  return ok(rows[0]);
}, ['admin']);
