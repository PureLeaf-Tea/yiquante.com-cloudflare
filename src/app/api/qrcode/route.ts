// GET /api/qrcode — 二维码生成（05 号文档 §十二）
// ★仅限本站域名 URL（防被当作开放二维码服务滥用）
// 开发阶段占位：返回 SVG 占位图；正式实现可用 Workers 原生方案生成
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
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
    if (parsed.host !== siteHost && !parsed.hostname.endsWith('yiquantea.com')) {
      return fail('仅支持本站链接', 400);
    }
  } catch {
    return fail('url 格式不合法', 400);
  }

  // ★开发占位：返回带 URL 文本的 SVG；上线替换为真正的二维码矩阵生成
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">
    <rect width="240" height="240" fill="#ffffff"/>
    <rect x="20" y="20" width="200" height="200" fill="none" stroke="#1a3a1a" stroke-width="4"/>
    <text x="120" y="120" font-size="10" text-anchor="middle" fill="#1a3a1a">QR placeholder</text>
    <text x="120" y="140" font-size="8" text-anchor="middle" fill="#666">${url.slice(0, 40)}</text>
  </svg>`;

  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
  });
}

