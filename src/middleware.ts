// 路由中间件（middleware.ts）——运行在 Cloudflare Edge Runtime（边缘节点）
// 阶段 1 占位：直接放行所有请求
// 阶段 6/11 会在这里实现：
//   1. 多语言路由：根据 IP（request.cf.country）自动选择语言 + 语言切换记忆
//   2. B2B 鉴权：/showcase/* 页面的 token 校验
//   3. 后台鉴权：/admin/* 页面的登录态校验
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // TODO 阶段 6：IP→语言自动检测与 [locale] 路由重写
  // TODO 阶段 11：B2B token 校验
  return NextResponse.next();
}

// 中间件匹配范围：全站（排除静态资源）
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
