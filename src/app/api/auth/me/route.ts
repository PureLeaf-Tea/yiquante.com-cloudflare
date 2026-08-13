import type { NextRequest } from 'next/server';
import type { AuthUser } from '@/lib/auth';
// GET /api/auth/me — 获取当前登录用户（05 号文档 §1.2）
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/drizzle/schema';
import { ok, fail, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export const GET = withAuth(async (_req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {

  // 刷新最后活跃时间（1 小时无操作退出的判断依据）
  await db.update(users).set({ lastActivityAt: new Date() }).where(eq(users.id, auth.id));

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      lastActivityAt: users.lastActivityAt,
    })
    .from(users)
    .where(eq(users.id, auth.id))
    .limit(1);

  if (!rows[0]) return fail('未登录', 401);
  return ok(rows[0]);
});

