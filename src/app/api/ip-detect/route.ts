// GET /api/ip-detect — IP 国家检测（05 号文档 §十二）
// 线上：request.cf.country（Cloudflare 自带，永远准确）；开发：cf-ipcountry 头模拟
import type { NextRequest } from 'next/server';
import { ok, rateLimitPublic } from '@/lib/api-helpers';
import { getLocaleFromCountry } from '@/lib/i18n';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const country = req.headers.get('cf-ipcountry') ?? null;

  return ok({
    country,
    suggestedLocale: getLocaleFromCountry(country),
  });
}

