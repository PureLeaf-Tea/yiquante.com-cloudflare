// 路由中间件（middleware.ts）——运行在 Cloudflare Edge Runtime（边缘节点）
// 阶段 6：根路径 `/` 临时固定重定向到英文首页
// 阶段 9-11 会在这里扩展：
//   1. IP→语言自动检测（request.cf.country + NEXT_LOCALE Cookie 记忆）
//   2. B2B 鉴权：/showcase/* 页面的 token 校验
//   3. 后台鉴权：/admin/* 页面的登录态校验
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 根路径：临时跳转英文默认首页（阶段 9-11 改为 IP 自动识别语言）
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/en', request.url));
  }

  return NextResponse.next();
}

// 中间件匹配范围：全站（排除静态资源）
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
