import type { AuthUser } from '@/lib/auth';
// GET/PUT/DELETE /api/categories/[id]（05 号文档 §二）
// DELETE 规则（04 §7.1）：受保护分类禁删；子分类上移一级；产品移入"00 未分类"
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories, products } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

// GET：单个分类（公开；E1：Next 15 起 ctx.params 为 Promise）
export async function GET(_req: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;
  const rows = await db.select().from(categories).where(eq(categories.id, params.id)).limit(1);
  if (!rows[0]) return fail('分类不存在', 404);
  return ok(rows[0]);
}

const updateSchema = z.object({
  nameZh: z.string().min(1).max(50).optional(),
  nameEn: z.string().min(1).max(50).optional(),
  image: z.string().max(500).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

// PUT：编辑分类（需登录）
export const PUT = withAuth(async (req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  const parsed = await parseBody(updateSchema, req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  const existing = await db.select().from(categories).where(eq(categories.id, params.id)).limit(1);
  if (!existing[0]) return fail('分类不存在', 404);

  // 防止把分类挂到自己或自己的子孙下（会造成循环）
  if (body.parentId === params.id) return fail('不能把分类移动到自身之下', 400);

  const rows = await db
    .update(categories)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(categories.id, params.id))
    .returning();

  await logOperation(auth, 'update', 'category', params.id);
  return ok(rows[0]);
});

// DELETE：删除分类（需登录；产品移入"00 未分类"）
export const DELETE = withAuth(async (_req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  const existing = await db.select().from(categories).where(eq(categories.id, params.id)).limit(1);
  const target = existing[0];
  if (!target) return fail('分类不存在', 404);
  if (target.isProtected) return fail('受保护分类不可删除', 403);

  // 收集该分类及其全部子孙分类 ID（广度优先）
  const all = await db.select().from(categories);
  const subtreeIds = new Set<string>([target.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of all) {
      if (c.parentId && subtreeIds.has(c.parentId) && !subtreeIds.has(c.id)) {
        subtreeIds.add(c.id);
        grew = true;
      }
    }
  }
  const idList = [...subtreeIds];

  // "00 未分类"（isProtected=true 的安全阀分类）
  const uncategorized = await db.select().from(categories).where(eq(categories.isProtected, true)).limit(1);
  const safeCategoryId = uncategorized[0]?.id;

  // 产品移入"00 未分类"（若无安全阀分类则拒绝删除，保护数据）
  if (!safeCategoryId) return fail('系统缺少"00 未分类"安全阀分类，无法安全删除', 400);
  for (const cid of idList) {
    await db.update(products).set({ categoryId: safeCategoryId, updatedAt: new Date() }).where(eq(products.categoryId, cid));
  }

  // 子分类上移一级（挂到被删分类的父级），再删除本分类
  await db.update(categories).set({ parentId: target.parentId, updatedAt: new Date() }).where(eq(categories.parentId, target.id));
  await db.delete(categories).where(eq(categories.id, target.id));

  await logOperation(auth, 'delete', 'category', params.id, target.nameZh);
  return ok({ id: params.id, productsMovedTo: safeCategoryId });
});
