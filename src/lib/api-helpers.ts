// API 公共层（api-helpers.ts）
// 统一响应格式 / 认证鉴权 / 参数校验 / 限流 / 操作日志，供全部 API 端点复用
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { getCurrentUser, hasRole, type AuthUser } from './auth';
import { getKV } from './kv';
import { checkRateLimit, getClientIp } from './rate-limit';
import { db } from './db';
import { operationLogs } from '@/drizzle/schema';

// ★统一成功响应（05 号文档 §〇）：{ success: true, data, ...extra(total/page/pageSize) }
export function ok(data: unknown, extra?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, ...(extra || {}) });
}

// ★统一错误响应：{ success: false, error }
export function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

// 认证结果：要么是用户对象，要么是已构造好的 401/403 响应
export type AuthResult = AuthUser | NextResponse;

// ★登录态 + 角色校验；调用方用 isFail() 判断后直接 return
export async function requireUser(roles?: string[]): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) return fail('未登录', 401);
  if (roles && !hasRole(user, roles)) return fail('权限不足', 403);
  return user;
}

export function isFail(result: AuthResult): result is NextResponse {
  return result instanceof NextResponse;
}

// ★zod 请求体校验包装：解析失败统一 400
export async function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  req: NextRequest
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { error: fail('请求体格式错误（需要 JSON）', 400) };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    const msg = result.error.issues[0]?.message || '参数校验失败';
    return { error: fail(msg, 400) };
  }
  return { data: result.data };
}

// ★限流包装（05 号文档限流表）：超限返回 429，未超限返回 null
export async function rateLimited(
  req: NextRequest,
  keyPrefix: string,
  max: number,
  windowSeconds: number
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const result = await checkRateLimit(getKV(), `rl:${keyPrefix}:${ip}`, max, windowSeconds);
  if (!result.allowed) {
    return fail('请求过于频繁，请稍后再试', 429);
  }
  return null;
}

// ★公开接口通用限流：60 次/分钟/IP（05 号文档 §〇）
export function rateLimitPublic(req: NextRequest, keyPrefix: string) {
  return rateLimited(req, keyPrefix, 60, 60);
}

// ★操作日志写入（04 号文档 §7.6：只追加、保留最近 1000 条）
export async function logOperation(
  user: AuthUser | null,
  action: string,
  targetType?: string,
  targetId?: string,
  detail?: string
): Promise<void> {
  try {
    await db.insert(operationLogs).values({
      userId: user?.id ?? null,
      username: user?.username ?? null,
      action,
      targetType: targetType ?? null,
      targetId: targetId ?? null,
      detail: detail ?? null,
    });
    // 超出 1000 条时删除最旧的（保留 1000 条）
    await db.execute(sql`
      DELETE FROM operation_logs WHERE id IN (
        SELECT id FROM operation_logs ORDER BY created_at DESC OFFSET 1000
      )
    `);
  } catch (error) {
    // 日志失败不阻断主业务
    console.error('[LOG ERROR]', error);
  }
}

// ★分页参数解析（默认 25 条/页，02 号文档 §9.7）
export function getPagination(req: NextRequest) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('pageSize')) || 25));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

