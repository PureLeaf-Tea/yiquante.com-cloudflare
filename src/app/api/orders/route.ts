// GET/POST /api/orders — 订单管理（订单模块第 2 期，需求文档 §5.2）
// GET：订单列表（卡片墙数据：客户名/首件商品缩略图/语言/状态）；
// POST：新建订单（选客户自动带语言在前端做；订单号留空时服务端自动生成）
import type { NextRequest } from 'next/server';
import { eq, like, or, and, sql, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, orderItems, customers, products } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';
import { orderBodySchema, generateOrderNo } from '@/lib/orders-shared';
import type { AuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

// 首件商品缩略图（按明细排序取第一件商品的第一张图；注意库列名为 sort_order）
const FIRST_ITEM_THUMB = sql<string | null>`(
  SELECT pi.url FROM order_items oi
  JOIN product_images pi ON pi.product_id = oi.product_id
  WHERE oi.order_id = ${orders.id}
  ORDER BY oi.sort_order, pi.sort_order LIMIT 1
)`;

// GET：订单列表；?status= 过滤；?search= 客户姓名/订单号模糊
export const GET = withAuth(async (req: NextRequest) => {
  const status = req.nextUrl.searchParams.get('status');
  const search = (req.nextUrl.searchParams.get('search') || '').trim();

  const conditions: SQL[] = [];
  if (status && status !== 'all') conditions.push(eq(orders.status, status));
  if (search) {
    const searchCond = or(like(orders.orderNo, `%${search}%`), sql`${customers.name} LIKE ${'%' + search + '%'}`);
    if (searchCond) conditions.push(searchCond);
  }

  const rows = await db
    .select({
      id: orders.id,
      orderNo: orders.orderNo,
      date: orders.date,
      status: orders.status,
      lang: orders.lang,
      theme: orders.theme,
      createdAt: orders.createdAt,
      customerName: customers.name,
      thumbnail: FIRST_ITEM_THUMB,
      itemCount: sql<number>`(SELECT count(*)::int FROM order_items WHERE order_id = ${orders.id})`,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${orders.createdAt} DESC`);

  return ok(rows);
});

// POST：新建订单
export const POST = withAuth(async (req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {
  const parsed = await parseBody(orderBodySchema, req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  // 客户存在性（可选字段；选了就必须存在）
  let customerName: string | null = null;
  if (body.customerId) {
    const cRows = await db.select({ name: customers.name }).from(customers).where(eq(customers.id, body.customerId)).limit(1);
    if (!cRows[0]) return fail('所选客户不存在', 400);
    customerName = cRows[0].name;
  }

  // 商品存在性校验（订单可选到 showOnStorefront=false 的商品，不做前台开关过滤）
  for (const it of body.items) {
    const pRows = await db.select({ id: products.id }).from(products).where(eq(products.id, it.productId)).limit(1);
    if (!pRows[0]) return fail('商品不存在（可能已被删除），请刷新后重试', 400);
  }

  // 订单号：手动输入优先（查重），否则自动生成
  let orderNo = (body.orderNo || '').trim();
  if (orderNo) {
    const dup = await db.select({ id: orders.id }).from(orders).where(eq(orders.orderNo, orderNo)).limit(1);
    if (dup[0]) return fail(`订单号 ${orderNo} 已存在`, 400);
  } else {
    orderNo = await generateOrderNo(body.date, customerName);
  }

  const orderRows = await db
    .insert(orders)
    .values({
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
    .returning();
  const order = orderRows[0];

  // 明细按提交顺序写 sort
  await db.insert(orderItems).values(
    body.items.map((it, i) => ({
      orderId: order.id,
      productId: it.productId,
      type: it.type,
      qty: it.qty,
      sort: i,
    }))
  );

  await logOperation(auth, 'create', 'order', order.id, orderNo);
  return ok({ id: order.id, orderNo: order.orderNo });
});
