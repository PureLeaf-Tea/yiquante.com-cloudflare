// PUT/DELETE /api/staff/[id]（05 号文档 §十二，仅 admin）
// 规则：不能删除最后一个 admin（07 §3.18）；可重置密码
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/drizzle/schema';
import { hashPassword , type AuthUser } from '@/lib/auth';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

// PUT：编辑员工（角色/状态/姓名/重置密码）
export const PUT = withAuth(async (req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  const parsed = await parseBody(
    z.object({
      name: z.string().min(1).max(50).optional(),
      role: z.enum(['admin', 'editor', 'customer_service']).optional(),
      status: z.enum(['active', 'disabled']).optional(),
      password: z.string().min(8).max(128).optional(), // 传了就是重置密码
    }),
    req
  );
  if ('error' in parsed) return parsed.error;

  const existing = await db.select().from(users).where(eq(users.id, params.id)).limit(1);
  if (!existing[0]) return fail('员工不存在', 404);

  // ★降级/禁用最后一个 admin 前必须检查
  if (existing[0].role === 'admin' && (parsed.data.role !== undefined && parsed.data.role !== 'admin' || parsed.data.status === 'disabled')) {
    const adminCount = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.status, 'active')));
    if (adminCount.length <= 1) return fail('不能降级或禁用最后一个管理员', 400);
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name) update.name = parsed.data.name;
  if (parsed.data.role) update.role = parsed.data.role;
  if (parsed.data.status) update.status = parsed.data.status;
  if (parsed.data.password) update.password = await hashPassword(parsed.data.password);

  const rows = await db.update(users).set(update).where(eq(users.id, params.id)).returning();

  await logOperation(auth, 'update', 'staff', params.id);
  return ok({ id: rows[0].id, username: rows[0].username, name: rows[0].name, role: rows[0].role, status: rows[0].status });
}, ['admin']);

// DELETE：删除员工（admin；最后一个 admin 保护）
export const DELETE = withAuth(async (_req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  if (params.id === auth.id) return fail('不能删除当前登录的账号', 400);

  const existing = await db.select().from(users).where(eq(users.id, params.id)).limit(1);
  if (!existing[0]) return fail('员工不存在', 404);

  if (existing[0].role === 'admin') {
    const adminCount = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
    if (adminCount.length <= 1) return fail('不能删除最后一个管理员', 400);
  }

  await db.delete(users).where(eq(users.id, params.id));

  await logOperation(auth, 'delete', 'staff', params.id, existing[0].username);
  return ok({ id: params.id });
}, ['admin']);
