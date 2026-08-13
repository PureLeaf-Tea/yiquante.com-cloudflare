import type { AuthUser } from '@/lib/auth';
﻿// GET/POST /api/categories — 分类树查询 + 新增分类（05 号文档 §二）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories, products } from '@/drizzle/schema';
import { ok, fail, parseBody, rateLimitPublic, logOperation, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

// 分类树节点（含子分类和该分类下的产品数）
interface CategoryNode {
  id: string;
  nameZh: string;
  nameEn: string;
  slug: string;
  image: string | null;
  sortOrder: number;
  parentId: string | null;
  isProtected: boolean;
  productCount: number;
  children: CategoryNode[];
}

// GET：获取完整分类树（公开接口，带 productCount）
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const all = await db.select().from(categories).orderBy(categories.sortOrder);

  // 统计每个分类下的产品数量
  const counts = await db
    .select({ categoryId: products.categoryId, count: sql<number>`count(*)::int` })
    .from(products)
    .groupBy(products.categoryId);
  const countMap = new Map(counts.map((c) => [c.categoryId, c.count]));

  // 组装树：parentId 为空的是根节点
  const nodeMap = new Map<string, CategoryNode>();
  for (const c of all) {
    nodeMap.set(c.id, { ...c, productCount: countMap.get(c.id) || 0, children: [] });
  }
  const tree: CategoryNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      tree.push(node);
    }
  }
  return ok(tree);
}

const createSchema = z.object({
  nameZh: z.string().min(1).max(50),
  nameEn: z.string().min(1).max(50),
  slug: z.string().min(1).max(100).optional(),
  image: z.string().max(500).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

// POST：新增分类（需登录；同级名称不可重复）
export const POST = withAuth(async (req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {

  const parsed = await parseBody(createSchema, req);
  if ('error' in parsed) return parsed.error;
  const body = parsed.data;

  // 同级名称查重（04 号文档 §7.1）
  const dup = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      body.parentId
        ? sql`${categories.parentId} = ${body.parentId} AND (${categories.nameZh} = ${body.nameZh} OR ${categories.nameEn} = ${body.nameEn})`
        : sql`${categories.parentId} IS NULL AND (${categories.nameZh} = ${body.nameZh} OR ${categories.nameEn} = ${body.nameEn})`
    )
    .limit(1);
  if (dup.length > 0) return fail('同级下已存在同名分类', 400);

  const slug =
    body.slug ||
    `${body.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;

  const rows = await db
    .insert(categories)
    .values({
      nameZh: body.nameZh,
      nameEn: body.nameEn,
      slug,
      image: body.image ?? null,
      parentId: body.parentId ?? null,
      sortOrder: body.sortOrder ?? 0,
      updatedAt: new Date(),
    })
    .returning();

  await logOperation(auth, 'create', 'category', rows[0].id, body.nameZh);
  return ok(rows[0]);
});

