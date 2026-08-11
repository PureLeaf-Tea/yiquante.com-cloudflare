// POST /api/auth/login — 后台登录（05 号文档 §1.1）
// SHA-256 密码校验 + 连续 5 次失败锁定 15 分钟 + httpOnly Cookie 签发 JWT
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/drizzle/schema';
import { signToken, verifyPassword } from '@/lib/auth';
import { ok, fail, parseBody, rateLimited, logOperation } from '@/lib/api-helpers';

export const runtime = 'nodejs';

const loginSchema = z.object({
  username: z.string().min(1).max(20),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  // 登录限流：5 次/分钟/IP
  const limited = await rateLimited(req, 'login', 5, 60);
  if (limited) return limited;

  const parsed = await parseBody(loginSchema, req);
  if ('error' in parsed) return parsed.error;
  const { username, password } = parsed.data;

  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const user = rows[0];

  // 不区分"用户不存在"与"密码错误"，防止账号枚举
  if (!user || user.status === 'disabled') {
    return fail('账号或密码错误', 401);
  }

  // 锁定检查（04 号文档 §7.5：错 5 次锁 15 分钟）
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    return NextResponse.json(
      { success: false, error: '账号已锁定，请15分钟后再试', lockedUntil: user.lockedUntil.toISOString() },
      { status: 429 }
    );
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    const attempts = user.loginAttempts + 1;
    if (attempts >= 5) {
      // 达到 5 次：锁定 15 分钟并清零计数
      await db
        .update(users)
        .set({ loginAttempts: 0, lockedUntil: new Date(Date.now() + 15 * 60 * 1000), updatedAt: new Date() })
        .where(eq(users.id, user.id));
      return fail('密码错误次数过多，账号已锁定15分钟', 429);
    }
    await db.update(users).set({ loginAttempts: attempts, updatedAt: new Date() }).where(eq(users.id, user.id));
    return fail('账号或密码错误', 401);
  }

  // 登录成功：重置计数 + 记录时间 + 签发 JWT（有效期 1 小时）
  await db
    .update(users)
    .set({ loginAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastActivityAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  const authUser = { id: user.id, username: user.username, name: user.name, role: user.role };
  const token = await signToken(authUser);

  await logOperation(authUser, 'login', 'user', user.id);

  const res = ok({ user: authUser, token });
  // httpOnly Cookie：前端 JS 读不到，防 XSS 窃取
  res.cookies.set('auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

