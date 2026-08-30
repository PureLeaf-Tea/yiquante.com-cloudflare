// GET /api/qrcode — 二维码生成（05 号文档 §十二；订单模块第 2 期升级为真实二维码）
// ★仅限本站域名 URL（防被当作开放二维码服务滥用）
// 使用 qrcode 依赖生成 SVG 二维码：白底 + 品牌深绿深色码 + 充足留白（需求文档 §5.2 可打印/截图）
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { fail, rateLimitPublic } from '@/lib/api-helpers';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublic(req, 'read');
  if (limited) return limited;

  const url = req.nextUrl.searchParams.get('url') || '';
  if (!url) return fail('缺少 url 参数', 400);

  // 域名白名单：只允许本站地址
  const siteHost = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/^https?:\/\//, '');
  try {
    const parsed = new URL(url);
    if (parsed.host !== siteHost && !parsed.hostname.endsWith('yiquantea.com') && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return fail('仅支持本站链接', 400);
    }
  } catch {
    return fail('url 格式不合法', 400);
  }

  // 真实二维码：SVG 输出（矢量，打印/截图不糊）；白底深绿码，留白 2 模块宽
  let svg: string;
  try {
    svg = await QRCode.toString(url, {
      type: 'svg',
      margin: 2,
      width: 280,
      color: { dark: '#1a3a1a', light: '#ffffff' },
    });
  } catch {
    return fail('二维码生成失败', 500);
  }

  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
  });
}
