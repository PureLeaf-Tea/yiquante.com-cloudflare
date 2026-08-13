// GET /api/stats/dashboard — 仪表盘统计（05 号文档 §十二，需认证）
// 8 张卡片：产品总数/上架数/B2B 分类数/待处理询价/待处理样品/未读消息/总浏览/今日浏览
import { eq, sql, gte } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  products,
  showcaseCategories,
  inquiries,
  sampleRequests,
  chatMessages,
  productViewLogs,
} from '@/drizzle/schema';
import { ok, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export const GET = withAuth(async () => {

  // 今日零点（本地时区）
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    productTotal,
    productActive,
    b2bCount,
    inquiryNew,
    sampleNew,
    unread,
    viewsTotal,
    viewsToday,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(products),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.status, 'active')),
    db.select({ count: sql<number>`count(*)::int` }).from(showcaseCategories).where(eq(showcaseCategories.isActive, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(inquiries).where(eq(inquiries.status, 'new')),
    db.select({ count: sql<number>`count(*)::int` }).from(sampleRequests).where(eq(sampleRequests.status, 'new')),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(sql`${chatMessages.senderType} = 'customer' AND ${chatMessages.isRead} = false`),
    db.select({ count: sql<number>`count(*)::int` }).from(productViewLogs),
    db.select({ count: sql<number>`count(*)::int` }).from(productViewLogs).where(gte(productViewLogs.timestamp, todayStart)),
  ]);

  return ok({
    productTotal: productTotal[0]?.count || 0,
    productActive: productActive[0]?.count || 0,
    b2bCategories: b2bCount[0]?.count || 0,
    inquiriesNew: inquiryNew[0]?.count || 0,
    samplesNew: sampleNew[0]?.count || 0,
    unreadMessages: unread[0]?.count || 0,
    viewsTotal: viewsTotal[0]?.count || 0,
    viewsToday: viewsToday[0]?.count || 0,
  });
});

