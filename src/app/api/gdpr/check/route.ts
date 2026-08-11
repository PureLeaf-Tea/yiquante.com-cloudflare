// GET /api/gdpr/check — 判断是否需要弹 GDPR 同意弹窗（05 号文档 §十一）
// 条件：IP 在欧盟/EEA + 该会话未同意过（04 号文档：同意记录存 Neon）
import type { NextRequest } from 'next/server';
import { requiresGDPRConsent } from '@/lib/gdpr';
import { hasConsented } from '@/lib/gdpr';
import { ok, rateLimitPublic } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  // Cloudflare 自带国家代码（开发环境用 cf-ipcountry 头模拟）
  const country = req.headers.get('cf-ipcountry') ?? null;
  const sessionId = req.nextUrl.searchParams.get('sessionId') || '';

  const inEU = requiresGDPRConsent(country);
  const consented = sessionId ? await hasConsented(sessionId) : false;

  return ok({
    requiresConsent: inEU && !consented,
    hasConsented: consented,
    country,
  });
}

