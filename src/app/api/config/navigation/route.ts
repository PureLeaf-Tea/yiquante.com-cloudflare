import type { AuthUser } from '@/lib/auth';
﻿// GET/PUT /api/config/navigation — 前台导航菜单（05 号文档 §十二）
// GET 公开（Header 渲染用）；PUT 需登录（整表替换式保存）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { navigationItems } from '@/drizzle/schema';
import { ok, parseBody, logOperation, rateLimitPublic, withAuth } from '@/lib/api-helpers';

export const runtime = 'nodejs';

// GET：导航项列表（按 sortOrder）
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const rows = await db.select().from(navigationItems).orderBy(asc(navigationItems.sortOrder));
  return ok(rows);
}

const itemSchema = z.object({
  // 保留原 id：整表重建时维持二级菜单 parentId 引用稳定
  id: z.string().uuid().optional(),
  parentId: z.string().uuid().optional().nullable(),
  labelZh: z.string().min(1).max(50),
  labelEn: z.string().min(1).max(50),
  href: z.string().min(1).max(200),
  openInNewTab: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

// PUT：保存导航（传入完整列表，清空重建——导航项少，简单可靠）
export const PUT = withAuth(async (req: NextRequest, _ctx: { params: Record<string, string> }, auth: AuthUser) => {

  const parsed = await parseBody(z.object({ items: z.array(itemSchema).min(1).max(20) }), req);
  if ('error' in parsed) return parsed.error;

  await db.delete(navigationItems);
  let order = 0;
  for (const item of parsed.data.items) {
    await db.insert(navigationItems).values({
      ...(item.id ? { id: item.id } : {}),
      parentId: item.parentId ?? null,
      labelZh: item.labelZh,
      labelEn: item.labelEn,
      href: item.href,
      openInNewTab: item.openInNewTab ?? false,
      sortOrder: item.sortOrder ?? order,
      isActive: item.isActive ?? true,
      updatedAt: new Date(),
    });
    order++;
  }

  await logOperation(auth, 'update', 'navigation');
  return ok({ count: parsed.data.items.length });
});

