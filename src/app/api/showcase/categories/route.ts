import type { AuthUser } from '@/lib/auth';
﻿// GET/POST /api/showcase/categories（05 号文档 §3.1/§3.3）
// GET 公开：B2B 分类卡片列表（不返回密码相关字段）
// POST 仅 admin：创建 B2B 分类（密码 AES-GCM 加密存储）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { showcaseCategories, showcaseProducts } from '@/drizzle/schema';
import { encrypt } from '@/lib/crypto';
import { ok, fail, parseBody, rateLimitPublic, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

// GET：B2B 分类列表（公开，入口卡片用）
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const cats = await db
    .select()
    .from(showcaseCategories)
    .where(eq(showcaseCategories.isActive, true))
    .orderBy(showcaseCategories.sortOrder);

  // 每个分类的产品数
  const counts = await db
    .select({ categoryId: showcaseProducts.showcaseCategoryId, count: sql<number>`count(*)::int` })
    .from(showcaseProducts)
    .groupBy(showcaseProducts.showcaseCategoryId);
  const countMap = new Map(counts.map((c) => [c.categoryId, c.count]));

  // 公开字段：不含密码密文
  const data = cats.map((c) => ({
    id: c.id,
    nameZh: c.nameZh,
    nameEn: c.nameEn,
    slug: c.slug,
    image: c.image,
    descriptionZh: c.descriptionZh,
    descriptionEn: c.descriptionEn,
    productCount: countMap.get(c.id) || 0,
    hasPassword: true, // B2B 分类始终有密码
  }));
  return ok(data);
}

const createSchema = z.object({
  nameZh: z.string().min(1).max(50),
  nameEn: z.string().min(1).max(50),
  password: z.string().min(4).max(64), // 明文传入，服务端加密存储
  image: z.string().max(500).optional().nullable(),
  descriptionZh: z.string().max(2000).optional(),
  descriptionEn: z.string().max(2000).optional(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

// POST：创建 B2B 分类（仅 admin，07 号文档：editor 不可操作展示区）
export const POST = withAuth(async (req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {

  const parsed = await parseBody(createSchema, req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  const slug = `${body.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;

  // ★AES-GCM 可逆加密（admin 之后可二次验证查看明文）
  const encryptedPassword = await encrypt(body.password);

  const rows = await db
    .insert(showcaseCategories)
    .values({
      nameZh: body.nameZh,
      nameEn: body.nameEn,
      slug,
      password: encryptedPassword,
      image: body.image ?? null,
      descriptionZh: body.descriptionZh ?? null,
      descriptionEn: body.descriptionEn ?? null,
      parentId: body.parentId ?? null,
      sortOrder: body.sortOrder ?? 0,
      updatedAt: new Date(),
    })
    .returning();

  await logOperation(auth, 'create', 'showcase_category', rows[0].id, body.nameZh);
  return ok({ id: rows[0].id, nameZh: rows[0].nameZh, slug: rows[0].slug });
}, ['admin']);

