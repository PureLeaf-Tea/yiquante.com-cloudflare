// API 限流（rate-limit.ts）
// ★和老版的区别：老版用 Redis 做限流计数，新版用 Cloudflare KV。
// KV 全球同步，延迟更低，也不需要装 Redis。
import type { KVClient } from './kv';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // 还需要等多少秒
}

// ★检查请求是否超过频率限制（滑动窗口计数）
export async function checkRateLimit(
  kv: KVClient,
  key: string, // 限流标识（如 "rl:login:192.168.1.1"）
  maxRequests: number, // 次数上限
  windowSeconds: number // 时间窗口（秒）
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // 从 KV 获取当前计数和窗口开始时间
  const raw = await kv.get(key);
  const entry: { count: number; windowStart: number } = raw ? JSON.parse(raw) : { count: 0, windowStart };

  // 检查是否在新窗口
  if (entry.windowStart < windowStart) {
    // 新窗口，重置计数
    entry.count = 1;
    entry.windowStart = now;
    await kv.put(key, JSON.stringify(entry), { expirationTtl: windowSeconds });
    return { allowed: true };
  }

  // 同窗口内，增加计数
  entry.count++;
  await kv.put(key, JSON.stringify(entry), { expirationTtl: windowSeconds });

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.windowStart + windowSeconds * 1000 - now) / 1000),
    };
  }

  return { allowed: true };
}

// ★从请求中提取客户端 IP
// cf-connecting-ip：Cloudflare 提供的真实客户端 IP（最可信）
export function getClientIp(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '127.0.0.1'
  );
}
