// 首页聚合查询（queries.ts）
// 服务端组件直接用 Drizzle 查库（不走 HTTP 自调用），后续页面可复用
import { eq, and, isNull, sql, desc, like, or, inArray } from 'drizzle-orm';
import { db } from './db';
import {
  categories, products, productImages, productTranslations, productPageLayouts, productVideos,
  recommendations, showcaseProducts, showcaseCategories, heroImages, sellingPoints, certifications, ctaButtons, reviews,
} from '@/drizzle/schema';

// Hero 轮播图（激活状态，按 sortOrder）
export function getHeroSlides() {
  return db
    .select()
    .from(heroImages)
    .where(eq(heroImages.isActive, true))
    .orderBy(heroImages.sortOrder);
}

// 递归统计某分类子树下的上架产品数（产品挂在末级子分类，需递归而非直接计数）
async function countSubtreeProducts(categoryId: string): Promise<number> {
  const rows = await db.execute(sql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM categories WHERE id = ${categoryId}
      UNION ALL
      SELECT c.id FROM categories c JOIN subtree s ON c.parent_id = s.id
    )
    SELECT count(*)::int AS n FROM products
    WHERE category_id IN (SELECT id FROM subtree) AND status = 'active'
  `);
  const first = (rows as unknown as { rows?: Array<{ n: number }> }).rows?.[0];
  // neon-http 驱动兼容：结果可能在 .rows 或直接是数组
  if (first) return first.n;
  const arr = rows as unknown as Array<{ n: number }>;
  return Array.isArray(arr) && arr[0] ? arr[0].n : 0;
}

// 一级分类卡片（8 个一级茶类，带产品数；排除 00 未分类）
export async function getTopCategories() {
  const rows = await db
    .select({
      id: categories.id,
      nameZh: categories.nameZh,
      nameEn: categories.nameEn,
      slug: categories.slug,
      image: categories.image,
    })
    .from(categories)
    .where(and(isNull(categories.parentId), eq(categories.isProtected, false)))
    .orderBy(categories.sortOrder)
    .limit(8);

  // 逐个统计子树产品数（只 8 个一级分类，查询开销可控）
  const withCounts = await Promise.all(
    rows.map(async (r) => ({ ...r, productCount: await countSubtreeProducts(r.id) }))
  );
  return withCounts;
}

// 卖点（激活，按序）
export function getSellingPoints() {
  return db
    .select()
    .from(sellingPoints)
    .where(eq(sellingPoints.isActive, true))
    .orderBy(sellingPoints.sortOrder);
}

// 认证（激活，按序）
export function getCertifications() {
  return db
    .select()
    .from(certifications)
    .where(eq(certifications.isActive, true))
    .orderBy(certifications.sortOrder);
}

// 已发布评价（最新 6 条）
export function getPublishedReviews() {
  return db
    .select()
    .from(reviews)
    .where(eq(reviews.status, 'published'))
    .orderBy(desc(reviews.createdAt))
    .limit(6);
}

// CTA 按钮（激活，按序）
export function getCtaButtons() {
  return db
    .select()
    .from(ctaButtons)
    .where(eq(ctaButtons.isActive, true))
    .orderBy(ctaButtons.sortOrder);
}

// ==================== 阶段 10：产品浏览 ====================

// 全部分类（排序后，页面内自行组装树）
export function getAllCategories() {
  return db.select().from(categories).orderBy(categories.sortOrder);
}

// 递归取某分类子树的全部 ID（含自身）
export async function getCategorySubtreeIds(categoryId: string): Promise<string[]> {
  const rows = await db.execute(sql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM categories WHERE id = ${categoryId}
      UNION ALL
      SELECT c.id FROM categories c JOIN subtree s ON c.parent_id = s.id
    )
    SELECT id FROM subtree
  `);
  const arr = (rows as unknown as { rows?: Array<{ id: string }> }).rows ?? (rows as unknown as Array<{ id: string }>);
  return arr.map((r) => r.id);
}

