import type { AuthUser } from '@/lib/auth';
﻿// GET/POST /api/search-keywords — 后台全局搜索关键词映射（05 号文档 §十二）
// GET：关键词列表（后台搜索框用）；POST：新增关键词（admin）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { searchKeywords } from '@/drizzle/schema';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

// GET：全部激活的关键词映射
export const GET = withAuth(async (_req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {

  const rows = await db
    .select()
    .from(searchKeywords)
    .where(eq(searchKeywords.isActive, true))
    .orderBy(asc(searchKeywords.sortOrder));
  return ok(rows);
});

// POST：新增关键词
export const POST = withAuth(async (req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {

  const parsed = await parseBody(
    z.object({
      keyword: z.string().min(1).max(100),
      targetPath: z.string().min(1).max(200),
      sortOrder: z.number().int().optional(),
    }),
    req
  );
  if ('error' in parsed) return parsed.error;

  const dup = await db.select({ id: searchKeywords.id }).from(searchKeywords).where(eq(searchKeywords.keyword, parsed.data.keyword)).limit(1);
  if (dup[0]) return fail('该关键词已存在', 400);

  const rows = await db
    .insert(searchKeywords)
    .values({ ...parsed.data, sortOrder: parsed.data.sortOrder ?? 0, updatedAt: new Date() })
    .returning();

  await logOperation(auth, 'create', 'search_keyword', rows[0].id, parsed.data.keyword);
  return ok(rows[0]);
}, ['admin']);

