// POST /api/showcase/verify-password — B2B 密码验证（05 号文档 §3.8，公开）
// 规则：限流 5 次/30 分钟/IP；错误不提示剩余次数；成功签发 24h token
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { showcaseCategories } from '@/drizzle/schema';
import { decrypt } from '@/lib/crypto';
import { getClientIp } from '@/lib/rate-limit';
import { rateLimited, ok, fail, parseBody } from '@/lib/api-helpers';
import { issueShowcaseToken } from '@/lib/b2b';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // 限流：5 次/30 分钟/IP（05 号文档限流表）
  const limited = await rateLimited(req, 'b2b-password', 5, 30 * 60);
  if (limited) return limited;

  const parsed = await parseBody(
    z.object({ categorySlug: z.string().min(1), password: z.string().min(1) }),
    req
  );
  if ('error' in parsed) return parsed.error;
  const { categorySlug, password } = parsed.data;

  const rows = await db.select().from(showcaseCategories).where(eq(showcaseCategories.slug, categorySlug)).limit(1);
  const category = rows[0];

  // 统一返回"密码错误"，不暴露分类是否存在（防枚举）
  if (!category || !category.isActive) return fail('密码错误', 401);

  let realPassword: string;
  try {
    realPassword = await decrypt(category.password);
  } catch {
    return fail('密码错误', 401);
  }

  if (realPassword !== password) return fail('密码错误', 401);

  // 签发 24h token（KV + 数据库双写）
  const ip = getClientIp(req);
  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;
  const { token, expiresAt } = await issueShowcaseToken(category.id, ip, userAgent);

  return ok({ token, expiresAt: expiresAt.toISOString() });
}

