import type { AuthUser } from '@/lib/auth';
// GET/PUT/DELETE /api/showcase/categories/[id]（05 号文档 §3.2/§3.4/§3.5，全部仅 admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { showcaseCategories, showcaseProducts } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

// GET：单个 B2B 分类详情（admin，不含密码）
export const GET = withAuth(async (_req: NextRequest, { params }: RouteContext) => {

  const rows = await db.select().from(showcaseCategories).where(eq(showcaseCategories.id, params.id)).limit(1);
  if (!rows[0]) return fail('B2B 分类不存在', 404);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(showcaseProducts)
    .where(eq(showcaseProducts.showcaseCategoryId, params.id));

  const c = rows[0];
  return ok({
    id: c.id,
    nameZh: c.nameZh,
    nameEn: c.nameEn,
    slug: c.slug,
    image: c.image,
    descriptionZh: c.descriptionZh,
    descriptionEn: c.descriptionEn,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    parentId: c.parentId,
    productCount: countRows[0]?.count || 0,
  });
}, ['admin']);

const updateSchema = z.object({
  nameZh: z.string().min(1).max(50).optional(),
  nameEn: z.string().min(1).max(50).optional(),
  image: z.string().max(500).optional().nullable(),
  descriptionZh: z.string().max(2000).optional().nullable(),
  descriptionEn: z.string().max(2000).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  parentId: z.string().uuid().optional().nullable(),
});

// PUT：编辑 B2B 分类（admin；密码不在此处修改，走 password 端点）
export const PUT = withAuth(async (req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  const parsed = await parseBody(updateSchema, req);
  if ('error' in parsed) return parsed.error;

  const existing = await db.select().from(showcaseCategories).where(eq(showcaseCategories.id, params.id)).limit(1);
  if (!existing[0]) return fail('B2B 分类不存在', 404);

  const rows = await db
    .update(showcaseCategories)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(showcaseCategories.id, params.id))
    .returning();

  await logOperation(auth, 'update', 'showcase_category', params.id);
  return ok(rows[0]);
}, ['admin']);

// DELETE：删除 B2B 分类（admin；关联记录删除，产品本身保留 — 04 §9.6）
export const DELETE = withAuth(async (_req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  const existing = await db.select().from(showcaseCategories).where(eq(showcaseCategories.id, params.id)).limit(1);
  if (!existing[0]) return fail('B2B 分类不存在', 404);

  // showcase_products 外键 onDelete=cascade，自动清理关联；产品不删
  await db.delete(showcaseCategories).where(eq(showcaseCategories.id, params.id));

  await logOperation(auth, 'delete', 'showcase_category', params.id, existing[0].nameZh);
  return ok({ id: params.id });
}, ['admin']);
