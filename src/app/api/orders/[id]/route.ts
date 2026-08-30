// GET/PUT/DELETE /api/orders/[id] — 订单详情/编辑/删除（订单模块第 2 期）
// PUT：主表字段更新 + 明细全量替换（先删后插）
import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, orderItems, customers, products, productImages } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';
import { orderBodySchema } from '@/lib/orders-shared';
import type { AuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

// GET：订单全字段 + 客户 + 明细（含商品中英文名/规格/缩略图；商品被删则 productId 为 null 并标记）
export const GET = withAuth(async (_req: NextRequest, { params }: RouteContext) => {
  const orderRows = await db
    .select({ order: orders, customerName: customers.name })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, params.id))
    .limit(1);
  if (!orderRows[0]) return fail('订单不存在', 404);
  const { order, customerName } = orderRows[0];

  const items = await db
    .select({
      id: orderItems.id,
      productId: orderItems.productId,
      type: orderItems.type,
      qty: orderItems.qty,
      sort: orderItems.sort,
      nameZh: products.nameZh,
      nameEn: products.nameEn,
      spec: products.spec,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, params.id))
    .orderBy(orderItems.sort);

  // 每件明细的缩略图（商品已删除时为 null）
  const withThumbs = await Promise.all(
    items.map(async (it) => {
      let thumbnail: string | null = null;
      if (it.productId) {
        const imgRows = await db
          .select({ url: productImages.url })
          .from(productImages)
          .where(eq(productImages.productId, it.productId))
          .orderBy(productImages.sortOrder)
          .limit(1);
        thumbnail = imgRows[0]?.url ?? null;
      }
      return { ...it, thumbnail, productDeleted: it.productId === null };
    })
  );

  return ok({ ...order, customerName, items: withThumbs });
});

// PUT：更新订单（明细全量替换）
export const PUT = withAuth(async (req: NextRequest, { params }: RouteContext, auth: AuthUser) => {
  const parsed = await parseBody(orderBodySchema, req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  const existing = await db.select().from(orders).where(eq(orders.id, params.id)).limit(1);
  if (!existing[0]) return fail('订单不存在', 404);

  // 客户存在性
  if (body.customerId) {
    const cRows = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, body.customerId)).limit(1);
    if (!cRows[0]) return fail('所选客户不存在', 400);
  }

  // 商品存在性
  for (const it of body.items) {
    const pRows = await db.select({ id: products.id }).from(products).where(eq(products.id, it.productId)).limit(1);
    if (!pRows[0]) return fail('商品不存在（可能已被删除），请刷新后重试', 400);
  }

  // 订单号改动需查重（排除自身）
  const orderNo = (body.orderNo || '').trim() || existing[0].orderNo;
  if (orderNo !== existing[0].orderNo) {
    const dup = await db.select({ id: orders.id }).from(orders).where(eq(orders.orderNo, orderNo)).limit(1);
    if (dup[0]) return fail(`订单号 ${orderNo} 已存在`, 400);
  }

  await db
    .update(orders)
    .set({
      orderNo,
      customerId: body.customerId ?? null,
      date: body.date,
      status: body.status,
      lang: body.lang,
      theme: body.theme,
      blessingForeign: body.blessingForeign ?? null,
      blessingCn: body.blessingCn ?? null,
      note: body.note ?? null,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, params.id));

  // 明细全量替换
  await db.delete(orderItems).where(eq(orderItems.orderId, params.id));
  await db.insert(orderItems).values(
    body.items.map((it, i) => ({
      orderId: params.id,
      productId: it.productId,
      type: it.type,
      qty: it.qty,
      sort: i,
    }))
  );

  await logOperation(auth, 'update', 'order', params.id, orderNo);
  return ok({ id: params.id, orderNo });
});

// DELETE：删除订单（明细级联）
export const DELETE = withAuth(async (_req: NextRequest, { params }: RouteContext, auth: AuthUser) => {
  const existing = await db.select().from(orders).where(eq(orders.id, params.id)).limit(1);
  if (!existing[0]) return fail('订单不存在', 404);

  await db.delete(orders).where(eq(orders.id, params.id));

  await logOperation(auth, 'delete', 'order', params.id, existing[0].orderNo);
  return ok({ id: params.id });
});

