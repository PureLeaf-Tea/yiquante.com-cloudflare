import type { NextRequest } from 'next/server';
import type { AuthUser } from '@/lib/auth';
// POST /api/auth/logout — 退出登录（05 号文档 §1.3）
// 清除 httpOnly Cookie；JWT 无状态，1 小时内自然过期
import { ok, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export const POST = withAuth(async (_req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {

  await logOperation(auth, 'logout', 'user', auth.id);

  const res = ok(null);
  // 用过期 Cookie 覆盖实现删除
  res.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
});

