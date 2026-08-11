// POST /api/auth/logout — 退出登录（05 号文档 §1.3）
// 清除 httpOnly Cookie；JWT 无状态，1 小时内自然过期
import { ok, requireUser, isFail, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST() {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  await logOperation(auth, 'logout', 'user', auth.id);

  const res = ok(null);
  // 用过期 Cookie 覆盖实现删除
  res.cookies.set('auth_token', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

