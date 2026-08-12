// PUT/DELETE /api/config/cta/[id] — CTA 按钮单项（阶段 17 新增，admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ctaButtons } from '@/drizzle/schema';
import { ok, fail, parseBody, requireUser, isFail, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const ctaSchema = z.object({
  textZh: z.string().min(1).max(100).optional(),
  textEn: z.string().min(1).max(100).optional(),
  linkUrl: z.string().min(1).max(500).optional(),
  variant: z.enum(['light', 'outline']).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;
  const parsed = await parseBody(ctaSchema, req);
  if ('error' in parsed) return parsed.error;
  const rows = await db
    .update(ctaButtons)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(ctaButtons.id, params.id))
    .returning();
  if (!rows[0]) return fail('CTA 按钮不存在', 404);
  await logOperation(auth, 'update', 'cta_button', params.id);
  return ok(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;
  const rows = await db.delete(ctaButtons).where(eq(ctaButtons.id, params.id)).returning();
  if (!rows[0]) return fail('CTA 按钮不存在', 404);
  await logOperation(auth, 'delete', 'cta_button', params.id);
  return ok({ deleted: true });
}
