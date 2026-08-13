import type { AuthUser } from '@/lib/auth';
// PUT /api/categories/[id]/sort — 分类排序（05 号文档 §二）
// direction: up / down，在同级分类间交换 sortOrder
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const sortSchema = z.object({
  direction: z.enum(['up', 'down']),
});

export const PUT = withAuth(async (req: NextRequest, { params }: { params: { id: string } }, auth: AuthUser) => {

  const parsed = await parseBody(sortSchema, req);
  if ('error' in parsed) return parsed.error;

  const rows = await db.select().from(categories).where(eq(categories.id, params.id)).limit(1);
  const current = rows[0];
  if (!current) return fail('分类不存在', 404);

  // 找同级相邻分类（同 parentId，按 sortOrder 排序）
  const siblings = await db
    .select()
    .from(categories)
    .where(current.parentId ? eq(categories.parentId, current.parentId) : isNull(categories.parentId))
    .orderBy(categories.sortOrder);

  const index = siblings.findIndex((s) => s.id === current.id);
  const swapWith = parsed.data.direction === 'up' ? siblings[index - 1] : siblings[index + 1];
  if (!swapWith) return fail('已在边界，无法继续移动', 400);

  // 交换两者的 sortOrder（若相同则错开 1）
  const a = current.sortOrder;
  const b = swapWith.sortOrder === a ? a + (parsed.data.direction === 'up' ? -1 : 1) : swapWith.sortOrder;
  await db.update(categories).set({ sortOrder: b, updatedAt: new Date() }).where(eq(categories.id, current.id));
  await db.update(categories).set({ sortOrder: a, updatedAt: new Date() }).where(eq(categories.id, swapWith.id));

  await logOperation(auth, 'update', 'category', current.id, `sort ${parsed.data.direction}`);
  return ok({ id: current.id, sortOrder: b });
});
