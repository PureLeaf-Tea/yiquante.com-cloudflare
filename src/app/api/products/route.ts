import type { AuthUser } from '@/lib/auth';
﻿// GET/POST /api/products（05 号文档 §4.1/§4.3）
// GET：产品列表（公开，分页 25；status=all 需认证）
// POST：新增产品（multipart/form-data，需认证；图片真实上传 R2，凭据缺失时降级占位）
import type { NextRequest } from 'next/server';
import { eq, and, or, like, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, productImages, productPageLayouts, categories, uploads } from '@/drizzle/schema';
import { ok, fail, rateLimitPublic, requireUser, isFail, logOperation, getPagination, withAuth } from '@/lib/api-helpers';
import { uploadFile, isR2Configured, publicUrl } from '@/lib/r2';

export const runtime = 'nodejs';

// 图片白名单 + 上限（上传安全规范）
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

// GET：产品列表
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const { page, pageSize, offset } = getPagination(req);
  const categoryId = req.nextUrl.searchParams.get('categoryId');
  const search = req.nextUrl.searchParams.get('search');
  const status = req.nextUrl.searchParams.get('status'); // 'all' 需认证（看下架产品）
  // 前台场景（如样品表单选品）传 storefront=1：只看官网前台可见商品（订单模块）
  const storefrontOnly = req.nextUrl.searchParams.get('storefront') === '1';

  // 构造过滤条件：默认只查上架产品
  const conditions = [];
  if (status === 'all') {
    const auth = await requireUser();
    if (isFail(auth)) return auth;
  } else {
    conditions.push(eq(products.status, 'active'));
  }
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));
  if (storefrontOnly) conditions.push(eq(products.showOnStorefront, true));
  if (search) {
    conditions.push(or(like(products.nameZh, `%${search}%`), like(products.nameEn, `%${search}%`)));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // 列表带分类名 + 首图（子查询取第一张图）
  const rows = await db
    .select({
      id: products.id,
      sku: products.sku,
      nameZh: products.nameZh,
      nameEn: products.nameEn,
      slug: products.slug,
      categoryName: categories.nameZh,
      priceCNY: products.priceCNY,
      priceUSD: products.priceUSD,
      spec: products.spec,
      status: products.status,
      thumbnail: sql<string | null>`(SELECT url FROM product_images WHERE product_id = ${products.id} ORDER BY sort_order LIMIT 1)`,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(where)
    .orderBy(products.createdAt)
    .limit(pageSize)
    .offset(offset);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(where);

  return ok(rows, { total: countRows[0]?.count || 0, page, pageSize });
}

// POST：新增产品（multipart/form-data）
export const POST = withAuth(async (req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('请求体格式错误（需要 multipart/form-data）', 400);
  }

  const nameZh = String(form.get('nameZh') || '').trim();
  const nameEn = String(form.get('nameEn') || '').trim();
  const categoryId = String(form.get('categoryId') || '').trim();
  if (!nameZh || !nameEn || !categoryId) return fail('nameZh / nameEn / categoryId 必填', 400);

  // 分类必须存在
  const catRows = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!catRows[0]) return fail('分类不存在', 400);

  const slug = `${nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;

  // 1. 产品主记录
  const productRows = await db
    .insert(products)
    .values({
      sku: String(form.get('sku') || '') || null,
      nameZh,
      nameEn,
      slug,
      categoryId,
      priceCNY: String(form.get('priceCNY') || '0'),
      priceUSD: String(form.get('priceUSD') || '0'),
      spec: String(form.get('spec') || '') || null,
      showPriceInShowcase: form.get('showPriceInShowcase') !== 'false',
      // 订单模块两个开关：前台显示（默认开）/ 订单详情页显价（默认关）
      showOnStorefront: form.get('showOnStorefront') !== 'false',
      showPriceInOrder: form.get('showPriceInOrder') === 'true',
      updatedAt: new Date(),
    })
    .returning();
  const product = productRows[0];

  // 2. 图片文件：真实上传 R2 + 登记 uploads 表（收尾任务 3；凭据缺失降级占位）
  const imageFiles = form.getAll('images').filter((v): v is File => v instanceof File);
  let order = 0;
  for (const file of imageFiles) {
    if (!IMAGE_TYPES.includes(file.type)) {
      return fail(`图片格式不支持：${file.name}（仅 JPG/PNG/WebP）`, 400);
    }
    if (file.size > IMAGE_MAX_BYTES) {
      return fail(`图片超过 10MB：${file.name}`, 400);
    }
    const key = `products/${product.id}/${Date.now()}-${order}.webp`;
    let url: string;
    if (isR2Configured()) {
      try {
        const body = await file.arrayBuffer();
        url = await uploadFile(key, body, file.type);
      } catch {
        url = publicUrl(key);
      }
    } else {
      url = publicUrl(key);
    }
    await db.insert(productImages).values({ productId: product.id, url, alt: nameZh, sortOrder: order });
    await db.insert(uploads).values({
      type: 'image',
      filename: key,
      originalName: file.name,
      url,
      mimeType: file.type,
      size: file.size,
      uploadedBy: auth.id,
    });
    order++;
  }

  // 3. 详情页布局（可选，JSON 字符串）
  // 布局数据存 product_page_layouts 表，在 layout 端点读写——此处若带了 layoutJson 就一并写入
  const layoutJson = String(form.get('layoutJson') || '').trim();
  if (layoutJson) {
    try {
      JSON.parse(layoutJson);
    } catch {
      return fail('layoutJson 不是合法 JSON', 400);
    }
    await db.insert(productPageLayouts).values({ productId: product.id, layoutJson, updatedAt: new Date() });
  }

  await logOperation(auth, 'create', 'product', product.id, nameZh);
  return ok({ id: product.id, slug: product.slug });
});

