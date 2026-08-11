// PUT /api/showcase/categories/[id]/products/sort — 批量排序（05 号文档 §3.11，admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { showcaseCategories, showcaseProducts } from '@/drizzle/schema';
import { ok, fail, parseBody, requireUser, isFail, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;

  const parsed = await parseBody(z.object({ productIds: z.array(z.string().uuid()).min(1) }), req);
  if ('error' in parsed) return parsed.error;

  const rows = await db.select().from(showcaseCategories).where(eq(showcaseCategories.id, params.id)).limit(1);
  if (!rows[0]) return fail('B2B 分类不存在', 404);

  // 按传入顺序依次设置 sortOrder（0,1,2...）
  let order = 0;
  for (const productId of parsed.data.productIds) {
    await db
      .update(showcaseProducts)
      .set({ sortOrder: order++ })
      .where(and(eq(showcaseProducts.productId, productId), eq(showcaseProducts.showcaseCategoryId, params.id)));
  }

  await logOperation(auth, 'update', 'showcase_products_sort', params.id);
  return ok(null);
}
