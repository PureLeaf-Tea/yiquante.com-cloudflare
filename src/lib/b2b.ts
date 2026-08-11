// B2B 访问 token 共享逻辑（b2b.ts）
// 校验顺序：先查 KV（全球缓存，快），未命中再查 showcase_access_tokens 表（持久层兜底）
import { eq, and, gt } from 'drizzle-orm';
import { db } from './db';
import { kv } from './kv';
import { showcaseAccessTokens } from '@/drizzle/schema';

const TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 小时（04 号文档 §7.3）

// KV 键：b2b:token:{categoryId}:{token}
function kvKey(categoryId: string, token: string) {
  return `b2b:token:${categoryId}:${token}`;
}

// 签发 token：写 KV + 写数据库表（双写：KV 供高频验证，表供审计与 KV 重建）
export async function issueShowcaseToken(categoryId: string, ip: string | null, userAgent: string | null) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

  await db.insert(showcaseAccessTokens).values({
    showcaseCategoryId: categoryId,
    token,
    ip,
    userAgent,
    expiresAt,
  });
  await kv.put(kvKey(categoryId, token), JSON.stringify({ categoryId, expiresAt: expiresAt.getTime() }), {
    expirationTtl: TOKEN_TTL_SECONDS,
  });

  return { token, expiresAt };
}

// 校验 token 是否对指定分类有效
export async function verifyShowcaseToken(categoryId: string, token: string): Promise<boolean> {
  if (!token) return false;

  // 1. KV 快路径
  const cached = await kv.get(kvKey(categoryId, token));
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { expiresAt: number };
      if (parsed.expiresAt > Date.now()) return true;
    } catch {
      // KV 数据损坏则走数据库兜底
    }
  }

  // 2. 数据库兜底（并回填 KV）
  const rows = await db
    .select()
    .from(showcaseAccessTokens)
    .where(
      and(
        eq(showcaseAccessTokens.token, token),
        eq(showcaseAccessTokens.showcaseCategoryId, categoryId),
        gt(showcaseAccessTokens.expiresAt, new Date())
      )
    )
    .limit(1);
  if (!rows[0]) return false;

  const remaining = Math.floor((rows[0].expiresAt.getTime() - Date.now()) / 1000);
  if (remaining > 0) {
    await kv.put(kvKey(categoryId, token), JSON.stringify({ categoryId, expiresAt: rows[0].expiresAt.getTime() }), {
      expirationTtl: remaining,
    });
  }
  return true;
}
