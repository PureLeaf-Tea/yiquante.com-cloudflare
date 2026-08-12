// GET /api/showcase/[id]/qrcode — 展示区产品二维码 PNG（收尾任务 4）
// [id] 为展示区产品 slug；编码该产品的对外链接，返回 image/png
import type { NextRequest } from 'next/server';
import QRCode from 'qrcode';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { showcaseProducts, products } from '@/drizzle/schema';
import { fail, rateLimitPublic } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const slug = params.id;

  // 校验 slug 属于展示区产品（展示区详情 slug 即产品 slug，防止任意 URL 二维码滥用）
  const rows = await db
    .select({ slug: products.slug })
    .from(showcaseProducts)
    .innerJoin(products, eq(showcaseProducts.productId, products.id))
    .where(eq(products.slug, slug))
    .limit(1);
  if (!rows[0]) return fail('展示区产品不存在', 404);

  // 编码对外链接（locale 参数可选，默认 en）
  const { searchParams } = new URL(req.url);
  const locale = ['zh', 'en', 'ru', 'de', 'es', 'fr'].includes(searchParams.get('locale') || '')
    ? String(searchParams.get('locale'))
    : 'en';
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://yiquantea.com').replace(/\/$/, '');
  const target = `${siteUrl}/${locale}/showcase/${slug}`;

  const buffer = await QRCode.toBuffer(target, {
    type: 'png',
    width: 512,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#1a1a1a', light: '#ffffff' },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
