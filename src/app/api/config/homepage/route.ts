// GET/PUT /api/config/homepage — 首页配置（05 号文档 §十二）
// homepage_config 单例的 configJson：区块显隐、标题文案等全局设置
// （Hero/卖点/认证/CTA 的子表数据在阶段 15 首页编辑模块按表单独管理）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { homepageConfig } from '@/drizzle/schema';
import { ok, parseBody, requireUser, isFail, logOperation, rateLimitPublic } from '@/lib/api-helpers';

export const runtime = 'nodejs';

async function getConfigRow() {
  const rows = await db.select().from(homepageConfig).limit(1);
  return rows[0];
}

// GET：读取首页配置（公开）
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const row = await getConfigRow();
  return ok(row ? { id: row.id, config: JSON.parse(row.configJson || '{}') } : null);
}

// PUT：保存首页配置（需登录；整体替换 configJson）
export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if (isFail(auth)) return auth;

  const parsed = await parseBody(z.object({ config: z.record(z.unknown()) }), req);
  if ('error' in parsed) return parsed.error;

  const configJson = JSON.stringify(parsed.data.config);
  const existing = await getConfigRow();
  if (existing) {
    await db.update(homepageConfig).set({ configJson, updatedAt: new Date() }).where(eq(homepageConfig.id, existing.id));
  } else {
    await db.insert(homepageConfig).values({ configJson, updatedAt: new Date() });
  }

  await logOperation(auth, 'update', 'homepage_config');
  return ok({ config: parsed.data.config });
}

