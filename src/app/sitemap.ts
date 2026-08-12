// 站点地图（src/app/sitemap.ts，16 号文档 §八）
// 六语言前台主路由 + 全部上架产品详情；排除 /admin /api /showcase /b2b
import type { MetadataRoute } from 'next';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products } from '@/drizzle/schema';

const SITE_URL = 'https://yiquantea.com';
const LOCALES = ['zh', 'en', 'ru', 'de', 'es', 'fr'];

// 前台主路由（不含需要密码的 B2B 与独立展示区）
const FRONT_ROUTES = ['', '/products', '/sample', '/about', '/certifications', '/contact', '/privacy', '/terms'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  // 六语言 × 主路由
  for (const locale of LOCALES) {
    for (const route of FRONT_ROUTES) {
      entries.push({
        url: `${SITE_URL}/${locale}${route}`,
        lastModified: now,
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1.0 : 0.7,
      });
    }
  }

  // 产品详情（六语言，仅上架产品）
  try {
    const rows = await db
      .select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(eq(products.status, 'active'));
    for (const p of rows) {
      for (const locale of LOCALES) {
        entries.push({
          url: `${SITE_URL}/${locale}/products/${p.slug}`,
          lastModified: p.updatedAt || now,
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      }
    }
  } catch {
    // 数据库不可用时仅输出主路由（部署构建兜底）
  }

  return entries;
}
