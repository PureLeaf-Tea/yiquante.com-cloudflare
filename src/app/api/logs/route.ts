// GET /api/logs — 操作日志（05 号文档 §十二，仅 admin）
// 只读、倒序、分页；支持 targetType/targetId 过滤（如样品状态时间线）；
// 日志只追加不删除（保留 1000 条由写入端控制）
import type { NextRequest } from 'next/server';
import { desc, sql, eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { operationLogs } from '@/drizzle/schema';
import { ok, getPagination, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export const GET = withAuth(async (req: NextRequest) => {

  const { page, pageSize, offset } = getPagination(req);

  // 可选过滤：targetType / targetId（留痕时间线用）
  const targetType = req.nextUrl.searchParams.get('targetType');
  const targetId = req.nextUrl.searchParams.get('targetId');
  const conditions = [];
  if (targetType) conditions.push(eq(operationLogs.targetType, targetType));
  if (targetId) conditions.push(eq(operationLogs.targetId, targetId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(operationLogs)
    .where(where)
    .orderBy(desc(operationLogs.createdAt))
    .limit(pageSize)
    .offset(offset);

  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(operationLogs).where(where);

  return ok(rows, { total: countRows[0]?.count || 0, page, pageSize });
}, ['admin']);

