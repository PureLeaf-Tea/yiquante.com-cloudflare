import type { AuthUser } from '@/lib/auth';
// GET/PUT /api/products/[id]/layout — 详情页拖拽布局（05 号文档 §五）
// layoutJson：7 个区块的顺序和显隐（需登录）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, productPageLayouts } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

async function productExists(id: string) {
  const rows = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
  return rows.length > 0;
}

// GET：读取布局
export const GET = withAuth(async (_req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  if (!(await productExists(params.id))) return fail('产品不存在', 404);

  const rows = await db.select().from(productPageLayouts).where(eq(productPageLayouts.productId, params.id)).limit(1);
  return ok({ layoutJson: rows[0]?.layoutJson ?? '[]' });
});

// PUT：保存布局（upsert：没有就建，有就更新）
export const PUT = withAuth(async (req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  const parsed = await parseBody(z.object({ layoutJson: z.string().min(2) }), req);
  if ('error' in parsed) return parsed.error;

  // 校验 JSON 合法性
  try {
    JSON.parse(parsed.data.layoutJson);
  } catch {
    return fail('layoutJson 不是合法 JSON', 400);
  }

  if (!(await productExists(params.id))) return fail('产品不存在', 404);

  const existing = await db.select().from(productPageLayouts).where(eq(productPageLayouts.productId, params.id)).limit(1);
  if (existing[0]) {
    await db
      .update(productPageLayouts)
      .set({ layoutJson: parsed.data.layoutJson, updatedAt: new Date() })
      .where(eq(productPageLayouts.productId, params.id));
  } else {
    await db.insert(productPageLayouts).values({
      productId: params.id,
      layoutJson: parsed.data.layoutJson,
      updatedAt: new Date(),
    });
  }

  await logOperation(auth, 'update', 'product_layout', params.id);
  return ok(null);
});
