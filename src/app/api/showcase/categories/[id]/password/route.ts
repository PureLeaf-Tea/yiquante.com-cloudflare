// PUT/GET /api/showcase/categories/[id]/password（05 号文档 §3.6/§3.7，仅 admin）
// PUT：修改密码（明文传入，AES-GCM 加密存储）
// GET：查看明文（需二次输入管理员密码验证 — 08 号文档规范）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { showcaseCategories, users } from '@/drizzle/schema';
import { encrypt, decrypt } from '@/lib/crypto';
import { verifyPassword , type AuthUser } from '@/lib/auth';
import { ok, fail, parseBody, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

// PUT：修改 B2B 密码
export const PUT = withAuth(async (req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  const parsed = await parseBody(z.object({ newPassword: z.string().min(4).max(64) }), req);
  if ('error' in parsed) return parsed.error;

  const existing = await db.select().from(showcaseCategories).where(eq(showcaseCategories.id, params.id)).limit(1);
  if (!existing[0]) return fail('B2B 分类不存在', 404);

  const encryptedPassword = await encrypt(parsed.data.newPassword);
  await db
    .update(showcaseCategories)
    .set({ password: encryptedPassword, updatedAt: new Date() })
    .where(eq(showcaseCategories.id, params.id));

  // ★密码变更必记日志（04 §7.6）；已签发 token 24 小时内仍有效（旧密码客户不受影响）
  await logOperation(auth, 'update', 'showcase_password', params.id);
  return ok(null);
}, ['admin']);

// GET：查看明文密码（需二次输入管理员密码验证）
// 管理员密码支持两种传法：?adminPassword=查询参数（标准）或请求体（兼容 05 号文档写法）
export const GET = withAuth(async (req: NextRequest, { params }: RouteContext, auth: AuthUser) => {

  let adminPassword = req.nextUrl.searchParams.get('adminPassword') || '';
  if (!adminPassword) {
    const parsed = await parseBody(z.object({ adminPassword: z.string().min(1) }), req);
    if ('error' in parsed) return parsed.error;
    adminPassword = parsed.data.adminPassword;
  }

  const adminRows = await db.select().from(users).where(eq(users.id, auth.id)).limit(1);
  const admin = adminRows[0];
  if (!admin || !(await verifyPassword(adminPassword, admin.password))) {
    return fail('管理员密码验证失败', 401);
  }

  const rows = await db.select().from(showcaseCategories).where(eq(showcaseCategories.id, params.id)).limit(1);
  if (!rows[0]) return fail('B2B 分类不存在', 404);

  let password: string;
  try {
    password = await decrypt(rows[0].password);
  } catch {
    return fail('密码解密失败（密钥可能已更换）', 500);
  }

  await logOperation(auth, 'view', 'showcase_password', params.id);
  return ok({ password });
}, ['admin']);
