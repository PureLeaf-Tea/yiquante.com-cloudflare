// 路由中间件（middleware.ts）——运行在 Cloudflare Edge Runtime（边缘节点）
// 阶段 7：接入 next-intl 官方中间件，从 URL 前缀解析语言（requestLocale），
//         服务端组件与客户端组件的翻译来源从此一致
// 阶段 9-11 会在这里继续扩展：
//   1. IP→语言自动检测（request.cf.country，首次访问按国家选语言）
//   2. NEXT_LOCALE Cookie 记忆（手动切换优先于 IP）
//   3. B2B 鉴权：/showcase/* 页面的 token 校验
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/i18n/config';

// locales：6 语言白名单；defaultLocale：英文（访问 `/` 会自动重定向到 `/en`）
export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always', // 所有语言统一带前缀（/zh /en /ru ...），切换逻辑简单一致
});

// 匹配范围：全站，但排除 api / admin / o / 静态资源（后台、接口与客户订单页不带语言前缀）
// /o/[orderNo] 是订单模块公开页（订单模块第 3 期）：不走 [locale]，语言由订单 lang 字段决定，
// 必须在此放行，否则会被 next-intl 重定向到 /en/o/...
export const config = {
  matcher: ['/((?!api|admin|o(?:/|$)|_next|_vercel|.*\\..*).*)'],
};
