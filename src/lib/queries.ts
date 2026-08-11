// 首页聚合查询（queries.ts）
// 服务端组件直接用 Drizzle 查库（不走 HTTP 自调用），后续页面可复用
import { eq, and, isNull, sql, desc } from 'drizzle-orm';
import { db } from './db';
import {
  categories, products, heroImages, sellingPoints, certifications, ctaButtons, reviews,
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
