// GET/POST /api/staff — 员工管理（05 号文档 §十二，仅 admin）
// 规则：密码 ≥8 位（07 §3.18）；新建员工默认 editor 角色
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/drizzle/schema';
import { hashPassword , type AuthUser } from '@/lib/auth';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

// GET：员工列表（admin；不返回密码哈希）
export const GET = withAuth(async () => {

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      status: users.status,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users);

  return ok(rows);
}, ['admin']);

const createSchema = z.object({
  username: z.string().min(1).max(20),
  password: z.string().min(8).max(128), // ★密码至少 8 位
  name: z.string().min(1).max(50),
  role: z.enum(['admin', 'editor', 'customer_service']).optional(),
});

// POST：新建员工（admin）
export const POST = withAuth(async (req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {

  const parsed = await parseBody(createSchema, req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  // 用户名查重
  const dup = await db.select({ id: users.id }).from(users).where(eq(users.username, body.username)).limit(1);
  if (dup[0]) return fail('该账号已存在', 400);

  const rows = await db
    .insert(users)
    .values({
      username: body.username,
      password: await hashPassword(body.password),
      name: body.name,
      role: body.role ?? 'editor',
      updatedAt: new Date(),
    })
    .returning();

  await logOperation(auth, 'create', 'staff', rows[0].id, body.username);
  return ok({ id: rows[0].id, username: rows[0].username, name: rows[0].name, role: rows[0].role });
}, ['admin']);

