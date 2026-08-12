// PUT/DELETE /api/search-keywords/[id] — 搜索关键词单项（阶段 17 新增，admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { searchKeywords } from '@/drizzle/schema';
import { ok, fail, parseBody, requireUser, isFail, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const kwSchema = z.object({
  keyword: z.string().min(1).max(100).optional(),
  targetPath: z.string().min(1).max(200).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;
  const parsed = await parseBody(kwSchema, req);
  if ('error' in parsed) return parsed.error;

  const rows = await db
    .update(searchKeywords)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(searchKeywords.id, params.id))
    .returning();
  if (!rows[0]) return fail('关键词不存在', 404);
  await logOperation(auth, 'update', 'search_keyword', params.id, rows[0].keyword);
  return ok(rows[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;
  const rows = await db.delete(searchKeywords).where(eq(searchKeywords.id, params.id)).returning();
  if (!rows[0]) return fail('关键词不存在', 404);
  await logOperation(auth, 'delete', 'search_keyword', params.id, rows[0].keyword);
  return ok({ deleted: true });
}
