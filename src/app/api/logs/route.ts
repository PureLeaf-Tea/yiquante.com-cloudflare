// GET /api/logs — 操作日志（05 号文档 §十二，仅 admin）
// 只读、倒序、分页；日志只追加不删除（保留 1000 条由写入端控制）
import type { NextRequest } from 'next/server';
import { desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { operationLogs } from '@/drizzle/schema';
import { ok, requireUser, isFail, getPagination } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const auth = await requireUser(['admin']);
  if (isFail(auth)) return auth;

  const { page, pageSize, offset } = getPagination(req);

  const rows = await db
    .select()
    .from(operationLogs)
    .orderBy(desc(operationLogs.createdAt))
    .limit(pageSize)
    .offset(offset);

  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(operationLogs);

  return ok(rows, { total: countRows[0]?.count || 0, page, pageSize });
}

