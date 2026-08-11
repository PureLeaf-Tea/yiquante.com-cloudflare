// GET /api/search — 前台产品搜索（05 号文档 §十二）
import type { NextRequest } from 'next/server';
import { or, like, eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products } from '@/drizzle/schema';
import { ok, fail, rateLimitPublic, getPagination } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (!q) return fail('缺少搜索关键词', 400);

  const { page, pageSize, offset } = getPagination(req);

  // 中英文名模糊匹配（只搜上架产品）
  const rows = await db
    .select({
      id: products.id,
      nameZh: products.nameZh,
      nameEn: products.nameEn,
      slug: products.slug,
      spec: products.spec,
    })
    .from(products)
    .where(and(eq(products.status, 'active'), or(like(products.nameZh, `%${q}%`), like(products.nameEn, `%${q}%`))))
    .limit(pageSize)
    .offset(offset);

  return ok(rows, { page, pageSize });
}

