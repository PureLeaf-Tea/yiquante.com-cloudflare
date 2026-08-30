// GET/PUT /api/products/[id]/translations — 产品多语言翻译编辑（订单模块第 1 期）
// 主站此前无翻译编辑界面（翻译靠 seed），订单模块要求录入产地/工艺，故补齐此端点
// GET：返回该商品全部 6 语言翻译行；PUT：按 productId+locale upsert 单条翻译
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, productTranslations } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';
import { locales } from '@/i18n/config';
import type { AuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

// GET：全部语言翻译行（需登录；公开展示用 /api/products/[id]?locale=xx 即可）
export const GET = withAuth(async (_req: NextRequest, { params }: RouteContext) => {
  const product = await db.select({ id: products.id }).from(products).where(eq(products.id, params.id)).limit(1);
  if (!product[0]) return fail('产品不存在', 404);

  const rows = await db
    .select()
    .from(productTranslations)
    .where(eq(productTranslations.productId, params.id));

  return ok(
    rows.map((t) => ({
      locale: t.locale,
      description: t.description,
      brewingGuide: t.brewingGuide,
      origin: t.origin,
      process: t.process,
    }))
  );
});

const translationSchema = z.object({
  locale: z.enum(locales),
  description: z.string().max(20000).optional(),
  brewingGuide: z.string().max(20000).optional(),
  origin: z.string().max(5000).optional(),
  process: z.string().max(5000).optional(),
});

// PUT：按 productId+locale upsert（存在则更新，不存在则插入）
export const PUT = withAuth(async (req: NextRequest, { params }: RouteContext, auth: AuthUser) => {
  const parsed = await parseBody(translationSchema, req);
  if ('error' in parsed) return parsed.error;

  const product = await db.select({ id: products.id }).from(products).where(eq(products.id, params.id)).limit(1);
  if (!product[0]) return fail('产品不存在', 404);

  const { locale, ...fields } = parsed.data;
  const existing = await db
    .select()
    .from(productTranslations)
    .where(and(eq(productTranslations.productId, params.id), eq(productTranslations.locale, locale)))
    .limit(1);

  let row;
  if (existing[0]) {
    const updated = await db
      .update(productTranslations)
      .set(fields)
      .where(eq(productTranslations.id, existing[0].id))
      .returning();
    row = updated[0];
  } else {
    const inserted = await db
      .insert(productTranslations)
      .values({ productId: params.id, locale, description: '', brewingGuide: '', origin: '', process: '', ...fields })
      .returning();
    row = inserted[0];
  }

  await logOperation(auth, 'update', 'product_translation', params.id, locale);
  return ok({
    locale: row.locale,
    description: row.description,
    brewingGuide: row.brewingGuide,
    origin: row.origin,
    process: row.process,
  });
});
