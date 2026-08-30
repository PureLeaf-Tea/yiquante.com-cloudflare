// robots.txt（src/app/robots.ts，16 号文档 §八）
// 前台允许收录；屏蔽后台/API/B2B 密码区/展示区独立详情/客户订单页（/o/ 私密链接不收录）
import type { MetadataRoute } from 'next';

const SITE_URL = 'https://yiquantea.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/b2b/', '/showcase/', '/o/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
