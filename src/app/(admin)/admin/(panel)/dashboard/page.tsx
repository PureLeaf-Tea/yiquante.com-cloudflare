// 后台仪表盘（/admin/dashboard，07 号文档 §3.1）
// 8 张增强统计卡片（服务端直查）+ 最近询价/样品速览
import {
  Package, PackageCheck, Grid3X3, MessageSquare, FlaskConical,
  MailQuestion, Eye, EyeOff, Clock,
} from 'lucide-react';
import { db } from '@/lib/db';
import {
  products, showcaseCategories, inquiries, sampleRequests, productViewLogs, chatMessages,
} from '@/drizzle/schema';
import { eq, sql, gte, desc, and } from 'drizzle-orm';

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Package;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div
        className={
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full ' +
          (accent ? 'bg-brand-green text-white' : 'bg-brand-green/10 text-brand-green')
        }
      >
        <Icon size={20} aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-bold text-brand-green">{value}</p>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  // 8 项统计（服务端直查，不走 HTTP 自调用）
  const [
    productTotal,
    productActive,
    showcaseTotal,
    inquiryPending,
    samplePending,
    unreadMessages,
    viewsTotal,
    viewsToday,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(products),
    db.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.status, 'active')),
    db.select({ n: sql<number>`count(*)::int` }).from(showcaseCategories).where(eq(showcaseCategories.isActive, true)),
    db.select({ n: sql<number>`count(*)::int` }).from(inquiries).where(eq(inquiries.status, 'pending')),
    db.select({ n: sql<number>`count(*)::int` }).from(sampleRequests).where(eq(sampleRequests.status, 'new')),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(and(eq(chatMessages.senderType, 'customer'), eq(chatMessages.isRead, false))),
    db.select({ n: sql<number>`count(*)::int` }).from(productViewLogs),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(productViewLogs)
      .where(gte(productViewLogs.timestamp, new Date(new Date().setHours(0, 0, 0, 0)))),
  ]);

  // 最近询价/样品速览（各 5 条）
  const [recentInquiries, recentSamples] = await Promise.all([
    db.select().from(inquiries).orderBy(desc(inquiries.createdAt)).limit(5),
    db.select().from(sampleRequests).orderBy(desc(sampleRequests.createdAt)).limit(5),
  ]);

  const statusZh: Record<string, string> = {
    new: '待处理',
    pending: '待处理',
    quoted: '已报价',
    confirmed: '已确认',
    shipped: '已发货',
    closed: '已关闭',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">仪表盘</h1>

      {/* 8 张统计卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="产品总数" value={productTotal[0]?.n ?? 0} />
        <StatCard icon={PackageCheck} label="上架中" value={productActive[0]?.n ?? 0} accent />
        <StatCard icon={Grid3X3} label="B2B 分类" value={showcaseTotal[0]?.n ?? 0} />
        <StatCard icon={MessageSquare} label="待处理询价" value={inquiryPending[0]?.n ?? 0} accent />
        <StatCard icon={FlaskConical} label="待处理样品" value={samplePending[0]?.n ?? 0} />
        <StatCard icon={MailQuestion} label="未读消息" value={unreadMessages[0]?.n ?? 0} />
        <StatCard icon={Eye} label="总浏览量" value={viewsTotal[0]?.n ?? 0} />
        <StatCard icon={EyeOff} label="今日浏览" value={viewsToday[0]?.n ?? 0} />
      </div>

      {/* 最近询价 + 样品速览 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Clock size={15} className="text-brand-gold" aria-hidden="true" />
            最近询价
          </h2>
          {recentInquiries.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">暂无询价</p>
          ) : (
            <ul className="space-y-2">
              {recentInquiries.map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span className="truncate text-gray-700">
                    {i.name} · {i.email}
                  </span>
                  <span className="shrink-0 rounded bg-brand-green/10 px-2 py-0.5 text-xs text-brand-green">
                    {statusZh[i.status] || i.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <FlaskConical size={15} className="text-brand-gold" aria-hidden="true" />
            最近样品申请
          </h2>
          {recentSamples.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">暂无样品申请</p>
          ) : (
            <ul className="space-y-2">
              {recentSamples.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span className="truncate text-gray-700">
                    {s.name} · {s.productName || '未指定产品'}
                  </span>
                  <span className="shrink-0 rounded bg-brand-green/10 px-2 py-0.5 text-xs text-brand-green">
                    {statusZh[s.status] || s.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
