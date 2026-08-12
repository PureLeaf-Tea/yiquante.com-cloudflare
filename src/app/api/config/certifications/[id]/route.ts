// PUT/DELETE /api/config/certifications/[id] — 认证单项（阶段 17 新增，admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { certifications } from '@/drizzle/schema';
import { ok, fail, parseBody, requireUser, isFail, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const certSchema = z.object({
  nameZh: z.string().min(1).max(100).optional(),
  nameEn: z.string().min(1).max(100).optional(),
  imageUrl: z.string().max(500).optional().nullable(),
  linkUrl: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;
  const parsed = await parseBody(certSchema, req);
  if ('error' in parsed) return parsed.error;
  const rows = await db
    .update(certifications)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(certifications.id, params.id))
    .returning();
  if (!rows[0]) return fail('认证不存在', 404);
  await logOperation(auth, 'update', 'certification', params.id);
  return ok(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;
  const rows = await db.delete(certifications).where(eq(certifications.id, params.id)).returning();
  if (!rows[0]) return fail('认证不存在', 404);
  await logOperation(auth, 'delete', 'certification', params.id);
  return ok({ deleted: true });
}
