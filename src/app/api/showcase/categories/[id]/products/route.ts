// /api/showcase/categories/[id]/products（05 号文档 §3.10/§3.11）
// GET：公开，需 X-B2B-Token 头（[id] 位传 categorySlug）
// POST/DELETE：仅 admin，管理分类下的产品关联
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { showcaseCategories, showcaseProducts, products } from '@/drizzle/schema';
import { ok, fail, parseBody, rateLimitPublic, requireUser, isFail, logOperation, getPagination } from '@/lib/api-helpers';
import { verifyShowcaseToken } from '@/lib/b2b';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

// 按 slug 或 id 找 B2B 分类（先查 slug；是 uuid 格式才查 id 列，避免 PG 类型错误）
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findCategory(key: string) {
  const bySlug = await db
    .select()
    .from(showcaseCategories)
    .where(eq(showcaseCategories.slug, key))
    .limit(1);
  if (bySlug[0]) return bySlug[0];
  if (UUID_RE.test(key)) {
    const byId = await db
      .select()
      .from(showcaseCategories)
      .where(eq(showcaseCategories.id, key))
      .limit(1);
    return byId[0];
  }
  return undefined;
}

// GET：B2B 分类产品列表（需有效 token，分页默认 25）
export async function GET(req: NextRequest, { params }: RouteContext) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const category = await findCategory(params.id);
  if (!category || !category.isActive) return fail('B2B 分类不存在', 404);

  // token 校验（X-B2B-Token 头）
  const token = req.headers.get('x-b2b-token') || '';
  if (!(await verifyShowcaseToken(category.id, token))) {
    return fail('Token无效或已过期', 401);
  }

  const { page, pageSize, offset } = getPagination(req);
  const locale = req.nextUrl.searchParams.get('locale') || 'en';

  // 关联表 + 产品表连接查询（按关联表 sortOrder 排序）
  const rows = await db
    .select({
      id: products.id,
      nameZh: products.nameZh,
      nameEn: products.nameEn,
      slug: products.slug,
      priceCNY: products.priceCNY,
      priceUSD: products.priceUSD,
      spec: products.spec,
      showPriceInShowcase: products.showPriceInShowcase,
      image: sql<string | null>`(SELECT url FROM product_images WHERE product_id = ${products.id} ORDER BY sort_order LIMIT 1)`,
    })
    .from(showcaseProducts)
    .innerJoin(products, eq(showcaseProducts.productId, products.id))
    .where(and(eq(showcaseProducts.showcaseCategoryId, category.id), eq(products.status, 'active')))
    .orderBy(showcaseProducts.sortOrder)
    .limit(pageSize)
    .offset(offset);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(showcaseProducts)
    .innerJoin(products, eq(showcaseProducts.productId, products.id))
    .where(and(eq(showcaseProducts.showcaseCategoryId, category.id), eq(products.status, 'active')));

  const data = rows.map((r) => ({
    id: r.id,
    nameZh: r.nameZh,
    nameEn: r.nameEn,
    // 展示区默认语言决定显示名（locale 为 zh 用中文名，其余用英文名）
    displayName: locale === 'zh' ? r.nameZh : r.nameEn,
    slug: r.slug,
    thumbnail: r.image,
    // 产品级开关：关闭时展示区不显示价格
    priceCNY: r.showPriceInShowcase ? r.priceCNY : null,
    priceUSD: r.showPriceInShowcase ? r.priceUSD : null,
    spec: r.spec,
  }));

  return ok(data, { total: countRows[0]?.count || 0, page, pageSize });
}

// POST：添加产品到展示区分类（admin）
export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;

  const parsed = await parseBody(
    z.object({
      productId: z.string().uuid(),
      showcaseLocale: z.string().max(10).optional().nullable(),
      sortOrder: z.number().int().optional(),
    }),
    req
  );
  if ('error' in parsed) return parsed.error;

  const category = await findCategory(params.id);
  if (!category) return fail('B2B 分类不存在', 404);

  const productExists = await db.select({ id: products.id }).from(products).where(eq(products.id, parsed.data.productId)).limit(1);
  if (!productExists[0]) return fail('产品不存在', 404);

  // 唯一约束（product_id + showcase_category_id）冲突时提示
  const dup = await db
    .select({ id: showcaseProducts.id })
    .from(showcaseProducts)
    .where(
      and(eq(showcaseProducts.productId, parsed.data.productId), eq(showcaseProducts.showcaseCategoryId, category.id))
    )
    .limit(1);
  if (dup[0]) return fail('该产品已在此展示区分类中', 400);

  const rows = await db
    .insert(showcaseProducts)
    .values({
      productId: parsed.data.productId,
      showcaseCategoryId: category.id,
      showcaseLocale: parsed.data.showcaseLocale ?? null,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning();

  await logOperation(auth, 'create', 'showcase_product', rows[0].id, `${category.nameZh} <- ${parsed.data.productId}`);
  return ok(rows[0]);
}

// DELETE：从展示区分类移除产品（admin；产品本身不删）
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;

  const parsed = await parseBody(z.object({ productId: z.string().uuid() }), req);
  if ('error' in parsed) return parsed.error;

  const category = await findCategory(params.id);
  if (!category) return fail('B2B 分类不存在', 404);

  await db
    .delete(showcaseProducts)
    .where(
      and(eq(showcaseProducts.productId, parsed.data.productId), eq(showcaseProducts.showcaseCategoryId, category.id))
    );

  await logOperation(auth, 'delete', 'showcase_product', category.id, parsed.data.productId);
  return ok(null);
}
