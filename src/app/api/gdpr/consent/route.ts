// POST /api/gdpr/consent — 记录 GDPR 同意（05 号文档 §十一，写 Neon）
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { recordConsent } from '@/lib/gdpr';
import { getClientIp } from '@/lib/rate-limit';
import { ok, fail, parseBody, rateLimitPublic } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const parsed = await parseBody(
    z.object({
      sessionId: z.string().min(1).max(64),
      consent: z.array(z.enum(['necessary', 'analytics', 'marketing'])).min(1),
    }),
    req
  );
  if ('error' in parsed) return parsed.error;

  const country = req.headers.get('cf-ipcountry') ?? null;
  await recordConsent(parsed.data.sessionId, getClientIp(req), country, parsed.data.consent);

  return ok(null);
}

