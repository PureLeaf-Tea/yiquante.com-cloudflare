// GET/PUT/DELETE /api/products/[id]（05 号文档 §4.2/§4.4/§4.5）
// GET：产品详情（下架产品需登录才能看，否则 404）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  products,
  productImages,
  productTranslations,
  showcaseTranslations,
  productPageLayouts,
  productVideos,
  recommendations,
  showcaseProducts,
  showcaseCategories,
  categories,
} from '@/drizzle/schema';
import { getCurrentUser } from '@/lib/auth';
import { ok, fail, parseBody, rateLimitPublic, requireUser, isFail, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

// uuid 格式判断：[id] 位可能是 uuid 也可能是 slug，不能拿 slug 直接比 uuid 列（PG 会报类型错）
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET：产品详情
export async function GET(req: NextRequest, { params }: RouteContext) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const locale = req.nextUrl.searchParams.get('locale') || 'en';

  // [id] 位支持产品 id 或 slug 两种查法（前台用 slug，后台用 id）
  let rows = UUID_RE.test(params.id)
    ? await db.select().from(products).where(eq(products.id, params.id)).limit(1)
    : [];
  if (!rows[0]) {
    rows = await db.select().from(products).where(eq(products.slug, params.id)).limit(1);
  }
  const product = rows[0];
  if (!product) return fail('产品不存在', 404);

  // ★下架产品：未登录返回 404（05 §4.2），登录后可见（后台预览）
  if (product.status !== 'active') {
    const user = await getCurrentUser();
    if (!user) return fail('产品不存在', 404);
  }

  // 并行取关联数据
  const [images, translations, showcaseTrans, layout, videos, recs, showcaseCats, catRows] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(productImages.sortOrder),
    db.select().from(productTranslations).where(eq(productTranslations.productId, product.id)),
    db.select().from(showcaseTranslations).where(eq(showcaseTranslations.productId, product.id)),
    db.select().from(productPageLayouts).where(eq(productPageLayouts.productId, product.id)).limit(1),
    db.select().from(productVideos).where(eq(productVideos.productId, product.id)).orderBy(productVideos.sortOrder),
    db.select().from(recommendations).where(eq(recommendations.productId, product.id)).orderBy(recommendations.sortOrder),
    db
      .select({ id: showcaseCategories.id, nameZh: showcaseCategories.nameZh })
      .from(showcaseProducts)
      .innerJoin(showcaseCategories, eq(showcaseProducts.showcaseCategoryId, showcaseCategories.id))
      .where(eq(showcaseProducts.productId, product.id)),
    db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1),
  ]);

  // 当前语言的描述/冲泡指南：先查翻译表，回退空串
  const trans = translations.find((t) => t.locale === locale);

  // 推荐产品详情（最多取 3 个有效产品）
  const recommended = [];
  for (const rec of recs.slice(0, 3)) {
    const recRows = await db
      .select({
        id: products.id,
        nameZh: products.nameZh,
        nameEn: products.nameEn,
        slug: products.slug,
      })
      .from(products)
      .where(eq(products.id, rec.recommendedId))
      .limit(1);
    if (recRows[0]) recommended.push(recRows[0]);
  }

  return ok({
    id: product.id,
    sku: product.sku,
    nameZh: product.nameZh,
    nameEn: product.nameEn,
    slug: product.slug,
    categoryId: product.categoryId,
    categoryName: catRows[0]?.nameZh ?? null,
    priceCNY: product.priceCNY,
    priceUSD: product.priceUSD,
    spec: product.spec,
    status: product.status,
    images: images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, sortOrder: i.sortOrder })),
    description: trans?.description ?? '',
    brewingGuide: trans?.brewingGuide ?? '',
    ogTitle: product.ogTitle,
    ogDescription: product.ogDescription,
    ogImage: product.ogImage,
    seoTitle: product.seoTitle,
    seoDesc: product.seoDesc,
    seoKeywords: product.seoKeywords,
    showPriceInShowcase: product.showPriceInShowcase,
    videos: videos.map((v) => ({ url: v.url, type: v.type, title: v.title, thumbnail: v.thumbnail })),
    pageLayout: layout[0] ? { layoutJson: layout[0].layoutJson } : null,
    showcaseCategories: showcaseCats,
    showcaseTranslations: showcaseTrans.map((t) => ({ locale: t.locale, description: t.description, brewingGuide: t.brewingGuide })),
    recommended,
  });
}

const updateSchema = z.object({
  nameZh: z.string().min(1).max(200).optional(),
  nameEn: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
  sku: z.string().max(50).optional().nullable(),
  priceCNY: z.union([z.string(), z.number()]).optional(),
  priceUSD: z.union([z.string(), z.number()]).optional(),
  spec: z.string().max(200).optional().nullable(),
  isRecommended: z.boolean().optional(),
  showPriceInShowcase: z.boolean().optional(),
  ogTitle: z.string().max(200).optional().nullable(),
  ogDescription: z.string().max(500).optional().nullable(),
  ogImage: z.string().max(500).optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDesc: z.string().max(500).optional().nullable(),
  seoKeywords: z.string().max(500).optional().nullable(),
});

// PUT：编辑产品（需登录）
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const parsed = await parseBody(updateSchema, req);
  if ('error' in parsed) return parsed.error;

  const existing = await db.select().from(products).where(eq(products.id, params.id)).limit(1);
  if (!existing[0]) return fail('产品不存在', 404);

  const body = { ...parsed.data };
  // decimal 字段统一转字符串（zod 允许传数字，入库前转成 decimal 字符串）
  const priceCNY = body.priceCNY !== undefined ? String(body.priceCNY) : undefined;
  const priceUSD = body.priceUSD !== undefined ? String(body.priceUSD) : undefined;

  const rows = await db
    .update(products)
    .set({ ...body, priceCNY, priceUSD, updatedAt: new Date() })
    .where(eq(products.id, params.id))
    .returning();

  await logOperation(auth, 'update', 'product', params.id);
  return ok(rows[0]);
}

// DELETE：删除产品（需登录；图片/翻译/布局等外键 cascade 自动清理）
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const existing = await db.select().from(products).where(eq(products.id, params.id)).limit(1);
  if (!existing[0]) return fail('产品不存在', 404);

  await db.delete(products).where(eq(products.id, params.id));

  await logOperation(auth, 'delete', 'product', params.id, existing[0].nameZh);
  return ok({ id: params.id });
}