// 产品列表（分类子树筛选 + 关键词搜索 + 分页 25/页）
export async function getProductList(opts: {
  categorySlug?: string;
  search?: string;
  page: number;
  pageSize: number;
}) {
  const { categorySlug, search, page, pageSize } = opts;
  const offset = (page - 1) * pageSize;

  const conditions = [eq(products.status, 'active')];

  // 分类筛选：含子树（产品挂在末级分类）
  if (categorySlug) {
    const catRows = await db.select().from(categories).where(eq(categories.slug, categorySlug)).limit(1);
    if (!catRows[0]) return { items: [], total: 0 };
    const subtreeIds = await getCategorySubtreeIds(catRows[0].id);
    conditions.push(inArray(products.categoryId, subtreeIds));
  }

  // 关键词：中英文名模糊匹配
  if (search) {
    const searchCond = or(like(products.nameZh, `%${search}%`), like(products.nameEn, `%${search}%`));
    if (searchCond) conditions.push(searchCond);
  }

  const where = and(...conditions);

  const items = await db
    .select({
      id: products.id,
      sku: products.sku,
      nameZh: products.nameZh,
      nameEn: products.nameEn,
      slug: products.slug,
      priceCNY: products.priceCNY,
      priceUSD: products.priceUSD,
      spec: products.spec,
      categoryName: categories.nameZh,
      thumbnail: sql<string | null>`(SELECT url FROM product_images WHERE product_id = ${products.id} ORDER BY sort_order LIMIT 1)`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(products.createdAt)
    .limit(pageSize)
    .offset(offset);

  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(where);

  return { items, total: countRows[0]?.count || 0 };
}

// 产品详情聚合：主表 + 图片 + 翻译（当前语言回退英文）+ 视频 + 布局 + 推荐 + 分类名
export async function getProductBySlug(slug: string, locale: string) {
  const rows = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  const product = rows[0];
  if (!product) return null;

  const [images, translations, videos, layouts, recs, catRows, showcaseCats] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(productImages.sortOrder),
    db.select().from(productTranslations).where(eq(productTranslations.productId, product.id)),
    db.select().from(productVideos).where(eq(productVideos.productId, product.id)).orderBy(productVideos.sortOrder),
    db.select().from(productPageLayouts).where(eq(productPageLayouts.productId, product.id)).limit(1),
    db.select().from(recommendations).where(eq(recommendations.productId, product.id)).orderBy(recommendations.sortOrder),
    db.select().from(categories).where(eq(categories.id, product.categoryId)).limit(1),
    db
      .select({ id: showcaseProducts.showcaseCategoryId })
      .from(showcaseProducts)
      .where(eq(showcaseProducts.productId, product.id)),
  ]);

  // 翻译：当前语言优先，回退英文，再无则空串
  const trans =
    translations.find((t) => t.locale === locale) || translations.find((t) => t.locale === 'en');

  // 推荐产品详情（最多 3 个上架产品，带缩略图）
  const recommended = [];
  for (const rec of recs.slice(0, 3)) {
    const recRows = await db
      .select({
        id: products.id,
        nameZh: products.nameZh,
        nameEn: products.nameEn,
        slug: products.slug,
        priceCNY: products.priceCNY,
        priceUSD: products.priceUSD,
        thumbnail: sql<string | null>`(SELECT url FROM product_images WHERE product_id = ${products.id} ORDER BY sort_order LIMIT 1)`,
      })
      .from(products)
      .where(and(eq(products.id, rec.recommendedId), eq(products.status, 'active')))
      .limit(1);
    if (recRows[0]) recommended.push(recRows[0]);
  }

  return {
    product,
    images,
    description: trans?.description ?? '',
    brewingGuide: trans?.brewingGuide ?? '',
    videos,
    layoutJson: layouts[0]?.layoutJson ?? null,
    recommended,
    categoryName: catRows[0]?.nameZh ?? null,
    categoryNameEn: catRows[0]?.nameEn ?? null,
    inShowcase: showcaseCats.length > 0,
  };
}

// ==================== 阶段 11：B2B 展示区前台 ====================

// B2B 入口页分类卡片（激活分类 + 产品数）
export async function getShowcaseEntryCategories() {
  const cats = await db
    .select()
    .from(showcaseCategories)
    .where(eq(showcaseCategories.isActive, true))
    .orderBy(showcaseCategories.sortOrder);

  const counts = await db
    .select({ categoryId: showcaseProducts.showcaseCategoryId, count: sql<number>`count(*)::int` })
    .from(showcaseProducts)
    .groupBy(showcaseProducts.showcaseCategoryId);
  const countMap = new Map(counts.map((c) => [c.categoryId, c.count]));

  return cats.map((c) => ({ ...c, productCount: countMap.get(c.id) || 0 }));
}

// 按 ID 列表查产品（对比页，最多 3 个）
export async function getProductsByIds(ids: string[], locale: string) {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: products.id,
      nameZh: products.nameZh,
      nameEn: products.nameEn,
      slug: products.slug,
      priceCNY: products.priceCNY,
      priceUSD: products.priceUSD,
      spec: products.spec,
      thumbnail: sql<string | null>`(SELECT url FROM product_images WHERE product_id = ${products.id} ORDER BY sort_order LIMIT 1)`,
    })
    .from(products)
    .where(and(inArray(products.id, ids.slice(0, 3)), eq(products.status, 'active')));

  // 逐个取当前语言描述（对比表用，回退英文）
  const withDesc = await Promise.all(
    rows.map(async (p) => {
      const trans = await db
        .select()
        .from(productTranslations)
        .where(eq(productTranslations.productId, p.id));
      const t = trans.find((x) => x.locale === locale) || trans.find((x) => x.locale === 'en');
      return { ...p, description: t?.description ?? '' };
    })
  );
  return withDesc;
}
