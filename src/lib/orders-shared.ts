// 订单模块服务端共享逻辑（lib/orders-shared.ts）
// Next.js 路由文件（route.ts）只允许导出路由处理器/配置，共享 schema 与工具函数须放本文件
import { z } from 'zod';
import { eq, like } from 'drizzle-orm';
import { db } from './db';
import { orders } from '@/drizzle/schema';
import { locales } from '@/i18n/config';

// ==================== 客户 ====================

// 客户字段校验（POST 全量 / PUT partial 共用）
export const customerSchema = z.object({
  name: z.string().min(1).max(200),
  country: z.string().max(100).optional().nullable(),
  defaultLang: z.enum(locales).optional(),
  note: z.string().max(5000).optional().nullable(),
});

// ==================== 订单 ====================

// 明细项校验（商品/赠品同表，type 区分）
export const orderItemSchema = z.object({
  productId: z.string().uuid(),
  type: z.enum(['item', 'gift']),
  qty: z.number().int().min(1).max(999),
});

// 订单创建/编辑请求体
export const orderBodySchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  orderNo: z.string().max(50).optional().nullable(),
  // 订单日期 YYYY-MM-DD
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式须为 YYYY-MM-DD'),
  status: z.enum(['pending', 'shipped']),
  lang: z.enum(locales),
  theme: z.enum(['brand', 'classic']),
  blessingForeign: z.string().max(2000).optional().nullable(),
  blessingCn: z.string().max(2000).optional().nullable(),
  note: z.string().max(5000).optional().nullable(),
  items: z.array(orderItemSchema).min(1, '订单至少需要一件商品或赠品'),
});

// 客户缩写：拉丁名取各词首字母（最多 4 位），中文名取前两字（需求文档 §5.2 订单号规则）
export function customerAbbr(name: string | null | undefined): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';
  if (/[\u4e00-\u9fff]/.test(trimmed)) return trimmed.slice(0, 2);
  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase())
    .join('')
    .slice(0, 4);
}

// 订单号自动生成：YQ-{yyyyMMdd}-{客户缩写}-{两位序号}；无客户时省略缩写段
// 序号取同前缀已有订单的最大序号 +1，再查重兜底（并发/手动输入撞号场景）
export async function generateOrderNo(date: string, customerName: string | null | undefined): Promise<string> {
  const ymd = date.replace(/-/g, '');
  const abbr = customerAbbr(customerName);
  const prefix = abbr ? `YQ-${ymd}-${abbr}` : `YQ-${ymd}`;

  const rows = await db.select({ orderNo: orders.orderNo }).from(orders).where(like(orders.orderNo, `${prefix}-%`));
  let maxSeq = 0;
  for (const r of rows) {
    const m = r.orderNo.match(/-(\d+)$/);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  let seq = maxSeq + 1;
  for (;;) {
    const candidate = `${prefix}-${String(seq).padStart(2, '0')}`;
    const dup = await db.select({ id: orders.id }).from(orders).where(eq(orders.orderNo, candidate)).limit(1);
    if (!dup[0]) return candidate;
    seq++;
  }
}
